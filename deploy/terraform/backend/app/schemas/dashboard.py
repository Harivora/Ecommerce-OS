from __future__ import annotations

from app.schemas.common import CamelModel


class KPIData(CamelModel):
    label: str
    value: float
    change: float
    change_label: str
    prefix: str | None = None
    suffix: str | None = None
    format: str  # "currency" | "number" | "percent"
    sparkline_data: list[float]


class RevenueDataPoint(CamelModel):
    month: str
    revenue: float
    profit: float
    orders: int
    ad_spend: float


class ProfitBreakdown(CamelModel):
    label: str
    value: float
    color: str
    percentage: float


class DashboardKPIs(CamelModel):
    kpis: list[KPIData]
