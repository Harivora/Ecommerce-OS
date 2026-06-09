from __future__ import annotations

import uuid
from datetime import date as date_type, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import AdPlatform, SettlementStatus


class AdSpend(Base):
    """Ad campaign spend. Manual-entry for now; Meta/Google connectors later."""

    __tablename__ = "ad_spend"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    platform: Mapped[AdPlatform] = mapped_column(SAEnum(AdPlatform, native_enum=False))
    campaign: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    date: Mapped[date_type | None] = mapped_column(Date, index=True, nullable=True)


class ShippingCost(Base):
    """Per-shipment cost + RTO flag. Populated by the Shiprocket connector."""

    __tablename__ = "shipping_costs"
    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_shipping_org_external"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    order_external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    courier: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_rto: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    date: Mapped[date_type | None] = mapped_column(Date, index=True, nullable=True)


class PaymentFee(Base):
    """Gateway settlements + fees. Manual-entry for now; Razorpay later."""

    __tablename__ = "payment_fees"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    gateway: Mapped[str | None] = mapped_column(String(64), nullable=True)
    method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    fees: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[SettlementStatus] = mapped_column(
        SAEnum(SettlementStatus, native_enum=False), default=SettlementStatus.pending
    )
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date: Mapped[date_type | None] = mapped_column(Date, index=True, nullable=True)


class ProfitMetric(Base):
    """Precomputed profit per organization per period (day or month).

    ``period_type`` is "day" or "month"; ``period`` is the first date of that
    bucket. The profit engine upserts these; the dashboard reads them.
    """

    __tablename__ = "profit_metrics"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "period_type", "period", name="uq_profit_org_period"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    period_type: Mapped[str] = mapped_column(String(8), default="month")  # "day" | "month"
    period: Mapped[date_type] = mapped_column(Date, index=True, nullable=False)

    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    cogs: Mapped[float] = mapped_column(Float, default=0.0)
    ad_spend: Mapped[float] = mapped_column(Float, default=0.0)
    shipping: Mapped[float] = mapped_column(Float, default=0.0)
    gateway_fees: Mapped[float] = mapped_column(Float, default=0.0)
    refunds: Mapped[float] = mapped_column(Float, default=0.0)
    net_profit: Mapped[float] = mapped_column(Float, default=0.0)
    margin: Mapped[float] = mapped_column(Float, default=0.0)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
