"""Celery application: Redis broker/backend + periodic sync schedule."""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab  # noqa: F401  (available for custom schedules)

from app.core.config import settings

celery_app = Celery(
    "commerce_os",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.sync", "app.tasks.profit"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_retry_delay=60,
    # Inline execution for local/no-broker dev (set CELERY_TASK_ALWAYS_EAGER=true).
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=False,
)

# Periodically re-sync every connected integration.
celery_app.conf.beat_schedule = {
    "sync-all-integrations": {
        "task": "app.tasks.sync.sync_all_integrations",
        "schedule": float(settings.sync_interval_minutes * 60),
    },
}
