from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import OrderStatus


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_order_org_external"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    # Human-facing order number (e.g. "ORD-10248").
    order_number: Mapped[str | None] = mapped_column(String(64), nullable=True)

    customer_id: Mapped[str | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    # Shopify customer id — links orders to customers even when there's no email.
    customer_external_id: Mapped[str | None] = mapped_column(
        String(128), index=True, nullable=True
    )

    total: Mapped[float] = mapped_column(Float, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    shipping: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    item_count: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, native_enum=False), default=OrderStatus.pending
    )
    # Raw Shopify states, surfaced as separate Payment/Fulfillment columns.
    financial_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fulfillment_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    channel: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ordered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    refunds: Mapped[list["Refund"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product_id: Mapped[str | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(128), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)  # COGS per unit at sale time

    order: Mapped["Order"] = relationship(back_populates="items")


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    order_id: Mapped[str | None] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=True
    )
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )

    order: Mapped["Order | None"] = relationship(back_populates="refunds")
