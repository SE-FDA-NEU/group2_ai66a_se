import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import app.services.watchlist_service as service_module
from app.services.watchlist_service import WatchlistService


def _product(*, current_price="195.00", original_price="239.00", price_low="189.00"):
    return SimpleNamespace(
        id=1,
        name="Tracked product",
        image_url="https://example.test/product.jpg",
        shop_name="Example shop",
        product_rating=Decimal("4.50"),
        review_count=10,
        current_price=Decimal(current_price),
        original_price=Decimal(original_price) if original_price else None,
        currency="USD",
        in_stock=True,
        price_low=Decimal(price_low),
        price_high=Decimal("300.00"),
    )


def test_list_products_returns_not_enough_data_before_seven_days(monkeypatch):
    async def scenario():
        db = SimpleNamespace()
        service_rows = AsyncMock(
            return_value=[
                (_product(), Decimal("100.00"), False, 6, Decimal("195.00"))
            ]
        )
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            service_rows,
        )

        product_list = await WatchlistService().list_products(db, SimpleNamespace(id=7))

        assert product_list.total == 1
        assert product_list.products[0].price_label == "Not enough data to assess"
        assert product_list.products[0].fake_discount is False
        assert product_list.products[0].fake_discount_percent is None
        service_rows.assert_awaited_once_with(db, 7)
        print("Watchlist with insufficient history:", product_list.model_dump(mode="json"))

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("current_price", "expected_label"),
    [
        ("195.00", "Good price"),
        ("205.00", "Normal"),
        ("239.00", "Expensive - wait"),
    ],
)
def test_list_products_computes_price_label(current_price, expected_label, monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(
                return_value=[
                    (
                        _product(current_price=current_price),
                        None,
                        False,
                        7,
                        Decimal("195.00"),
                    )
                ]
            ),
        )

        product_list = await WatchlistService().list_products(
            SimpleNamespace(), SimpleNamespace(id=7)
        )

        assert product_list.products[0].price_label == expected_label
        print(
            "Watchlist price assessment:",
            {"current_price": current_price, "price_label": product_list.products[0].price_label},
        )

    asyncio.run(scenario())


def test_list_products_marks_fake_discount_and_percentage(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(
                return_value=[
                    (
                        _product(current_price="239.00", original_price="399.00"),
                        None,
                        False,
                        7,
                        Decimal("195.00"),
                    )
                ]
            ),
        )

        product_list = await WatchlistService().list_products(
            SimpleNamespace(), SimpleNamespace(id=7)
        )

        assert product_list.products[0].fake_discount is True
        assert product_list.products[0].fake_discount_percent == Decimal("22.56")
        print("Watchlist discount assessment:", product_list.model_dump(mode="json"))

    asyncio.run(scenario())
