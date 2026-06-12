"""Product landing cost: effective-dated COGS per SKU (manual, admin-entered).

The real landed cost Shopify doesn't hold. Each save is a new history row; the
profit engine applies the cost in effect on each order's date, so past orders
stay locked and new orders pick up the latest. See
``app.services.landing_costs``.
"""
from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.models.finance import ProductLandingCost
from app.models.product import Product
from app.schemas.finance import (
    LandingCostCreate,
    LandingCostEntryOut,
    LandingCostSkuOut,
)
from app.services.landing_costs import apply_landing_costs_sync

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_entry(row: ProductLandingCost) -> LandingCostEntryOut:
    return LandingCostEntryOut.model_validate(row)


async def _apply(db: AsyncSession, org_id: str, sku: str) -> None:
    """Re-stamp this SKU's orders + recompute profit after a cost change.

    Commits first so the work sees the change. Prefers the Celery worker (keeps
    the API responsive in production, where a real worker runs); falls back to
    running inline in a threadpool when no broker is reachable (local/dev).
    Best-effort: the cost row is already saved, and the scheduled
    ``recompute-all-profit`` reconciles totals if this ever slips.
    """
    await db.commit()
    try:
        from app.tasks.landing_costs import apply_landing_costs

        apply_landing_costs.delay(org_id, [sku])
        return
    except Exception as exc:
        logger.warning("Landing-cost apply: broker unavailable, running inline (%s)", exc)
    try:
        await run_in_threadpool(apply_landing_costs_sync, org_id, [sku])
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Landing-cost inline apply failed for %s/%s: %s", org_id, sku, exc)


@router.get("", response_model=list[LandingCostSkuOut])
async def list_landing_costs(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[LandingCostSkuOut]:
    """Current landed cost per SKU (latest effective row), with history count."""
    rows = (
        await db.scalars(
            select(ProductLandingCost)
            .where(ProductLandingCost.organization_id == org_id)
            .order_by(ProductLandingCost.sku, ProductLandingCost.effective_from)
        )
    ).all()
    names = {
        sku: name
        for sku, name in (
            await db.execute(
                select(Product.sku, Product.name).where(
                    Product.organization_id == org_id, Product.sku.isnot(None)
                )
            )
        )
    }
    by_sku: dict[str, list[ProductLandingCost]] = {}
    for r in rows:
        by_sku.setdefault(r.sku, []).append(r)

    # "Current" = the entry in effect today: the latest effective_from <= today
    # (the earliest entry covers earlier dates), so a future-dated/scheduled
    # change doesn't misreport the cost that's actually applying right now.
    today = date.today()
    out = []
    for sku, entries in by_sku.items():  # entries ascending by effective_from
        current = entries[0]
        for e in entries:
            if e.effective_from <= today:
                current = e
            else:
                break
        out.append(
            LandingCostSkuOut(
                sku=sku,
                product_name=names.get(sku),
                current_cost=current.cost,
                effective_from=current.effective_from,
                entries=len(entries),
            )
        )
    out.sort(key=lambda x: x.sku)
    return out


@router.get("/{sku}", response_model=list[LandingCostEntryOut])
async def sku_history(
    sku: str,
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> list[LandingCostEntryOut]:
    """Full change history for one SKU, newest first."""
    rows = (
        await db.scalars(
            select(ProductLandingCost)
            .where(
                ProductLandingCost.organization_id == org_id,
                ProductLandingCost.sku == sku,
            )
            .order_by(ProductLandingCost.effective_from.desc())
        )
    ).all()
    return [_to_entry(r) for r in rows]


@router.post("", response_model=LandingCostEntryOut, status_code=201)
async def create_landing_cost(
    payload: LandingCostCreate,
    ctx: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> LandingCostEntryOut:
    """Record a new landed cost for a SKU, effective from a date (default today).

    Re-entering a cost for a SKU+date that already exists overwrites that one
    entry (so a same-day correction doesn't create duplicates).
    """
    sku = payload.sku.strip()
    eff = payload.effective_from or date.today()

    existing = await db.scalar(
        select(ProductLandingCost).where(
            ProductLandingCost.organization_id == org_id,
            ProductLandingCost.sku == sku,
            ProductLandingCost.effective_from == eff,
        )
    )
    if existing is not None:
        existing.cost = payload.cost
        existing.note = payload.note
        row = existing
    else:
        row = ProductLandingCost(
            organization_id=org_id,
            sku=sku,
            cost=payload.cost,
            effective_from=eff,
            note=payload.note,
            created_by=ctx.user.email or ctx.user.name,
        )
        db.add(row)

    await db.flush()
    out = _to_entry(row)
    await _apply(db, org_id, sku)
    return out


@router.delete("/{entry_id}", status_code=204, response_model=None)
async def delete_landing_cost(
    entry_id: str,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove one cost entry; remaining history is re-applied to its orders."""
    row = await db.get(ProductLandingCost, entry_id)
    if row is None or row.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Cost entry not found")
    sku = row.sku
    await db.delete(row)
    await db.flush()
    await _apply(db, org_id, sku)
