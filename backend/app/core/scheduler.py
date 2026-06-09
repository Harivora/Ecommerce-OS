"""In-process auto-sync scheduler for local (no-Celery-beat) mode.

A daemon thread periodically kicks an incremental sync for every connected
integration that has a live connector. In Docker mode (Celery beat present),
leave ``local_scheduler_enabled`` off and let beat schedule syncs instead.
"""
from __future__ import annotations

import logging
import threading
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

_started = False


def _tick() -> None:
    from sqlalchemy import select

    from app.core.database import SyncSessionLocal
    from app.integrations.registry import get_connector
    from app.models.enums import ConnectionStatus
    from app.models.integration import Integration
    from app.tasks.dispatch import kick_sync

    with SyncSessionLocal() as session:
        integrations = session.scalars(
            select(Integration).where(
                Integration.status.in_(
                    [ConnectionStatus.connected, ConnectionStatus.error]
                ),
                Integration.credentials_encrypted.isnot(None),
            )
        ).all()
        ids = [i.id for i in integrations if get_connector(i.provider) is not None]

    for integration_id in ids:
        kick_sync(integration_id)


def _loop(interval_seconds: int) -> None:
    while True:
        time.sleep(interval_seconds)
        try:
            _tick()
        except Exception as exc:  # never let the loop die
            logger.warning("Auto-sync tick failed: %s", exc)


def start_scheduler() -> None:
    global _started
    if _started or not settings.local_scheduler_enabled:
        return
    interval = max(1, settings.local_sync_interval_minutes) * 60
    threading.Thread(
        target=_loop, args=(interval,), daemon=True, name="local-sync-scheduler"
    ).start()
    _started = True
    logger.info(
        "Local auto-sync scheduler started (every %s min).",
        settings.local_sync_interval_minutes,
    )
