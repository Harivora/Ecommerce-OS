"""NimbusPost connector (credential: ``api_key`` — your NimbusPost API token).

NimbusPost is an Indian shipping aggregator (like Shiprocket). API base is
``https://api.nimbuspost.com/v1/``; it authenticates with a Bearer token
(``Authorization: Bearer <token>``), and some/legacy accounts use the
``NP-API-KEY`` header instead — we try Bearer first, then fall back to
NP-API-KEY, so either kind of token works. Read-only: pulls shipments into
``shipping_costs`` (courier, cost, RTO flag, delivery date), which feeds the
profit engine.

Field names in the shipment payload are mapped defensively (multiple fallbacks)
because NimbusPost's exact response keys aren't publicly documented; the first
sync confirms them.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.base import (
    BaseConnector,
    ConnectorError,
    IntegrationMeta,
    SyncResult,
)
from app.models.enums import IntegrationCategory
from app.models.finance import ShippingCost

BASE_URL = "https://api.nimbuspost.com/v1"
PAGE_SIZE = 50


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d %b %Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(value)[: len(fmt) + 4], fmt).date()
        except ValueError:
            continue
    return None


class NimbusPostConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="nimbuspost",
        name="NimbusPost",
        description="Import shipping costs, courier fees, and track RTO rates.",
        icon="Truck",
        category=IntegrationCategory.shipping,
        phase=2,
        features=["Shipping cost sync", "Courier performance", "RTO tracking"],
        has_connector=True,
        credential_fields=["api_key"],
    )

    @staticmethod
    def _token(credentials: dict[str, Any]) -> str:
        token = (credentials.get("api_key") or credentials.get("token") or "").strip()
        if not token:
            raise ConnectorError("NimbusPost needs an API key/token.")
        return token

    def _get(
        self, client: httpx.Client, path: str, token: str, params: dict | None = None
    ) -> httpx.Response:
        """GET trying Bearer auth, then the legacy NP-API-KEY header on 401/403."""
        resp = None
        for headers in (
            {"Authorization": f"Bearer {token}"},
            {"NP-API-KEY": token},
        ):
            resp = client.get(path, params=params, headers=headers)
            if resp.status_code not in (401, 403):
                return resp
        return resp  # both header styles rejected → return the last response

    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        token = self._token(credentials)
        try:
            with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
                resp = self._get(client, "/shipments", token, {"page": 1, "per_page": 1})
        except httpx.HTTPError as exc:
            raise ConnectorError(f"Could not reach NimbusPost: {exc}") from exc
        if resp.status_code in (401, 403):
            raise ConnectorError("Invalid NimbusPost API key/token.")
        if resp.status_code != 200:
            raise ConnectorError(f"NimbusPost validation failed ({resp.status_code}).")
        return {"authenticated": True}

    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: Any = None,
    ) -> SyncResult:
        token = self._token(credentials)
        existing = {
            s.external_id: s
            for s in session.scalars(
                select(ShippingCost).where(ShippingCost.organization_id == organization_id)
            )
        }
        count = 0
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
            page = 1
            while True:
                resp = self._get(
                    client, "/shipments", token, {"page": page, "per_page": PAGE_SIZE}
                )
                if resp.status_code != 200:
                    raise ConnectorError(
                        f"NimbusPost /shipments returned {resp.status_code}: {resp.text[:200]}"
                    )
                payload = resp.json()
                # Response may be a bare list under "data", or a Laravel paginator
                # ({"data": {"data": [...], "last_page": N}}).
                data = payload.get("data") if isinstance(payload, dict) else payload
                last_page = None
                if isinstance(data, dict):
                    rows = data.get("data") or []
                    last_page = data.get("last_page")
                elif isinstance(data, list):
                    rows = data
                else:
                    rows = []
                if not rows:
                    break
                for s in rows:
                    ext_id = str(
                        s.get("id")
                        or s.get("shipment_id")
                        or s.get("awb_number")
                        or s.get("awb")
                        or ""
                    )
                    if not ext_id or ext_id == "None":
                        continue
                    status = (s.get("status") or "").strip()
                    row = existing.get(ext_id)
                    if row is None:
                        row = ShippingCost(organization_id=organization_id, external_id=ext_id)
                        session.add(row)
                        existing[ext_id] = row
                    row.order_external_id = (
                        str(s.get("order_number") or s.get("order_id") or "") or None
                    )
                    row.courier = s.get("courier_name") or s.get("courier")
                    row.cost = _to_float(
                        s.get("freight_charges")
                        or s.get("awb_charges")
                        or s.get("charges")
                        or s.get("total_charges")
                    )
                    row.status = status
                    row.is_rto = "rto" in status.lower()
                    row.delivery_days = _to_float(s.get("delivered_days")) or None
                    row.date = _parse_date(
                        s.get("created") or s.get("created_at") or s.get("order_date")
                    )
                    count += 1
                if on_page:
                    on_page("nimbuspost_shipments", count)
                if last_page is not None:
                    if page >= int(last_page):
                        break
                elif len(rows) < PAGE_SIZE:
                    break
                page += 1
        session.flush()
        return SyncResult(counts={"shipments": count})
