"""User-facing data export: per-dataset CSV downloads + a full ZIP.

Reuses the per-org export logic in services/backup.py. Restricted to editors
(owner/admin) since the export contains all org data. The export runs in a
threadpool (sync session) so it doesn't block the event loop.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.core.database import SyncSessionLocal
from app.core.deps import require_editor, require_org
from app.services.backup import (
    available_datasets,
    build_backup_archive,
    export_dataset_csv,
)

router = APIRouter()


@router.get("/datasets")
async def list_datasets(
    _: object = Depends(require_editor), __: str = Depends(require_org)
) -> list[dict[str, str]]:
    """The datasets available for individual CSV download."""
    return available_datasets()


@router.get("/dataset/{key}")
async def download_dataset(
    key: str,
    _: object = Depends(require_editor),
    org_id: str = Depends(require_org),
) -> Response:
    """Download a single dataset as a CSV file."""
    def _build():
        with SyncSessionLocal() as session:
            return export_dataset_csv(session, org_id, key)

    result = await run_in_threadpool(_build)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown dataset")
    filename, data = result
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/all")
async def download_all(
    _: object = Depends(require_editor),
    org_id: str = Depends(require_org),
) -> Response:
    """Download every dataset bundled into a single ZIP of CSVs."""
    def _build():
        with SyncSessionLocal() as session:
            return build_backup_archive(session, org_id)

    filename, data, _counts = await run_in_threadpool(_build)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )