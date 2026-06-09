"""Test configuration: SQLite-backed app, env setup, fixtures.

Environment variables MUST be set before any ``app.*`` import so that the
cached ``Settings`` and the SQLAlchemy engines bind to SQLite.
"""
from __future__ import annotations

import os

from cryptography.fernet import Fernet

_DB = "sqlite+aiosqlite:///./test_commerce.db"
_DB_SYNC = "sqlite:///./test_commerce.db"
os.environ.update(
    DATABASE_URL=_DB,
    DATABASE_URL_SYNC=_DB_SYNC,
    ENCRYPTION_KEY=Fernet.generate_key().decode(),
    JWT_SECRET="test-secret-key",
    ANTHROPIC_API_KEY="",  # AI analyst uses the graceful fallback
    CORS_ORIGINS="http://localhost:3000",
)

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import Base, sync_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.tasks.celery_app import celery_app  # noqa: E402

# Run Celery tasks inline (no broker needed) during tests.
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = False


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=sync_engine)
    yield
    Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
