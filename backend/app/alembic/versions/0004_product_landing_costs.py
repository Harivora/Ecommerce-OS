"""product landing costs (effective-dated COGS per SKU)

Adds ``product_landing_costs`` — the manual, admin-entered real landed cost per
SKU, kept as effective-dated history so past orders stay locked to the cost in
effect on their date.

Only creates a new (empty) table + its own indexes, so it applies instantly and
without locking any existing table — safe to run on a live RDS during a deploy.
(A separate ``order_items(sku)`` index can speed up the per-SKU re-stamp on very
large stores; create it out-of-band with ``CREATE INDEX CONCURRENTLY`` if needed
— deliberately kept out of this deploy migration to avoid a write-blocking lock.)

Revision ID: 0004_product_landing_costs
Revises: 0003_customer_since_id
Create Date: 2026-06-12
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_product_landing_costs"
down_revision: Union[str, None] = "0003_customer_since_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_landing_costs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("note", sa.String(length=512), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id", "sku", "effective_from",
            name="uq_landing_cost_org_sku_date",
        ),
    )
    op.create_index(
        "ix_product_landing_costs_organization_id",
        "product_landing_costs", ["organization_id"],
    )
    op.create_index(
        "ix_product_landing_costs_sku", "product_landing_costs", ["sku"]
    )
    op.create_index(
        "ix_product_landing_costs_effective_from",
        "product_landing_costs", ["effective_from"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_product_landing_costs_effective_from", table_name="product_landing_costs"
    )
    op.drop_index(
        "ix_product_landing_costs_sku", table_name="product_landing_costs"
    )
    op.drop_index(
        "ix_product_landing_costs_organization_id", table_name="product_landing_costs"
    )
    op.drop_table("product_landing_costs")
