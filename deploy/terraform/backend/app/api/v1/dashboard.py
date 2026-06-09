"""Dashboard: KPIs, revenue series, profit breakdown (from ProfitMetric)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org
from app.models.finance import ProfitMetric
from app.schemas.dashboard import (
    DashboardKPIs,
    KPIData,
    ProfitBreakdown,
    RevenueDataPoint,
)

router = APIRouter()


async def _monthly_metrics(db: AsyncSession, org_id: str) -> list[ProfitMetric]:
    return (
        await db.scalars(
            select(ProfitMetric)
            .where(
                ProfitMetric.organization_id == org_id,
                ProfitMetric.period_type == "month",
            )
            .order_by(ProfitMetric.period.asc())
        )
    ).all()


def _pct_change(current: float, previous: float) -> float:
    if not previous:
        return 0.0
    return round((current - previous) / previous * 100, 1)


@router.get("/kpis", response_model=DashboardKPIs)
async def dashboard_kpis(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> DashboardKPIs:
    metrics = await _monthly_metrics(db, org_id)
    if not metrics:
        return DashboardKPIs(kpis=[])

    cur = metrics[-1]
    prev = metrics[-2] if len(metrics) >= 2 else None
    tail = metrics[-10:]

    cur_aov = (cur.revenue / cur.orders_count) if cur.orders_count else 0.0
    prev_aov = (prev.revenue / prev.orders_count) if prev and prev.orders_count else 0.0

    kpis = [
        KPIData(
            label="Total Revenue",
            value=round(cur.revenue, 2),
            change=_pct_change(cur.revenue, prev.revenue if prev else 0),
            change_label="vs last month",
            format="currency",
            sparkline_data=[round(m.revenue, 2) for m in tail],
        ),
        KPIData(
            label="Net Profit",
            value=round(cur.net_profit, 2),
            change=_pct_change(cur.net_profit, prev.net_profit if prev else 0),
            change_label="vs last month",
            format="currency",
            sparkline_data=[round(m.net_profit, 2) for m in tail],
        ),
        KPIData(
            label="Total Orders",
            value=cur.orders_count,
            change=_pct_change(cur.orders_count, prev.orders_count if prev else 0),
            change_label="vs last month",
            format="number",
            sparkline_data=[float(m.orders_count) for m in tail],
        ),
        KPIData(
            label="Avg Order Value",
            value=round(cur_aov, 2),
            change=_pct_change(cur_aov, prev_aov),
            change_label="vs last month",
            format="currency",
            sparkline_data=[
                round(m.revenue / m.orders_count, 2) if m.orders_count else 0.0
                for m in tail
            ],
        ),
    ]
    return DashboardKPIs(kpis=kpis)


@router.get("/revenue", response_model=list[RevenueDataPoint])
async def revenue_series(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[RevenueDataPoint]:
    metrics = await _monthly_metrics(db, org_id)
    return [
        RevenueDataPoint(
            month=m.period.strftime("%b"),
            revenue=round(m.revenue, 2),
            profit=round(m.net_profit, 2),
            orders=m.orders_count,
            ad_spend=round(m.ad_spend, 2),
        )
        for m in metrics
    ]


@router.get("/profit-breakdown", response_model=list[ProfitBreakdown])
async def profit_breakdown(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[ProfitBreakdown]:
    metrics = await _monthly_metrics(db, org_id)
    if not metrics:
        return []
    m = metrics[-1]
    base = m.revenue or 1.0

    def pct(v: float) -> float:
        return round(abs(v) / base * 100, 1)

    return [
        ProfitBreakdown(label="Revenue", value=round(m.revenue, 2), color="#6366f1", percentage=100),
        ProfitBreakdown(label="COGS", value=-round(m.cogs, 2), color="#ef4444", percentage=pct(m.cogs)),
        ProfitBreakdown(label="Ad Spend", value=-round(m.ad_spend, 2), color="#f59e0b", percentage=pct(m.ad_spend)),
        ProfitBreakdown(label="Shipping", value=-round(m.shipping, 2), color="#3b82f6", percentage=pct(m.shipping)),
        ProfitBreakdown(label="Gateway Fees", value=-round(m.gateway_fees, 2), color="#8b5cf6", percentage=pct(m.gateway_fees)),
        ProfitBreakdown(label="Refunds", value=-round(m.refunds, 2), color="#ec4899", percentage=pct(m.refunds)),
        ProfitBreakdown(label="Net Profit", value=round(m.net_profit, 2), color="#10b981", percentage=pct(m.net_profit)),
    ]
