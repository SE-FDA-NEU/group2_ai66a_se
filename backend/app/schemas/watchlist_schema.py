from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProductCreate(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    target_price: Decimal | None = Field(default=None, gt=0)
    buy_when_good: bool = False

    @model_validator(mode="after")
    def target_price_and_good_price_alert_are_exclusive(self):
        if self.target_price is not None and self.buy_when_good:
            raise ValueError("Choose a target price or 'Buy when price is good', not both.")
        return self


class Product(BaseModel):
    id: int
    name: str
    url: str
    image_url: str
    marketplace: str
    brand: str | None = None
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
    price_label: str | None = None
    fake_discount: bool = False
    fake_discount_percent: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductList(BaseModel):
    total: int
    products: list[Product]


class NotificationItem(BaseModel):
    id: int
    product_id: int | None = None
    kind: str
    title: str
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationList(BaseModel):
    notifications: list[NotificationItem]


class ProductMarketplace(BaseModel):
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
