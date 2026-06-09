"""Profit engine.

Computes the "true profit" identity per period:

    net_profit = revenue - COGS - ad_spend - shipping - gateway_fees - refunds

With Shopify + Shiprocket connected, revenue/COGS/refunds/shipping are derived
from synced data; ad_spend and gateway_fees come from manual-entry tables until
those connectors exist.

``recompute_profit_metrics`` runs in a **sync** session (Celery worker) and
upserts monthly ``ProfitMetric`` rows that the dashboard reads.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import OrderStatus
from app.models.finance import AdSpend, PaymentFee, ProfitMetric, ShippingCost
from app.models.order import Order, Refund


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
    orders: set[str] = field(default_factory=set)


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def recompute_profit_metrics(session: Session, organization_id: str) -> int:
    """Aggregate raw rows into monthly ProfitMetric rows. Returns rows written."""
    buckets: dict[date, _Bucket] = defaultdict(_Bucket)

    # Orders + line items → revenue & COGS (exclude cancelled).
    orders = session.scalars(
        select(Order)
        .where(Order.organization_id == organization_id)
        .options(selectinload(Order.items))
    ).all()
    for o in orders:
        if o.ordered_at is None or o.status == OrderStatus.cancelled:
            continue
        b = buckets[_month_start(o.ordered_at.date())]
        b.revenue += o.subtotal or 0.0
        b.cogs += order_cogs(o)
        b.orders.add(o.id)

    # Refunds (by refund date).
    for r in session.scalars(
        select(Refund).where(Refund.organization_id == organization_id)
    ):
        if r.refunded_at is None:
            continue
        buckets[_month_start(r.refunded_at.date())].refunds += r.amount or 0.0

    # Shipping costs we pay (Shiprocket).
    for s in session.scalars(
        select(ShippingCost).where(ShippingCost.organization_id == organization_id)
    ):
        if s.date is None:
            continue
        buckets[_month_start(s.date)].shipping += s.cost or 0.0

    # Ad spend (manual).
    for a in session.scalars(
        select(AdSpend).where(AdSpend.organization_id == organization_id)
    ):
        if a.date is None:
            continue
        buckets[_month_start(a.date)].ad_spend += a.spend or 0.0

    # Gateway fees (manual).
    for f in session.scalars(
        select(PaymentFee).where(PaymentFee.organization_id == organization_id)
    ):
        if f.date is None:
            continue
        buckets[_month_start(f.date)].gateway_fees += f.fees or 0.0

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
        row.orders_count = len(b.orders)
        written += 1

    session.flush()
    return written
