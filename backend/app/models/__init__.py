"""SQLAlchemy ORM models for AI Commerce OS.

Importing this package registers every model on the shared ``Base.metadata``
so Alembic autogeneration and ``create_all`` see them all.
"""
from app.core.database import Base
from app.models.ai import AIConversation, AIMessage
from app.models.auth import PasswordResetToken
from app.models.customer import Customer
from app.models.finance import (
    AdSpend,
    PaymentFee,
    ProductLandingCost,
    ProfitMetric,
    ShippingCost,
)
from app.models.integration import Integration
from app.models.order import Order, OrderItem, Refund
from app.models.organization import Organization
from app.models.product import Product
from app.models.store import Store
from app.models.user import User

__all__ = [
    "Base",
    "Organization",
    "User",
    "Store",
    "Integration",
    "Product",
    "Customer",
    "Order",
    "OrderItem",
    "Refund",
    "AdSpend",
    "ShippingCost",
    "PaymentFee",
    "ProductLandingCost",
    "ProfitMetric",
    "AIConversation",
    "AIMessage",
    "PasswordResetToken",
]
