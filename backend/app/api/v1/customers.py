"""Customers list + per-customer detail (order history + products purchased)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import require_org
from app.models.customer import Customer
from app.models.order import Order
from app.schemas.catalog import (
    CustomerDetailOut,
    CustomerOrderOut,
    CustomerOut,
    CustomerProductOut,
)
from app.services.profit_engine import compute_order_profit, order_cogs

router = APIRouter()


@router.get("", response_model=list[CustomerOut])
async def list_customers(
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[CustomerOut]:
    customers = (
        await db.scalars(
            select(Customer)
            .where(Customer.organization_id == org_id)
            .order_by(Customer.total_spent.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [
        CustomerOut(
            id=c.id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            total_orders=c.total_orders,
            total_spent=c.total_spent,
            ltv=c.ltv,
            last_order=c.last_order.isoformat() if c.last_order else None,
            city=c.city,
            segment=c.segment,
        )
        for c in customers
    ]


@router.get("/count")
async def customers_count(
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Total customers — drives the page count."""
    total = await db.scalar(
        select(func.count()).select_from(Customer).where(
            Customer.organization_id == org_id
        )
    )
    return {"total": total or 0}


@router.get("/{customer_id}", response_model=CustomerDetailOut)
async def customer_detail(
    customer_id: str,
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> CustomerDetailOut:
    """One customer with their synced order history and purchased products.

    Orders are linked to a customer by email (what Shopify supplies on orders).
    Headline stats (totalOrders/totalSpent) come from the customer record and
    are present even before order line-items finish syncing.
    """
    c = await db.scalar(
        select(Customer).where(
            Customer.id == customer_id, Customer.organization_id == org_id
        )
    )
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")

    # Link orders by Shopify customer id (works without email) or by email.
    conds = []
    if c.external_id:
        conds.append(Order.customer_external_id == c.external_id)
    if c.email:
        conds.append(Order.customer_email == c.email)
    orders: list[Order] = []
    if conds:
        orders = (
            await db.scalars(
                select(Order)
                .where(Order.organization_id == org_id, or_(*conds))
                .options(selectinload(Order.items), selectinload(Order.refunds))
                .order_by(Order.ordered_at.desc().nullslast())
                .limit(200)
            )
        ).all()

    order_rows: list[CustomerOrderOut] = []
    # Aggregate purchased products across all their orders.
    prod_agg: dict[tuple[str | None, str | None], CustomerProductOut] = {}
    synced_revenue = 0.0
    for o in orders:
        refunds = sum(r.amount or 0 for r in o.refunds)
        profit = compute_order_profit(o.subtotal or 0, order_cogs(o), refunds)
        synced_revenue += o.total or 0
        order_rows.append(
            CustomerOrderOut(
                id=o.order_number or o.external_id or o.id,
                order_number=o.order_number,
                date=o.ordered_at.isoformat() if o.ordered_at else None,
                total=o.total,
                status=o.status.value,
                items=o.item_count,
                profit=round(profit, 2),
            )
        )
        for li in o.items:
            key = (li.title, li.sku)
            row = prod_agg.get(key)
            qty = int(li.quantity or 0)
            rev = qty * float(li.unit_price or 0)
            if row is None:
                prod_agg[key] = CustomerProductOut(
                    title=li.title, sku=li.sku, quantity=qty, revenue=round(rev, 2)
                )
            else:
                row.quantity += qty
                row.revenue = round(row.revenue + rev, 2)

    products = sorted(prod_agg.values(), key=lambda p: p.revenue, reverse=True)

    return CustomerDetailOut(
        id=c.id,
        name=c.name,
        email=c.email,
        phone=c.phone,
        total_orders=c.total_orders,
        total_spent=c.total_spent,
        ltv=c.ltv,
        last_order=c.last_order.isoformat() if c.last_order else None,
        city=c.city,
        segment=c.segment,
        orders=order_rows,
        products=products,
        synced_orders=len(order_rows),
        synced_revenue=round(synced_revenue, 2),
    )
