"""Unit tests for setting and updating target price (US02 - BR1)."""

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.core.exceptions import CustomAppException
from app.schemas.watchlist_schema import TargetPriceUpdate
from app.services import watchlist_service as service_module


def _product(*, product_id=31, price="195.00", currency="USD", name="Sample product"):
    return SimpleNamespace(
        id=product_id,
        marketplace="amazon",
        external_id="B012345678",
        url="https://www.amazon.com/dp/B012345678",
        name=name,
        image_url="https://example.test/image.jpg",
        brand="Sample brand",
        shop_name="Sample shop",
        product_rating=Decimal("4.50"),
        review_count=12,
        current_price=Decimal(price),
        original_price=Decimal("220.00"),
        currency=currency,
        in_stock=True,
        tracked_by_count=1,
        price_low=Decimal("189.00"),
        price_high=Decimal("250.00"),
        untracked_since=None,
    )


class FakeSession:
    def __init__(self):
        self.added = []
        self.commits = 0
        self.rollbacks = 0

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


def test_us02_tc_004_reject_non_positive_target_price():
    # Valid positive target price
    update = TargetPriceUpdate(target_price=Decimal("150.00"))
    assert update.target_price == Decimal("150.00")

    # Reject zero
    with pytest.raises(ValidationError):
        TargetPriceUpdate(target_price=Decimal("0"))

    # Reject negative
    with pytest.raises(ValidationError):
        TargetPriceUpdate(target_price=Decimal("-10.00"))


def test_us02_tc_001_set_valid_target_price(monkeypatch):
    async def scenario():
        product = _product(price="195.00", currency="USD")
        tracker = SimpleNamespace(
            user_id=7,
            product_id=31,
            target_price=None,
            buy_when_good=True,
            target_price_notified=True,
        )

        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        async def fake_update_target_price(db, t, target_price):
            t.target_price = target_price
            t.target_price_notified = False
            t.buy_when_good = False
            return t

        monkeypatch.setattr(
            service_module.tracked_product_crud, "update_target_price", fake_update_target_price
        )
        notification_mock = AsyncMock()
        monkeypatch.setattr(service_module.notification_crud, "create", notification_mock)
        email_mock = AsyncMock()
        monkeypatch.setattr(service_module, "enqueue_price_email", email_mock)

        stats_row = (product, Decimal("180.00"), False, 10, Decimal("192.00"))
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=[stats_row]),
        )

        result = await service_module.watchlist_service.update_target_price(
            session, user, product_id=31, target_price=Decimal("180.00")
        )

        assert tracker.target_price == Decimal("180.00")
        assert tracker.target_price_notified is False
        assert tracker.buy_when_good is False
        assert session.commits == 1

        notification_mock.assert_awaited_once()
        n_kwargs = notification_mock.await_args.kwargs
        assert n_kwargs["kind"] == "target_price_set"
        assert n_kwargs["user_id"] == 7
        assert n_kwargs["product_id"] == 31
        assert "180.00 USD" in n_kwargs["message"]

        email_mock.assert_awaited_once()
        e_kwargs = email_mock.await_args.kwargs
        assert e_kwargs["kind"] == "target_price_set"
        assert e_kwargs["target_price"] == Decimal("180.00")

        assert result.target_price == Decimal("180.00")

    asyncio.run(scenario())


def test_us02_tc_002_reject_target_equal_to_current_price(monkeypatch):
    async def scenario():
        product = _product(price="195.00", currency="USD")
        tracker = SimpleNamespace(user_id=7, product_id=31, target_price=None)
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("195.00")
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "INVALID_TARGET_PRICE"
        assert exc_info.value.detail == "Giá mục tiêu phải thấp hơn giá hiện tại (195.00 USD)."
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_us02_tc_003_reject_target_above_current_price(monkeypatch):
    async def scenario():
        product = _product(price="195.00", currency="USD")
        tracker = SimpleNamespace(user_id=7, product_id=31, target_price=None)
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("200.00")
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "INVALID_TARGET_PRICE"
        assert exc_info.value.detail == "Giá mục tiêu phải thấp hơn giá hiện tại (195.00 USD)."
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_update_target_price_not_found_when_product_missing(monkeypatch):
    async def scenario():
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=None))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=999, target_price=Decimal("150.00")
            )

        assert exc_info.value.status_code == 404
        assert exc_info.value.code == "TRACKING_NOT_FOUND"
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_update_target_price_not_found_when_not_tracked(monkeypatch):
    async def scenario():
        product = _product(price="195.00")
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=None))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("150.00")
            )

        assert exc_info.value.status_code == 404
        assert exc_info.value.code == "TRACKING_NOT_FOUND"
        assert session.rollbacks == 1

    asyncio.run(scenario())

