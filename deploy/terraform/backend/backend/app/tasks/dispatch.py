"""Dispatch integration syncs without blocking the API request.

In local mode (``celery_task_always_eager=True``) Celery's ``.delay()`` runs the
task *inline* in the calling thread — which would block an HTTP request for the
full backfill. So locally we run the task in a background daemon thread and
dedupe per-integration so overlapping ticks don't double-run a long sync.

With a real broker (Docker), we just enqueue and let the worker handle it.
"""
from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)

_inflight: set[str] = set()
_lock = threading.Lock()


def is_syncing(integration_id: str) -> bool:
    with _lock:
        return integration_id in _inflight


def kick_sync(integration_id: str) -> bool:
    """Start a sync for the integration. Returns True if started/enqueued."""
    from app.core.config import settings

    if not settings.celery_task_always_eager:
        # Real broker: enqueue and return immediately.
        try:
            from app.tasks.sync import sync_integration

            sync_integration.delay(integration_id)
            return True
        except Exception as exc:  # broker unreachable
            logger.warning("Could not enqueue sync for %s: %s", integration_id, exc)
            return False

    # Local eager mode: run inline inside a background thread, deduped.
    with _lock:
        if integration_id in _inflight:
            return True  # already running; don't start a second pass
        _inflight.add(integration_id)

    def _run() -> None:
        try:
            from app.tasks.sync import sync_integration

            sync_integration.delay(integration_id)  # eager → runs here
        except Exception as exc:
            logger.warning("Local sync failed for %s: %s", integration_id, exc)
        finally:
            with _lock:
                _inflight.discard(integration_id)

    threading.Thread(
        target=_run, daemon=True, name=f"sync-{integration_id}"
    ).start()
    return True
