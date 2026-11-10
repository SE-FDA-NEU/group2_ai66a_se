"""Store rich product details and their retrieval time."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e9a2b3c4d5f6"
down_revision = "d8e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("details", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("products", sa.Column("details_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("products", "details_updated_at")
    op.drop_column("products", "details")
