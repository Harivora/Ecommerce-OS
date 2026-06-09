from __future__ import annotations

import uuid

from sqlalchemy import Enum as SAEnum, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ProductStatus


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_product_org_external"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # ID from the source platform (e.g. Shopify product/variant id).
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)  # unit COGS
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[ProductStatus] = mapped_column(
        SAEnum(ProductStatus, native_enum=False), default=ProductStatus.active
    )
