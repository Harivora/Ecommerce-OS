"""Product landing-cost resolution + re-stamping.

A SKU's landed cost is **effective-dated**: every change is a new
``ProductLandingCost`` row, and the cost that applies to an order is the row in
effect on that order's date. This module turns that history into the per-order
``OrderItem.unit_cost`` the profit engine reads, so:

  * past orders stay locked to the cost in effect on their order date,
  * new orders pick up the latest cost,
  * the very first cost entered for a SKU backfills every existing order of it.

Runs in a **sync** session (Celery worker or a threadpool off the API request).
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SyncSessionLocal
from app.models.finance import ProductLandingCost
from app.models.order import Order, OrderItem
from app.services.profit_engine import recompute_profit_metrics

# sku -> ascending list of (effective_from, cost)
History = dict[str, list[tuple[date, float]]]


def load_history(session: Session, organization_id: str) -> History:
    """Load every SKU's cost history for an org, ascending by effective date."""
    history: History = {}
    rows = session.execute(
        select(
            ProductLandingCost.sku,
            ProductLandingCost.effective_from,
            ProductLandingCost.cost,
        )
        .where(ProductLandingCost.organization_id == organization_id)
        .order_by(ProductLandingCost.sku, ProductLandingCost.effective_from)
    )
    for sku, eff, cost in rows:
        history.setdefault(sku, []).append((eff, float(cost or 0.0)))
    return history


def resolve_cost(rows: list[tuple[date, float]], on_date: date | None) -> float | None:
    """The landed cost in effect on ``on_date``.

    ``rows`` must be ascending by effective date. Returns ``None`` when there's
    no history (caller falls back to the platform cost). The earliest row also
    covers dates before it, so the first cost entered applies to old orders too.
    """
    if not rows:
        return None
    if on_date is None:
        return rows[-1][1]  # unknown order date → latest known cost
    if on_date < rows[0][0]:
        return rows[0][1]  # earliest cost extends backward
    chosen = rows[0][1]
    for eff, cost in rows:
        if eff <= on_date:
            chosen = cost
        else:
            break
    return chosen


def restamp_order_items(
    session: Session, organization_id: str, skus: list[str] | None = None
) -> int:
    """Recompute ``OrderItem.unit_cost`` from landing-cost history, by order date.

    Scoped to ``skus`` when given (the SKU just edited) — bounded work even on a
    large store. Order items whose SKU has no landing cost are left untouched
    (they keep the platform/Shopify cost). Returns the number of rows changed.
    """
    history = load_history(session, organization_id)
    if skus is not None:
        history = {s: history.get(s, []) for s in skus}
    target_skus = [s for s, rows in history.items() if rows]
    if not target_skus:
        return 0

    updated = 0
    for item, ordered_at in session.execute(
        select(OrderItem, Order.ordered_at)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.organization_id == organization_id,
            OrderItem.sku.in_(target_skus),
        )
    ):
        on_date = ordered_at.date() if ordered_at else None
        new_cost = resolve_cost(history.get(item.sku, []), on_date)
        if new_cost is not None and item.unit_cost != new_cost:
            item.unit_cost = new_cost
            updated += 1

    session.flush()
    return updated


def apply_landing_costs_sync(
    organization_id: str, skus: list[str] | None = None
) -> dict:
    """Re-stamp affected orders then recompute profit, in a fresh sync session.

    The single entry point used by both the API (via a threadpool, so a cost
    edit takes effect immediately even with no Celery worker) and the Celery
    task. Self-contained: opens, commits, and closes its own session.
    """
    with SyncSessionLocal() as session:
        restamped = restamp_order_items(session, organization_id, skus)
        recompute_profit_metrics(session, organization_id)
        session.commit()
    return {"restamped": restamped}
