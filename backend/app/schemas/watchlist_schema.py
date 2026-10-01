from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WatchlistCreate(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    target_price: Decimal | None = Field(default=None, gt=0)
    buy_when_good: bool = False


class WatchlistProduct(BaseModel):
    id: int
    name: str
    image_url: str
    shop_name: str | None = None
    product_rating: Decimal | None = None
    review_count: int
    current_price: Decimal
    original_price: Decimal | None = None
    currency: str
    in_stock: bool
    price_low: Decimal
    price_high: Decimal
    target_price: Decimal | None = None
    buy_when_good: bool

    model_config = ConfigDict(from_attributes=True)


class MarketplaceProduct(BaseModel):
    """Normalized product payload expected from a marketplace provider."""

    external_id: str = Field(min_length=1, max_length=64)
    url: str
    name: str
    image_url: str
    brand: str | None = None
    shop_name: str | None = None
    product_rating: Decimal | None = Field(default=None, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    current_price: Decimal = Field(gt=0)
    original_price: Decimal | None = Field(default=None, gt=0)
    currency: str = Field(min_length=1, max_length=10)
    in_stock: bool = True
    top_reviews: list[dict[str, Any]] = Field(default_factory=list)
