"""Add persisted notifications and one-time good-price alert state.

Revision ID: 4a7c52d116b1
Revises: 9b7e31a4c2d0
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4a7c52d116b1"
down_revision: Union[str, Sequence[str], None] = "9b7e31a4c2d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tracked_products",
        sa.Column(
            "good_price_notified",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_table(
        "user_notifications",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_user_notifications_user_id_id",
        "user_notifications",
        ["user_id", "id"],
    )


def downgrade() -> None:
    op.drop_index("idx_user_notifications_user_id_id", table_name="user_notifications")
    op.drop_table("user_notifications")
    op.drop_column("tracked_products", "good_price_notified")
