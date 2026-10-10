from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class Product(Base):
    """Marketplace product snapshot and cached price statistics."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("marketplace", "external_id", name="uq_products_marketplace_external_id"),
        Index("idx_products_untracked_since", "untracked_since"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    marketplace = Column(String(20), nullable=False)
    external_id = Column(String(64), nullable=False)
    url = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    image_url = Column(Text, nullable=False)
    brand = Column(String(255), nullable=True)
    shop_name = Column(String(255), nullable=True)
    product_rating = Column(Numeric(3, 2), nullable=True)
    review_count = Column(Integer, nullable=False, server_default=text("0"))
    current_price = Column(Numeric(12, 2), nullable=False)
    original_price = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(10), nullable=False)
    in_stock = Column(Boolean, nullable=False, server_default=text("true"))
    tracked_by_count = Column(Integer, nullable=False, server_default=text("0"))
    price_low = Column(Numeric(12, 2), nullable=False)
    price_high = Column(Numeric(12, 2), nullable=False)
    untracked_since = Column(DateTime(timezone=True), nullable=True)
    top_reviews = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    last_refreshed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class PriceHistory(Base):
    """Append-only observations of a product's selling price."""

    __tablename__ = "price_history"
    __table_args__ = (
        Index("idx_price_history_product_time", "product_id", text("recorded_at DESC")),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class TrackedProduct(Base):
    """User-to-product tracking settings; composite PK prevents duplicate tracking."""

    __tablename__ = "tracked_products"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    target_price = Column(Numeric(12, 2), nullable=True)
    buy_when_good = Column(Boolean, nullable=False, server_default=text("false"))
    good_price_notified = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class UserNotification(Base):
    """Durable in-app notification for a user's tracked products."""

    __tablename__ = "user_notifications"
    __table_args__ = (Index("idx_user_notifications_user_id_id", "user_id", "id"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    kind = Column(String(32), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
