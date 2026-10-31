"""Convert existing USD products, history, and targets to VND.

Revision ID: d8e1f2a3b4c5
Revises: c7e1a9d2f3b4
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c7e1a9d2f3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert any existing USD products to VND at 25800 rate
    op.execute(
        """
        UPDATE price_history
        SET price = ROUND(price * 25800)
        WHERE product_id IN (SELECT id FROM products WHERE UPPER(currency) = 'USD');
        """
    )
    op.execute(
        """
        UPDATE tracked_products
        SET target_price = ROUND(target_price * 25800)
        WHERE product_id IN (SELECT id FROM products WHERE UPPER(currency) = 'USD')
          AND target_price IS NOT NULL;
        """
    )
    op.execute(
        """
        UPDATE products
        SET current_price = ROUND(current_price * 25800),
            original_price = CASE WHEN original_price IS NOT NULL THEN ROUND(original_price * 25800) ELSE NULL END,
            price_low = ROUND(price_low * 25800),
            price_high = ROUND(price_high * 25800),
            currency = 'VND'
        WHERE UPPER(currency) = 'USD';
        """
    )


def downgrade() -> None:
    pass

