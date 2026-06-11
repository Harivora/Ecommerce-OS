"""order→customer link + payment/fulfillment status

Adds columns so orders can be linked to customers without an email, and so the
UI can show separate Payment and Fulfillment statuses (mirroring Shopify).

Revision ID: 0002_order_customer_payment
Revises: 0001_initial
Create Date: 2026-06-11
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_order_customer_payment"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders", sa.Column("customer_external_id", sa.String(length=128), nullable=True)
    )
    op.add_column(
        "orders", sa.Column("financial_status", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "orders", sa.Column("fulfillment_status", sa.String(length=64), nullable=True)
    )
    op.create_index(
        "ix_orders_customer_external_id", "orders", ["customer_external_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_orders_customer_external_id", table_name="orders")
    op.drop_column("orders", "fulfillment_status")
    op.drop_column("orders", "financial_status")
    op.drop_column("orders", "customer_external_id")