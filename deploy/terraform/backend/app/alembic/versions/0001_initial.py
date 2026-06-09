"""initial schema

Creates all tables from the SQLAlchemy metadata. Subsequent schema changes
should use ``alembic revision --autogenerate`` to produce explicit diffs.

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-04
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

import app.models  # noqa: F401  (registers all models on Base.metadata)
from app.core.database import Base

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
