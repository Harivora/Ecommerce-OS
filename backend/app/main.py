"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.ratelimit import SLOWAPI_AVAILABLE, limiter
from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.user import User

logger = logging.getLogger(__name__)


async def seed_super_admin() -> None:
    """Create the platform owner account on first boot if it doesn't exist."""
    try:
        async with AsyncSessionLocal() as db:
            existing = await db.scalar(
                select(User).where(User.email == settings.superadmin_email.lower())
            )
            if existing is None:
                db.add(
                    User(
                        name=settings.superadmin_name,
                        email=settings.superadmin_email.lower(),
                        password_hash=hash_password(settings.superadmin_password),
                        role=UserRole.super_admin,
                        status=UserStatus.active,
                        organization_id=None,
                        last_active=datetime.now(timezone.utc),
                    )
                )
                await db.commit()
                logger.info("Seeded super-admin %s", settings.superadmin_email)
    except Exception as exc:  # DB not migrated yet, etc. — don't crash boot.
        logger.warning("Super-admin seed skipped: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_super_admin()
    # Local mode only: start the in-process auto-sync scheduler. In Docker mode
    # (eager off) Celery beat schedules syncs instead.
    if settings.celery_task_always_eager:
        from app.core.scheduler import start_scheduler

        start_scheduler()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url=f"{settings.api_v1_prefix}/docs",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (brute-force protection on auth endpoints).
app.state.limiter = limiter
if SLOWAPI_AVAILABLE:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded

    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
elif settings.environment.lower() == "production":
    logger.warning("Rate limiting is INACTIVE in production (slowapi missing).")


@app.middleware("http")
async def _security_headers(request, call_next):
    """Add baseline security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.environment.lower() == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Liveness: the process is up. Cheap, no dependencies."""
    return {"status": "ok", "app": settings.app_name}


@app.get("/health/ready", tags=["health"])
async def readiness() -> dict[str, str]:
    """Readiness: can we actually serve traffic (DB reachable)? Use this for
    the load balancer's health check so a DB outage marks the app unhealthy."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"database not ready: {exc}")
    return {"status": "ready", "database": "ok"}
