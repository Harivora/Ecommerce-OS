"""Integrations: list catalog, connect (encrypt + validate), disconnect, sync, test."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import encrypt_credentials
from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.integrations.base import ConnectorError, IntegrationMeta
from app.integrations.registry import get_connector, get_meta, list_meta
from app.models.enums import ConnectionStatus, StorePlatform
from app.models.integration import Integration
from app.models.store import Store
from app.schemas.integration import ConnectRequest, IntegrationActionResult, IntegrationOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_out(meta: IntegrationMeta, row: Integration | None) -> IntegrationOut:
    return IntegrationOut(
        id=row.id if row else meta.provider,
        provider=meta.provider,
        name=meta.name,
        description=meta.description,
        icon=meta.icon,
        status=row.status if row else ConnectionStatus.available,
        phase=meta.phase,
        last_sync=row.last_sync.isoformat() if row and row.last_sync else None,
        category=meta.category,
        features=meta.features,
        has_connector=meta.has_connector,
        credential_fields=meta.credential_fields,
        sync_error=row.sync_error if row else None,
    )


async def _rows_by_provider(db: AsyncSession, org_id: str) -> dict[str, Integration]:
    rows = (
        await db.scalars(select(Integration).where(Integration.organization_id == org_id))
    ).all()
    return {r.provider: r for r in rows}


@router.get("", response_model=list[IntegrationOut])
async def list_integrations(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[IntegrationOut]:
    rows = await _rows_by_provider(db, org_id)
    return [_to_out(meta, rows.get(meta.provider)) for meta in list_meta()]


async def _get_or_create(db: AsyncSession, org_id: str, meta: IntegrationMeta) -> Integration:
    row = await db.scalar(
        select(Integration).where(
            Integration.organization_id == org_id, Integration.provider == meta.provider
        )
    )
    if row is None:
        row = Integration(
            organization_id=org_id,
            provider=meta.provider,
            name=meta.name,
            category=meta.category,
        )
        db.add(row)
        await db.flush()
    return row


@router.post("/{provider}/connect", response_model=IntegrationActionResult)
async def connect_integration(
    provider: str,
    payload: ConnectRequest,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> IntegrationActionResult:
    meta = get_meta(provider)
    if meta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown integration")

    connector = get_connector(provider)
    if connector is not None:
        try:
            # Validate live credentials (sync HTTP) off the event loop.
            await run_in_threadpool(connector.validate, payload.credentials)
        except ConnectorError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    row = await _get_or_create(db, org_id, meta)
    row.credentials_encrypted = encrypt_credentials(payload.credentials)
    row.status = ConnectionStatus.connected
    row.sync_error = None

    # For Shopify, also record/refresh the Store row used by the dashboard.
    if provider == "shopify" and payload.credentials.get("shop_url"):
        shop_url = payload.credentials["shop_url"]
        store = await db.scalar(
            select(Store).where(Store.organization_id == org_id, Store.url == shop_url)
        )
        if store is None:
            db.add(
                Store(
                    organization_id=org_id,
                    name=shop_url,
                    platform=StorePlatform.shopify,
                    url=shop_url,
                    status=ConnectionStatus.connected,
                )
            )
    # Commit before enqueuing so the worker (a separate DB connection, and the
    # inline task in eager/local mode) can see the new integration row.
    await db.commit()

    # Best-effort: register Shopify webhooks for near-real-time refresh when a
    # public URL is configured (otherwise the in-process scheduler handles it).
    if provider == "shopify" and settings.public_webhook_base_url:
        callback = settings.public_webhook_base_url.rstrip("/") + "/api/v1/webhooks/shopify"
        try:
            created = await run_in_threadpool(
                connector.register_webhooks, payload.credentials, callback
            )
            logger.info("Registered Shopify webhooks for %s: %s", org_id, created)
        except Exception as exc:  # don't fail the connect on webhook errors
            logger.warning("Webhook registration failed: %s", exc)

    sync_enqueued = False
    if connector is not None:
        sync_enqueued = _enqueue_sync(row.id)

    return IntegrationActionResult(
        integration=_to_out(meta, row),
        detail="Connected." + (" Initial sync started." if sync_enqueued else ""),
        sync_enqueued=sync_enqueued,
    )


@router.post("/{provider}/disconnect", response_model=IntegrationActionResult)
async def disconnect_integration(
    provider: str,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> IntegrationActionResult:
    meta = get_meta(provider)
    if meta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown integration")
    row = await db.scalar(
        select(Integration).where(
            Integration.organization_id == org_id, Integration.provider == provider
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not connected")
    row.credentials_encrypted = None
    row.status = ConnectionStatus.available
    row.last_sync = None
    row.sync_error = None
    await db.flush()
    return IntegrationActionResult(integration=_to_out(meta, row), detail="Disconnected.")


@router.post("/{provider}/sync", response_model=IntegrationActionResult)
async def trigger_sync(
    provider: str,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> IntegrationActionResult:
    meta = get_meta(provider)
    if meta is None or get_connector(provider) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No connector for this integration")
    row = await db.scalar(
        select(Integration).where(
            Integration.organization_id == org_id,
            Integration.provider == provider,
            Integration.status == ConnectionStatus.connected,
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Integration not connected")
    await db.commit()  # ensure committed state is visible to the worker
    enqueued = _enqueue_sync(row.id)
    return IntegrationActionResult(
        integration=_to_out(meta, row),
        detail="Sync started." if enqueued else "Could not enqueue sync.",
        sync_enqueued=enqueued,
    )


def _enqueue_sync(integration_id: str) -> bool:
    """Start a sync without blocking the request.

    Local mode runs it in a background thread; Docker enqueues to Celery.
    See ``app.tasks.dispatch.kick_sync``.
    """
    try:
        from app.tasks.dispatch import kick_sync

        return kick_sync(integration_id)
    except Exception as exc:
        logger.warning("Could not start sync for %s: %s", integration_id, exc)
        return False
