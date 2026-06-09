"""Shiprocket connector (credentials: email + password).

Authenticates to obtain a bearer token, then pulls shipments to populate
``shipping_costs`` (courier, cost, RTO flag, delivery time).
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

BASE_URL = "https://apiv2.shiprocket.in/v1/external"
PAGE_SIZE = 100


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d %b %Y"):
        try:
            return datetime.strptime(value[: len(fmt) + 4], fmt).date()
        except ValueError:
            continue
    return None


class ShiprocketConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="shiprocket",
        name="Shiprocket",
        description="Import shipping costs, courier fees, and track RTO rates.",
        icon="Truck",
        category=IntegrationCategory.shipping,
        phase=2,
        features=["Automatic RTO alerts", "Courier performance comparison", "COD charges sync"],
        has_connector=True,
        credential_fields=["email", "password"],
    )

    def _login(self, credentials: dict[str, Any]) -> str:
        email = credentials.get("email")
        password = credentials.get("password")
        if not email or not password:
            raise ConnectorError("email and password are required.")
        try:
            resp = httpx.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": password},
                timeout=30.0,
            )
        except httpx.HTTPError as exc:
            raise ConnectorError(f"Could not reach Shiprocket: {exc}") from exc
        if resp.status_code != 200:
            raise ConnectorError("Invalid Shiprocket credentials.")
        token = resp.json().get("token")
        if not token:
            raise ConnectorError("Shiprocket did not return a token.")
        return token

    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        token = self._login(credentials)
        return {"authenticated": True, "token_prefix": token[:8]}

    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: Any = None,
    ) -> SyncResult:
        # Shiprocket pulls a bounded recent window each run; on_page/since are
        # accepted for interface parity but not used here yet.
        token = self._login(credentials)
        headers = {"Authorization": f"Bearer {token}"}
        existing = {
            s.external_id: s
            for s in session.scalars(
                select(ShippingCost).where(ShippingCost.organization_id == organization_id)
            )
        }
        count = 0
        with httpx.Client(base_url=BASE_URL, headers=headers, timeout=30.0) as client:
            page = 1
            while True:
                resp = client.get("/shipments", params={"page": page, "per_page": PAGE_SIZE})
                if resp.status_code != 200:
                    raise ConnectorError(
                        f"Shiprocket /shipments returned {resp.status_code}: {resp.text[:200]}"
                    )
                data = resp.json().get("data", [])
                if not data:
                    break
                for s in data:
                    ext_id = str(s.get("id") or s.get("shipment_id") or s.get("awb"))
                    if not ext_id or ext_id == "None":
                        continue
                    status = (s.get("status") or "").strip()
                    row = existing.get(ext_id)
                    if row is None:
                        row = ShippingCost(organization_id=organization_id, external_id=ext_id)
                        session.add(row)
                        existing[ext_id] = row
                    row.order_external_id = str(s.get("channel_order_id") or s.get("order_id") or "") or None
                    row.courier = s.get("courier_name") or s.get("courier")
                    row.cost = _to_float(
                        s.get("freight_charges") or s.get("charges") or s.get("shipping_charges")
                    )
                    row.status = status
                    row.is_rto = "rto" in status.lower()
                    row.delivery_days = _to_float(s.get("delivered_days")) or None
                    row.date = _parse_date(s.get("created_at") or s.get("pickup_date"))
                    count += 1
                if len(data) < PAGE_SIZE:
                    break
                page += 1
        session.flush()
        return SyncResult(counts={"shipments": count})
