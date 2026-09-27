"""Add product tracking tables.

Revision ID: 9b7e31a4c2d0
Revises: 2ac5599a1353
Create Date: 2026-09-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9b7e31a4c2d0"
down_revision: Union[str, Sequence[str], None] = "2ac5599a1353"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("marketplace", sa.String(length=20), nullable=False),
        sa.Column("external_id", sa.String(length=64), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("shop_name", sa.String(length=255), nullable=True),
        sa.Column("product_rating", sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column("review_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("current_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("original_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("in_stock", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("tracked_by_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("price_low", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("price_high", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("untracked_since", sa.DateTime(timezone=True), nullable=True),
        sa.Column("top_reviews", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("last_refreshed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("marketplace", "external_id", name="uq_products_marketplace_external_id"),
    )
    # Thêm index cho untracked_since để phục vụ BR15 cleanup job
    op.create_index("idx_products_untracked_since", "products", ["untracked_since"], unique=False)

    op.create_table(
        "price_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX idx_price_history_product_time "
        "ON price_history (product_id, recorded_at DESC)"
    )

    op.create_table(
        "tracked_products",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("target_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("buy_when_good", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "product_id"),
    )


def downgrade() -> None:
    op.drop_table("tracked_products")
    op.drop_index("idx_price_history_product_time", table_name="price_history")
    op.drop_table("price_history")
    op.drop_index("idx_products_untracked_since", table_name="products")
    op.drop_table("products")