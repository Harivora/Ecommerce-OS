"""Google Ads connector — pulls campaign spend via the Google Ads API (GAQL)
and writes daily ``AdSpend`` rows the profit engine reads.

Credentials: ``developer_token`` (from your Google Ads API Center — separate
approval from the OAuth app), ``client_id`` + ``client_secret`` (OAuth app),
``refresh_token`` (offline OAuth grant), and ``customer_id`` (digits, dashes ok).
Optional ``login_customer_id`` for manager (MCC) accounts. Read-only.
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import httpx
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.integrations.base import (
    BaseConnector,
    ConnectorError,
    IntegrationMeta,
    SyncResult,
)
from app.models.enums import AdPlatform, IntegrationCategory
from app.models.finance import AdSpend

API_VERSION = "v18"
ADS_BASE = f"https://googleads.googleapis.com/{API_VERSION}"
TOKEN_URL = "https://oauth2.googleapis.com/token"
GAQL = (
    "SELECT campaign.name, metrics.cost_micros, metrics.impressions, "
    "metrics.clicks, metrics.conversions, segments.date "
    "FROM campaign WHERE segments.date DURING LAST_90_DAYS"
)
logger = logging.getLogger(__name__)


def _digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


class GoogleAdsConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="google_ads",
        name="Google Ads",
        description="Track search and shopping campaign spend, clicks, and conversions.",
        icon="Megaphone",
        category=IntegrationCategory.ads,
        phase=2,
        features=["ROAS tracking", "Campaign attribution", "Keyword cost insights"],
        has_connector=True,
        credential_fields=[
            "developer_token",
            "client_id",
            "client_secret",
            "refresh_token",
            "customer_id",
            "login_customer_id",
        ],
    )

    def _access_token(self, client: httpx.Client, creds: dict[str, Any]) -> str:
        resp = client.post(
            TOKEN_URL,
            data={
                "client_id": creds.get("client_id"),
                "client_secret": creds.get("client_secret"),
                "refresh_token": creds.get("refresh_token"),
                "grant_type": "refresh_token",
            },
        )
        if resp.status_code != 200:
            raise ConnectorError(
                "Google OAuth refresh failed — check client_id/secret/refresh_token."
            )
        token = resp.json().get("access_token")
        if not token:
            raise ConnectorError("Google OAuth returned no access token.")
        return token

    def _headers(self, access_token: str, creds: dict[str, Any]) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "developer-token": creds.get("developer_token", ""),
            "Content-Type": "application/json",
        }
        login = _digits(creds.get("login_customer_id", ""))
        if login:
            headers["login-customer-id"] = login
        return headers

    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        required = ["developer_token", "client_id", "client_secret", "refresh_token", "customer_id"]
        if any(not credentials.get(f) for f in required):
            raise ConnectorError(
                "Google Ads needs developer_token, client_id, client_secret, "
                "refresh_token and customer_id."
            )
        cid = _digits(credentials["customer_id"])
        try:
            with httpx.Client(timeout=40.0) as client:
                token = self._access_token(client, credentials)
                resp = client.post(
                    f"{ADS_BASE}/customers/{cid}/googleAds:search",
                    headers=self._headers(token, credentials),
                    json={"query": "SELECT customer.descriptive_name FROM customer LIMIT 1"},
                )
        except httpx.HTTPError as exc:
            raise ConnectorError(f"Could not reach Google Ads: {exc}") from exc
        if resp.status_code in (401, 403):
            raise ConnectorError("Invalid Google Ads credentials or developer token.")
        if resp.status_code != 200:
            raise ConnectorError(f"Google Ads validation failed ({resp.status_code}).")
        return {"customer_id": cid}

    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: Any = None,
    ) -> SyncResult:
        required = ["developer_token", "client_id", "client_secret", "refresh_token", "customer_id"]
        if any(not credentials.get(f) for f in required):
            raise ConnectorError("Google Ads is missing required credentials.")
        cid = _digits(credentials["customer_id"])

        results: list[dict] = []
        with httpx.Client(timeout=90.0) as client:
            token = self._access_token(client, credentials)
            resp = client.post(
                f"{ADS_BASE}/customers/{cid}/googleAds:searchStream",
                headers=self._headers(token, credentials),
                json={"query": GAQL},
            )
            if resp.status_code != 200:
                raise ConnectorError(
                    f"Google Ads query returned {resp.status_code}: {resp.text[:200]}"
                )
            # searchStream returns a JSON array of batches, each with `results`.
            for batch in resp.json():
                results.extend(batch.get("results", []))

        session.execute(
            delete(AdSpend).where(
                AdSpend.organization_id == organization_id,
                AdSpend.platform == AdPlatform.google,
            )
        )
        count = 0
        for r in results:
            metrics = r.get("metrics", {})
            session.add(
                AdSpend(
                    organization_id=organization_id,
                    platform=AdPlatform.google,
                    campaign=(r.get("campaign", {}) or {}).get("name"),
                    status="active",
                    spend=float(metrics.get("costMicros", 0) or 0) / 1_000_000,
                    impressions=int(metrics.get("impressions", 0) or 0),
                    clicks=int(metrics.get("clicks", 0) or 0),
                    conversions=int(float(metrics.get("conversions", 0) or 0)),
                    revenue=0.0,
                    date=_parse_date((r.get("segments", {}) or {}).get("date")),
                )
            )
            count += 1

        session.flush()
        return SyncResult(counts={"ad_spend": count})
