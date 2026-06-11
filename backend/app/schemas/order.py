from __future__ import annotations

from app.models.enums import OrderStatus
from app.schemas.common import CamelModel


class OrderLineItem(CamelModel):
    title: str | None = None
    sku: str | None = None
    quantity: int = 0
    unit_price: float = 0.0


class OrderOut(CamelModel):
    id: str
    customer: str | None = None
    email: str | None = None
    date: str | None = None
    total: float
    subtotal: float
    shipping: float
    tax: float
    discount: float
    items: int          # item count (frontend field name)
    status: OrderStatus
    payment_status: str | None = None
    fulfillment_status: str | None = None
    payment_method: str | None = None
    profit: float = 0.0  # derived per-order
    channel: str | None = None
    line_items: list[OrderLineItem] = []
