"""Orders list with per-order profit (subtotal − COGS − refunds)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_org
from app.models.order import Order
from app.schemas.order import OrderOut
from app.services.profit_engine import compute_order_profit, order_cogs

router = APIRouter()


@router.get("", response_model=list[OrderOut])
async def list_orders(
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start: str | None = Query(None, description="ISO lower bound on order date"),
    end: str | None = Query(None, description="ISO upper bound on order date"),
) -> list[OrderOut]:
    stmt = select(Order).where(Order.organization_id == org_id)
    if start:
        try:
            stmt = stmt.where(Order.ordered_at >= datetime.fromisoformat(start))
        except ValueError:
            pass
    if end:
        try:
            stmt = stmt.where(Order.ordered_at <= datetime.fromisoformat(end))
        except ValueError:
            pass
    orders = (
        await db.scalars(
            stmt.options(selectinload(Order.items), selectinload(Order.refunds))
            .order_by(Order.ordered_at.desc().nullslast())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    out: list[OrderOut] = []
    for o in orders:
        refunds = sum(r.amount or 0 for r in o.refunds)
        profit = compute_order_profit(o.subtotal or 0, order_cogs(o), refunds)
        out.append(
            OrderOut(
                id=o.order_number or o.external_id or o.id,
                customer=o.customer_name,
                email=o.customer_email,
                date=o.ordered_at.isoformat() if o.ordered_at else None,
                total=o.total,
                subtotal=o.subtotal,
                shipping=o.shipping,
                tax=o.tax,
                discount=o.discount,
                items=o.item_count,
                status=o.status,
                payment_method=o.payment_method,
                profit=profit,
                channel=o.channel,
            )
        )
    return out
