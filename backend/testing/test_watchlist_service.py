"""Focused unit tests for issue 78's watchlist creation service."""

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import CustomAppException
from app.schemas.watchlist_schema import MarketplaceProduct, WatchlistCreate
from app.services import watchlist_service as service_module


def _product(*, tracked_by_count=1, price="12.00", untracked_since=None):
    return SimpleNamespace(
        id=31,
        marketplace="amazon",
        external_id="B012345678",
        url="https://www.amazon.com/dp/B012345678",
        name="Sample product",
        image_url="https://example.test/image.jpg",
        shop_name="Sample shop",
        product_rating=Decimal("4.50"),
        review_count=12,
        current_price=Decimal(price),
        original_price=Decimal("15.00"),
        currency="USD",
        in_stock=True,
        tracked_by_count=tracked_by_count,
        price_low=Decimal("10.00"),
        price_high=Decimal("20.00"),
        untracked_since=untracked_since,
    )


def _marketplace_product(price="12.00"):
    return MarketplaceProduct(
        external_id="B012345678",
        url="https://www.amazon.com/dp/B012345678",
        name="Sample product",
        image_url="https://example.test/image.jpg",
        shop_name="Sample shop",
        product_rating=Decimal("4.50"),
        review_count=12,
        current_price=Decimal(price),
        original_price=Decimal("15.00"),
        currency="USD",
        in_stock=True,
    )


class FakeSession:
    def __init__(self):
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def scalar(self, _statement):
        return SimpleNamespace(id=7)

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1

    async def refresh(self, _value):
        return None

    async def flush(self):
        return None


def _common_mocks(monkeypatch, *, product, tracking=None, count=0):
    monkeypatch.setattr(
        service_module, "parse_amazon_link",
        AsyncMock(return_value=SimpleNamespace(url="https://www.amazon.com/dp/B012345678", asin="B012345678")),
    )
    monkeypatch.setattr(service_module.product_crud, "get_by_marketplace_id", AsyncMock(return_value=product))
    monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracking))
    monkeypatch.setattr(service_module.tracked_product_crud, "count_for_user", AsyncMock(return_value=count))
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "create",
        AsyncMock(return_value=SimpleNamespace(target_price=Decimal("9.00"), buy_when_good=False)),
    )


def test_cached_product_adds_tracking_without_marketplace_request(monkeypatch):
    async def scenario():
        product = _product()
        _common_mocks(monkeypatch, product=product, count=4)
        marketplace = AsyncMock()
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        session = FakeSession()

        result = await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), WatchlistCreate(url="https://amazon.com/dp/B012345678", target_price=9)
        )

        marketplace.fetch_product.assert_not_awaited()
        service_module.tracked_product_crud.create.assert_awaited_once()
        assert product.tracked_by_count == 2
        assert result.id == product.id
        assert session.commits == 1

    asyncio.run(scenario())


def test_new_product_is_fetched_and_created_with_initial_price(monkeypatch):
    async def scenario():
        _common_mocks(monkeypatch, product=None)
        product = _product(tracked_by_count=0)
        marketplace = AsyncMock(fetch_product=AsyncMock(return_value=_marketplace_product()))
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        monkeypatch.setattr(
            service_module.product_crud, "create_with_first_price", AsyncMock(return_value=product)
        )
        session = FakeSession()

        result = await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), WatchlistCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_awaited_once_with("B012345678", country="US")
        service_module.product_crud.create_with_first_price.assert_awaited_once()
        assert product.tracked_by_count == 1
        assert result.current_price == Decimal("12.00")
        assert session.commits == 1

    asyncio.run(scenario())


def test_untracked_product_is_refreshed_before_tracking(monkeypatch):
    async def scenario():
        product = _product(tracked_by_count=0)
        _common_mocks(monkeypatch, product=product)
        marketplace = AsyncMock(fetch_product=AsyncMock(return_value=_marketplace_product("11.00")))
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        monkeypatch.setattr(
            service_module.product_crud, "refresh_untracked", AsyncMock(return_value=product)
        )

        await service_module.watchlist_service.add_product(
            FakeSession(), SimpleNamespace(id=7), WatchlistCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_awaited_once_with("B012345678", country="US")
        service_module.product_crud.refresh_untracked.assert_awaited_once()

    asyncio.run(scenario())


def test_tracking_limit_is_enforced_by_backend(monkeypatch):
    async def scenario():
        _common_mocks(monkeypatch, product=None, count=10)
        session = FakeSession()

        with pytest.raises(CustomAppException) as error:
            await service_module.watchlist_service.add_product(
                session, SimpleNamespace(id=7), WatchlistCreate(url="https://amazon.com/dp/B012345678")
            )

        assert error.value.code == "WATCHLIST_LIMIT_REACHED"
        assert session.commits == 0
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_already_tracked_product_is_idempotent(monkeypatch):
    async def scenario():
        product = _product()
        tracking = SimpleNamespace(target_price=Decimal("8.00"), buy_when_good=True)
        _common_mocks(monkeypatch, product=product, tracking=tracking, count=10)
        marketplace = AsyncMock()
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        session = FakeSession()

        result = await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), WatchlistCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_not_awaited()
        service_module.tracked_product_crud.create.assert_not_awaited()
        assert result.target_price == Decimal("8.00")
        assert result.buy_when_good is True
        assert session.commits == 1

    asyncio.run(scenario())
