"""Rate limiting (slowapi) — protects auth endpoints from brute-force / abuse.

Degrades gracefully: if slowapi isn't installed yet, a no-op limiter is used so
the app still boots (rate limiting simply inactive until `pip install slowapi`,
which is in requirements.txt). In-memory storage suits a single API instance;
for multiple instances, point slowapi at Redis via ``storage_uri``.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    SLOWAPI_AVAILABLE = True
except Exception:  # slowapi not installed yet
    SLOWAPI_AVAILABLE = False
    logger.warning(
        "slowapi not installed — auth rate limiting is INACTIVE. "
        "Run `pip install -r requirements.txt` to enable it."
    )

    class _NoopLimiter:
        """Stand-in so ``@limiter.limit(...)`` decorators are harmless no-ops."""

        def limit(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

    limiter = _NoopLimiter()  # type: ignore[assignment]
