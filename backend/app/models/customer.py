from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import CustomerSegment


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_customer_org_external"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)
    ltv: Mapped[float] = mapped_column(Float, default=0.0)
    last_order: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    segment: Mapped[CustomerSegment] = mapped_column(
        SAEnum(CustomerSegment, native_enum=False), default=CustomerSegment.new
    )
