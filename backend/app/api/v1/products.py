"""Products with realized sold/revenue/profit/margin aggregated from order items."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_org
from app.models.order import OrderItem
from app.models.product import Product
from app.schemas.catalog import ProductOut

router = APIRouter()


@router.get("", response_model=list[ProductOut])
async def list_products(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[ProductOut]:
    rows = (
        await db.execute(
            select(
                Product,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("sold"),
                func.coalesce(
                    func.sum(OrderItem.quantity * OrderItem.unit_price), 0.0
                ).label("revenue"),
                func.coalesce(
                    func.sum(OrderItem.quantity * (OrderItem.unit_price - OrderItem.unit_cost)),
                    0.0,
                ).label("profit"),
            )
            .where(Product.organization_id == org_id)
            .outerjoin(OrderItem, OrderItem.product_id == Product.id)
            .group_by(Product.id)
            .order_by(Product.name.asc())
        )
    ).all()

    out: list[ProductOut] = []
    for product, sold, revenue, profit in rows:
        margin = (profit / revenue * 100) if revenue else 0.0
        out.append(
            ProductOut(
                id=product.id,
                name=product.name,
                sku=product.sku,
                price=product.price,
                cost=product.cost,
                category=product.category,
                stock=product.stock,
                sold=int(sold),
                revenue=round(float(revenue), 2),
                profit=round(float(profit), 2),
                margin=round(margin, 1),
                status=product.status,
                image=product.image,
            )
        )
    return out
