"""Add seen_at to user_notifications for server-side toast dedup.

Revision ID: c7e1a9d2f3b4
Revises: a61c22b9e405
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7e1a9d2f3b4"
down_revision: Union[str, Sequence[str], None] = "a61c22b9e405"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_notifications",
        sa.Column("seen_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_notifications", "seen_at")
