from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole, UserStatus

if TYPE_CHECKING:
    from app.models.organization import Organization


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, native_enum=False), default=UserRole.owner, nullable=False
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, native_enum=False), default=UserStatus.active, nullable=False
    )
    avatar: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_active: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Nullable for super_admin (platform-level, not tied to one tenant).
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True
    )
    organization: Mapped["Organization | None"] = relationship(back_populates="users")
