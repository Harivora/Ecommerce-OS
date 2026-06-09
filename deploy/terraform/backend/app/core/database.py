"""Async SQLAlchemy engine, session factory, and declarative Base."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime

from sqlalchemy import DateTime, create_engine, func
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import settings

# SQLite (local/no-Docker dev) benefits from a busy timeout since the async API
# and the sync worker share one file; Postgres ignores these connect args.
_sqlite = settings.database_url.startswith("sqlite")
_async_connect_args = {"timeout": 30} if _sqlite else {}
_sync_connect_args = {"timeout": 30} if settings.database_url_sync.startswith("sqlite") else {}

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    connect_args=_async_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

# Synchronous engine/session for Celery workers (connectors + profit engine
# run in a sync context). Uses the psycopg sync driver (or SQLite locally).
sync_engine = create_engine(
    settings.database_url_sync,
    pool_pre_ping=True,
    future=True,
    connect_args=_sync_connect_args,
)
SyncSessionLocal = sessionmaker(
    sync_engine, class_=Session, expire_on_commit=False, autoflush=False
)


class Base(DeclarativeBase):
    """Declarative base with shared timestamp columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a scoped async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
