"""Per-organization data export → a single timestamped CSV-zip archive.

Used by the NAS backup connector. Dumps one CSV per table, scoped to a single
tenant, into an in-memory zip. Runs in a **sync** session (Celery worker), like
the data connectors. Secrets (password hashes, encrypted credentials) are never
written to the export.
"""
from __future__ import annotations

import csv
import enum
import io
import json
import zipfile
from datetime import datetime, date, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai import AIConversation, AIMessage
from app.models.customer import Customer
from app.models.finance import AdSpend, PaymentFee, ProfitMetric, ShippingCost
from app.models.integration import Integration
from app.models.order import Order, OrderItem, Refund
from app.models.organization import Organization
from app.models.product import Product
from app.models.store import Store
from app.models.user import User

# Columns never written to a backup (secrets / password hashes).
_REDACT = {"password_hash", "credentials_encrypted"}

# (csv filename, model). Every model here is scoped by organization_id, except
# Organization itself (scoped by its primary key) and AIMessage (handled below,
# scoped via its parent conversation).
_ORG_MODELS: list[tuple[str, type]] = [
    ("organizations", Organization),
    ("users", User),
    ("stores", Store),
    ("integrations", Integration),
    ("products", Product),
    ("customers", Customer),
    ("orders", Order),
    ("order_items", OrderItem),
    ("refunds", Refund),
    ("ad_spend", AdSpend),
    ("shipping_costs", ShippingCost),
    ("payment_fees", PaymentFee),
    ("profit_metrics", ProfitMetric),
    ("ai_conversations", AIConversation),
]

# Friendly labels for the user-facing export module (key == CSV filename).
_DATASET_LABELS: dict[str, str] = {
    "orders": "Orders",
    "order_items": "Order line items",
    "products": "Products",
    "customers": "Customers",
    "refunds": "Refunds",
    "profit_metrics": "Profit metrics",
    "ad_spend": "Ad spend",
    "shipping_costs": "Shipping costs",
    "payment_fees": "Payment fees",
    "stores": "Stores",
    "integrations": "Integrations",
    "ai_conversations": "AI conversations",
    "ai_messages": "AI messages",
    "users": "Team members",
}

_MODEL_BY_KEY: dict[str, type] = {name: model for name, model in _ORG_MODELS}


def _fmt(value: object) -> str:
    """Render a cell value as a CSV-safe string."""
    if value is None:
        return ""
    if isinstance(value, enum.Enum):
        return str(value.value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _columns(model: type) -> list[str]:
    return [c.name for c in model.__table__.columns if c.name not in _REDACT]


def _csv_bytes(rows: list, columns: list[str]) -> bytes:
    buf = io.StringIO(newline="")
    writer = csv.writer(buf)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([_fmt(getattr(row, c)) for c in columns])
    return buf.getvalue().encode("utf-8")


def _rows_for(session: Session, model: type, organization_id: str) -> list:
    if model is Organization:
        stmt = select(model).where(model.id == organization_id)
    else:
        stmt = select(model).where(model.organization_id == organization_id)
    return list(session.scalars(stmt).all())


def build_backup_archive(
    session: Session, organization_id: str
) -> tuple[str, bytes, dict[str, int]]:
    """Build the per-org backup. Returns (filename, zip_bytes, row_counts)."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    counts: dict[str, int] = {}
    zbuf = io.BytesIO()

    with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname, model in _ORG_MODELS:
            rows = _rows_for(session, model, organization_id)
            zf.writestr(f"{fname}.csv", _csv_bytes(rows, _columns(model)))
            counts[fname] = len(rows)

        # AI messages are scoped through their conversation (no organization_id).
        messages = list(
            session.scalars(
                select(AIMessage)
                .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
                .where(AIConversation.organization_id == organization_id)
            ).all()
        )
        zf.writestr("ai_messages.csv", _csv_bytes(messages, _columns(AIMessage)))
        counts["ai_messages"] = len(messages)

        # A small manifest so the archive is self-describing.
        manifest = {
            "organization_id": organization_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "row_counts": counts,
            "format": "csv",
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2).encode("utf-8"))

    filename = f"commerce-backup-{organization_id}-{stamp}.zip"
    return filename, zbuf.getvalue(), counts


def available_datasets() -> list[dict[str, str]]:
    """Datasets a user can download individually (key + friendly label)."""
    keys = [
        "orders", "order_items", "products", "customers", "refunds",
        "profit_metrics", "ad_spend", "shipping_costs", "payment_fees",
        "stores", "integrations", "ai_conversations", "ai_messages", "users",
    ]
    return [{"key": k, "label": _DATASET_LABELS.get(k, k)} for k in keys]


def export_dataset_csv(
    session: Session, organization_id: str, key: str
) -> tuple[str, bytes] | None:
    """Build one dataset's CSV for an org. Returns (filename, bytes) or None."""
    if key == "ai_messages":
        messages = list(
            session.scalars(
                select(AIMessage)
                .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
                .where(AIConversation.organization_id == organization_id)
            ).all()
        )
        return f"{key}.csv", _csv_bytes(messages, _columns(AIMessage))
    model = _MODEL_BY_KEY.get(key)
    if model is None:
        return None
    rows = _rows_for(session, model, organization_id)
    return f"{key}.csv", _csv_bytes(rows, _columns(model))
