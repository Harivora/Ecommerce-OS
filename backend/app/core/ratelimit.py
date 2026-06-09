"""Lightweight in-memory rate limiting via a FastAPI dependency.

Implemented as a dependency (not a decorator) so it never interferes with
FastAPI's request-body parsing. In-memory per process — fine for a single API
instance; back it with Redis if you scale to multiple instances.
"""
from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

# key -> list of recent hit timestamps
_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit(max_calls: int, window_seconds: int = 60):
    """Allow at most ``max_calls`` per ``window_seconds`` per client IP + path."""

    async def _checker(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.time()
        recent = [t for t in _hits[key] if now - t < window_seconds]
        if len(recent) >= max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a minute and try again.",
            )
        recent.append(now)
        _hits[key] = recent

    return _checker