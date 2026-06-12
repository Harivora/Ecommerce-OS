from __future__ import annotations

from datetime import date as date_type, datetime

from pydantic import Field

from app.models.enums import AdPlatform, SettlementStatus
from app.schemas.common import CamelModel


# ── Ad spend (manual entry) ─────────────────────────────────
class AdCampaignOut(CamelModel):
    id: str
    name: str | None = None
    platform: AdPlatform
    status: str | None = None
    spend: float
    impressions: int
    clicks: int
    conversions: int
    revenue: float
    roas: float = 0.0
    cpa: float = 0.0


class AdSpendCreate(CamelModel):
    name: str | None = None
    platform: AdPlatform
    status: str | None = "active"
    spend: float = 0.0
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    revenue: float = 0.0
    date: date_type | None = None


# ── Shipping (Shiprocket) ───────────────────────────────────
class ShippingMetricsOut(CamelModel):
    total_shipments: int
    delivered: int
    in_transit: int
    rto_count: int
    rto_rate: float
    avg_cost: float
    avg_delivery_days: float


# ── Payments (manual entry) ─────────────────────────────────
class PaymentSettlementOut(CamelModel):
    id: str
    gateway: str | None = None
    amount: float
    fees: float
    net_amount: float
    date: str | None = None
    status: SettlementStatus
    method: str | None = None


class PaymentFeeCreate(CamelModel):
    gateway: str = Field(min_length=1)
    method: str | None = None
    amount: float = 0.0
    fees: float = 0.0
    status: SettlementStatus = SettlementStatus.settled
    date: date_type | None = None


# ── Product landing cost (manual, effective-dated) ──────────
class LandingCostEntryOut(CamelModel):
    """One row in a SKU's cost history."""

    id: str
    sku: str
    cost: float
    effective_from: date_type
    note: str | None = None
    created_by: str | None = None
    created_at: datetime | None = None


class LandingCostSkuOut(CamelModel):
    """A SKU's current landed cost plus how many history entries it has."""

    sku: str
    product_name: str | None = None
    current_cost: float
    effective_from: date_type
    entries: int


class LandingCostCreate(CamelModel):
    sku: str = Field(min_length=1, max_length=128)
    cost: float = Field(ge=0)
    # Defaults to today server-side when omitted.
    effective_from: date_type | None = None
    note: str | None = Field(default=None, max_length=512)


# ── Forecasting ─────────────────────────────────────────────
class ForecastDataPoint(CamelModel):
    month: str
    actual: float | None = None
    predicted: float
    lower: float
    upper: float
