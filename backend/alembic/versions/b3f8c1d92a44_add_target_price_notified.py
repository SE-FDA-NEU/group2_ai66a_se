"""Add one-time target-price alert state.

Revision ID: b3f8c1d92a44
Revises: 4a7c52d116b1
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3f8c1d92a44"
down_revision: Union[str, Sequence[str], None] = "4a7c52d116b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tracked_products",
        sa.Column(
            "target_price_notified",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("tracked_products", "target_price_notified")
