"""add updated_at to product_landing_costs

The shared ``Base`` adds ``created_at`` AND ``updated_at`` to every model, but
migration ``0004`` hand-wrote the ``product_landing_costs`` columns and only
created ``created_at``. The ORM then SELECTs ``updated_at`` (inherited from
Base), which the table lacks → every ``/costs`` request 500s. This adds the
missing column to match ``Base``.

Idempotent (``IF NOT EXISTS``) so it's a safe no-op if the column was already
added out-of-band as a hotfix. Targets PostgreSQL (the production DB); local dev
builds the schema via ``create_all``, not these migrations.

Revision ID: 0005_landing_cost_updated_at
Revises: 0004_product_landing_costs
Create Date: 2026-06-13
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0005_landing_cost_updated_at"
down_revision: Union[str, None] = "0004_product_landing_costs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE product_landing_costs "
        "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE "
        "NOT NULL DEFAULT now()"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE product_landing_costs DROP COLUMN IF EXISTS updated_at")
