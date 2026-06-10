"""Shipping metrics aggregated from ShippingCost (Shiprocket)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_feature, require_org
from app.models.finance import ShippingCost
from app.schemas.finance import ShippingMetricsOut

router = APIRouter()


@router.get("", response_model=ShippingMetricsOut)
async def shipping_metrics(
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_feature("shipping")),
) -> ShippingMetricsOut:
    rows = (
        await db.scalars(
            select(ShippingCost).where(ShippingCost.organization_id == org_id)
        )
    ).all()
    total = len(rows)
    if total == 0:
        return ShippingMetricsOut(
            total_shipments=0, delivered=0, in_transit=0, rto_count=0,
            rto_rate=0.0, avg_cost=0.0, avg_delivery_days=0.0,
        )

    delivered = sum(1 for r in rows if "deliver" in (r.status or "").lower())
    rto = sum(1 for r in rows if r.is_rto)
    in_transit = sum(
        1 for r in rows if "transit" in (r.status or "").lower()
    )
    total_cost = sum(r.cost or 0 for r in rows)
    days = [r.delivery_days for r in rows if r.delivery_days]
    return ShippingMetricsOut(
        total_shipments=total,
        delivered=delivered,
        in_transit=in_transit,
        rto_count=rto,
        rto_rate=round(rto / total * 100, 1),
        avg_cost=round(total_cost / total, 2),
        avg_delivery_days=round(sum(days) / len(days), 1) if days else 0.0,
    )
