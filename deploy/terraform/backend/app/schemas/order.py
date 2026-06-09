from __future__ import annotations

from app.models.enums import OrderStatus
from app.schemas.common import CamelModel


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
    payment_method: str | None = None
    profit: float = 0.0  # derived per-order
    channel: str | None = None
