"""Meta (Facebook/Instagram) Ads connector — pulls campaign spend via the
Marketing API and writes daily ``AdSpend`` rows the profit engine reads.

Credentials: ``access_token`` (a long-lived user or system-user token with
``ads_read``) plus ``ad_account_id`` (digits, or ``act_<digits>``). Read-only.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta
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

GRAPH_VERSION = "v21.0"
BASE_URL = f"https://graph.facebook.com/{GRAPH_VERSION}"
LOOKBACK_DAYS = 90
PURCHASE_ACTIONS = {
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "onsite_conversion.purchase",
    "omni_purchase",
}
logger = logging.getLogger(__name__)


def _norm_account(acc: str) -> str:
    acc = (acc or "").strip()
    return acc if acc.startswith("act_") else f"act_{acc}"


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


class MetaAdsConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="meta",
        name="Meta Ads",
        description="Attribute campaigns, impressions, and ad spend month over month.",
        icon="Megaphone",
        category=IntegrationCategory.ads,
        phase=2,
        features=["Spend tracking", "Campaign ROAS analytics", "CPA breakdown"],
        has_connector=True,
        credential_fields=["access_token", "ad_account_id"],
    )

    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        token = credentials.get("access_token")
        acc = credentials.get("ad_account_id")
        if not token or not acc:
            raise ConnectorError("Meta Ads needs an access_token and ad_account_id.")
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(
                    f"{BASE_URL}/{_norm_account(acc)}",
                    params={"fields": "name,account_status", "access_token": token},
                )
        except httpx.HTTPError as exc:
            raise ConnectorError(f"Could not reach Meta: {exc}") from exc
        if resp.status_code in (400, 401, 403):
            raise ConnectorError(
                "Invalid Meta access token or ad account id (needs ads_read)."
            )
        if resp.status_code != 200:
            raise ConnectorError(f"Meta validation failed ({resp.status_code}).")
        return {"account": resp.json().get("name")}

    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: Any = None,
    ) -> SyncResult:
        token = credentials.get("access_token")
        acc = _norm_account(credentials.get("ad_account_id", ""))
        if not token or acc == "act_":
            raise ConnectorError("Meta Ads needs an access_token and ad_account_id.")

        start = since.date() if isinstance(since, datetime) else date.today() - timedelta(days=LOOKBACK_DAYS)
        params = {
            "level": "campaign",
            "fields": "campaign_name,spend,impressions,clicks,actions,date_start",
            "time_increment": 1,
            "time_range": json.dumps(
                {"since": start.isoformat(), "until": date.today().isoformat()}
            ),
            "limit": 500,
            "access_token": token,
        }

        rows: list[dict] = []
        with httpx.Client(timeout=60.0) as client:
            resp = client.get(f"{BASE_URL}/{acc}/insights", params=params)
            while True:
                if resp.status_code != 200:
                    raise ConnectorError(
                        f"Meta insights returned {resp.status_code}: {resp.text[:200]}"
                    )
                payload = resp.json()
                rows.extend(payload.get("data", []))
                nxt = payload.get("paging", {}).get("next")
                if not nxt:
                    break
                resp = client.get(nxt)
                if on_page:
                    on_page("meta_insights", len(rows))

        # Full refresh: replace this org's Meta spend with the freshly pulled window.
        session.execute(
            delete(AdSpend).where(
                AdSpend.organization_id == organization_id,
                AdSpend.platform == AdPlatform.meta,
            )
        )
        count = 0
        for r in rows:
            conversions = 0
            for a in r.get("actions", []) or []:
                if a.get("action_type") in PURCHASE_ACTIONS:
                    conversions += int(float(a.get("value") or 0))
            session.add(
                AdSpend(
                    organization_id=organization_id,
                    platform=AdPlatform.meta,
                    campaign=r.get("campaign_name"),
                    status="active",
                    spend=float(r.get("spend") or 0),
                    impressions=int(r.get("impressions") or 0),
                    clicks=int(r.get("clicks") or 0),
                    conversions=conversions,
                    revenue=0.0,
                    date=_parse_date(r.get("date_start")),
                )
            )
            count += 1

        session.flush()
        return SyncResult(counts={"ad_spend": count})
