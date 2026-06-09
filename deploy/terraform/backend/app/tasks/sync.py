"""Celery tasks: pull data from connected integrations, then recompute profit."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.crypto import decrypt_credentials
from app.core.database import SyncSessionLocal
from app.integrations.base import ConnectorError
from app.integrations.registry import get_connector
from app.models.enums import ConnectionStatus
from app.models.integration import Integration
from app.tasks.celery_app import celery_app
from app.tasks.profit import recompute_profit

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.sync.sync_integration", bind=True, max_retries=2)
def sync_integration(self, integration_id: str) -> dict:
    """Sync a single integration and trigger a profit recompute on success."""
    with SyncSessionLocal() as session:
        integration = session.get(Integration, integration_id)
        if integration is None or not integration.credentials_encrypted:
            return {"skipped": "no integration or credentials"}

        connector = get_connector(integration.provider)
        if connector is None:
            return {"skipped": f"no connector for {integration.provider}"}

        credentials = decrypt_credentials(integration.credentials_encrypted)
        org_id = integration.organization_id
        # Incremental after the first successful sync: only pull records updated
        # since the last run (minus a 10-min overlap to catch edge updates).
        # First run (last_sync is None) does a full backfill.
        started = datetime.now(timezone.utc)
        since = (
            integration.last_sync - timedelta(minutes=10)
            if integration.last_sync
            else None
        )
        try:
            result = connector.sync(session, org_id, credentials, since=since)
            integration.status = ConnectionStatus.connected
            integration.last_sync = started
            integration.sync_error = None
            session.commit()
        except ConnectorError as exc:
            integration.status = ConnectionStatus.error
            integration.sync_error = str(exc)[:1000]
            session.commit()
            logger.warning("Sync failed for %s: %s", integration_id, exc)
            return {"error": str(exc)}
        except Exception as exc:  # unexpected — retry with backoff
            session.rollback()
            integration.sync_error = str(exc)[:1000]
            session.commit()
            raise self.retry(exc=exc)

    # Recompute profit after the session commits the synced rows — unless this
    # connector opts out (e.g. the NAS backup connector, which only exports).
    if getattr(connector, "triggers_profit_recompute", True):
        recompute_profit.delay(org_id)
    return {"counts": result.counts}


@celery_app.task(name="app.tasks.sync.sync_all_integrations")
def sync_all_integrations() -> dict:
    """Beat task: enqueue a sync for every connected integration with a connector."""
    enqueued = 0
    with SyncSessionLocal() as session:
        integrations = session.scalars(
            select(Integration).where(
                Integration.status == ConnectionStatus.connected,
                Integration.credentials_encrypted.isnot(None),
            )
        ).all()
        for integration in integrations:
            if get_connector(integration.provider) is not None:
                sync_integration.delay(integration.id)
                enqueued += 1
    return {"enqueued": enqueued}
