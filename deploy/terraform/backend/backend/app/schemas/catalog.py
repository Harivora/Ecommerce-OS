from __future__ import annotations

from app.models.enums import CustomerSegment, ProductStatus
from app.schemas.common import CamelModel


class ProductOut(CamelModel):
    id: str
    name: str
    sku: str | None = None
    price: float
    cost: float
    category: str | None = None
    stock: int
    sold: int = 0          # derived from order items
    revenue: float = 0.0   # derived
    profit: float = 0.0    # derived
    margin: float = 0.0    # derived (%)
    status: ProductStatus
    image: str | None = None


class CustomerOut(CamelModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    total_orders: int
    total_spent: float
    ltv: float
    last_order: str | None = None
    city: str | None = None
    segment: CustomerSegment
    avatar: str | None = None


class CustomerOrderOut(CamelModel):
    """A single order in a customer's history."""
    id: str
    order_number: str | None = None
    date: str | None = None
    total: float
    status: str
    items: int
    profit: float


class CustomerProductOut(CamelModel):
    """A product the customer has purchased (aggregated across their orders)."""
    title: str | None = None
    sku: str | None = None
    quantity: int
    revenue: float


class CustomerDetailOut(CustomerOut):
    """Full customer profile with order history and purchased products."""
    orders: list[CustomerOrderOut] = []
    products: list[CustomerProductOut] = []
    synced_orders: int = 0      # orders we have line-item detail for
    synced_revenue: float = 0.0  # revenue across synced orders
