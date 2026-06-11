"""Profit engine.

Computes the "true profit" identity per period:

    net_profit = revenue - COGS - ad_spend - shipping - gateway_fees - refunds

``recompute_profit_metrics`` aggregates entirely in SQL (GROUP BY month) so it
stays memory-flat and fast even on stores with hundreds of thousands of orders.
Runs in a **sync** session (Celery worker) and upserts monthly ``ProfitMetric``
rows that the dashboard reads.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import OrderStatus
from app.models.finance import AdSpend, PaymentFee, ProfitMetric, ShippingCost
from app.models.order import Order, OrderItem, Refund


def compute_order_profit(subtotal: float, cogs: float, refunds: float = 0.0) -> float:
    """Per-order gross profit (used for order list display)."""
    return round(subtotal - cogs - refunds, 2)


def order_cogs(order: Order) -> float:
    return sum((item.unit_cost or 0) * (item.quantity or 0) for item in order.items)


@dataclass
class _Bucket:
    revenue: float = 0.0
    cogs: float = 0.0
    ad_spend: float = 0.0
    shipping: float = 0.0
    gateway_fees: float = 0.0
    refunds: float = 0.0
    orders_count: int = 0


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def _month_expr(session: Session, col):
    """Cross-dialect SQL expression truncating a datetime/date column to month."""
    name = session.bind.dialect.name if session.bind is not None else "postgresql"
    if name == "sqlite":
        return func.strftime("%Y-%m-01", col)
    return func.date_trunc("month", col)


def _as_month(val) -> date | None:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return date(val.year, val.month, 1)
    try:
        y, m, _ = str(val)[:10].split("-")
        return date(int(y), int(m), 1)
    except Exception:
        return None


def recompute_profit_metrics(session: Session, organization_id: str) -> int:
    """Aggregate raw rows into monthly ProfitMetric rows (all in SQL). Returns rows written."""
    buckets: dict[date, _Bucket] = defaultdict(_Bucket)

    # Orders → revenue + count by month (exclude cancelled).
    om = _month_expr(session, Order.ordered_at)
    for month_key, revenue, cnt in session.execute(
        select(om, func.coalesce(func.sum(Order.subtotal), 0.0), func.count(Order.id))
        .where(
            Order.organization_id == organization_id,
            Order.status != OrderStatus.cancelled,
            Order.ordered_at.isnot(None),
        )
        .group_by(om)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].revenue += float(revenue or 0.0)
            buckets[d].orders_count += int(cnt or 0)

    # COGS by month (sum quantity * unit_cost via order_items join).
    om2 = _month_expr(session, Order.ordered_at)
    for month_key, cogs in session.execute(
        select(om2, func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_cost), 0.0))
        .select_from(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            Order.organization_id == organization_id,
            Order.status != OrderStatus.cancelled,
            Order.ordered_at.isnot(None),
        )
        .group_by(om2)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].cogs += float(cogs or 0.0)

    # Refunds by month.
    rm = _month_expr(session, Refund.refunded_at)
    for month_key, amount in session.execute(
        select(rm, func.coalesce(func.sum(Refund.amount), 0.0))
        .where(Refund.organization_id == organization_id, Refund.refunded_at.isnot(None))
        .group_by(rm)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].refunds += float(amount or 0.0)

    # Shipping by month.
    sm = _month_expr(session, ShippingCost.date)
    for month_key, cost in session.execute(
        select(sm, func.coalesce(func.sum(ShippingCost.cost), 0.0))
        .where(ShippingCost.organization_id == organization_id, ShippingCost.date.isnot(None))
        .group_by(sm)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].shipping += float(cost or 0.0)

    # Ad spend by month (manual).
    am = _month_expr(session, AdSpend.date)
    for month_key, spend in session.execute(
        select(am, func.coalesce(func.sum(AdSpend.spend), 0.0))
        .where(AdSpend.organization_id == organization_id, AdSpend.date.isnot(None))
        .group_by(am)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].ad_spend += float(spend or 0.0)

    # Gateway fees by month (manual).
    fm = _month_expr(session, PaymentFee.date)
    for month_key, fees in session.execute(
        select(fm, func.coalesce(func.sum(PaymentFee.fees), 0.0))
        .where(PaymentFee.organization_id == organization_id, PaymentFee.date.isnot(None))
        .group_by(fm)
    ):
        d = _as_month(month_key)
        if d is not None:
            buckets[d].gateway_fees += float(fees or 0.0)

    # Upsert ProfitMetric rows.
    existing = {
        m.period: m
        for m in session.scalars(
            select(ProfitMetric).where(
                ProfitMetric.organization_id == organization_id,
                ProfitMetric.period_type == "month",
            )
        )
    }
    written = 0
    for period, b in buckets.items():
        net = b.revenue - b.cogs - b.ad_spend - b.shipping - b.gateway_fees - b.refunds
        margin = (net / b.revenue * 100) if b.revenue else 0.0
        row = existing.get(period)
        if row is None:
            row = ProfitMetric(
                organization_id=organization_id, period_type="month", period=period
            )
            session.add(row)
        row.revenue = round(b.revenue, 2)
        row.cogs = round(b.cogs, 2)
        row.ad_spend = round(b.ad_spend, 2)
        row.shipping = round(b.shipping, 2)
        row.gateway_fees = round(b.gateway_fees, 2)
        row.refunds = round(b.refunds, 2)
        row.net_profit = round(net, 2)
        row.margin = round(margin, 2)
        row.orders_count = b.orders_count
        written += 1

    session.flush()
    return written