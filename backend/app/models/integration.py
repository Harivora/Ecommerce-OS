from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ConnectionStatus, IntegrationCategory


class Integration(Base):
    """A subscriber's connection to an external platform.

    ``credentials_encrypted`` holds a Fernet-encrypted JSON blob (see
    ``app.core.crypto``). It is never exposed through the API.
    """

    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Stable provider key, e.g. "shopify", "shiprocket", "meta", "razorpay".
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[IntegrationCategory] = mapped_column(
        SAEnum(IntegrationCategory, native_enum=False), nullable=False
    )
    status: Mapped[ConnectionStatus] = mapped_column(
        SAEnum(ConnectionStatus, native_enum=False),
        default=ConnectionStatus.available,
        nullable=False,
    )
    credentials_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Resumable customer backfill high-water mark (Shopify since_id).
    customer_since_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
