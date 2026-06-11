"""resumable customer backfill marker

Stores the Shopify ``since_id`` high-water mark so a large customer backfill can
resume where it stopped instead of restarting from page 1.

Revision ID: 0003_customer_since_id
Revises: 0002_order_customer_payment
Create Date: 2026-06-11
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_customer_since_id"
down_revision: Union[str, None] = "0002_order_customer_payment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "integrations", sa.Column("customer_since_id", sa.BigInteger(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("integrations", "customer_since_id")