"""Add user notification settings and durable deferred email queue."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a61c22b9e405"
down_revision: Union[str, Sequence[str], None] = "b3f8c1d92a44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("quiet_hours_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("quiet_start", sa.String(length=5), nullable=True),
        sa.Column("quiet_end", sa.String(length=5), nullable=True),
        sa.Column("timezone", sa.String(length=64), server_default=sa.text("'Asia/Ho_Chi_Minh'"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "pending_notification_emails",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("current_price", sa.String(length=40), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("product_url", sa.Text(), nullable=False),
        sa.Column("target_price", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_pending_notification_emails_due",
        "pending_notification_emails",
        ["sent_at", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_pending_notification_emails_due", table_name="pending_notification_emails")
    op.drop_table("pending_notification_emails")
    op.drop_table("notification_preferences")
