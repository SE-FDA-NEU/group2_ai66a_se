import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import app.services.price_monitor_service as monitor_module
from app.services.price_monitor_service import PriceMonitorService


@pytest.mark.parametrize(
    ("current_price", "lowest_price", "expected"),
    [
        ("195000", "189000", True),
        ("198450", "189000", True),
        ("198451", "189000", False),
    ],
)
def test_good_price_uses_inclusive_five_percent_threshold(
    current_price, lowest_price, expected
):
    assert PriceMonitorService.is_good_price(
        Decimal(current_price), Decimal(lowest_price)
    ) is expected


class FakeScalars:
    def __init__(self, values):
        self.values = values

    def __iter__(self):
        return iter(self.values)


class FakeSession:
    def __init__(self, product, trackers=(), distinct_days=7):
        self.product = product
        self.trackers = trackers
        self.distinct_days = distinct_days
        self.scalar_calls = 0
        self.added = []
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def scalar(self, _statement):
        self.scalar_calls += 1
        return self.product if self.scalar_calls == 1 else self.distinct_days

    async def scalars(self, _statement):
        return FakeScalars(self.trackers)

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        return None

    async def commit(self):
        self.committed = True


def _product_snapshot():
    return SimpleNamespace(
        id=31,
        external_id="B012345678",
        tracked_by_count=1,
        name="Sample product",
        url="https://amazon.com/dp/B012345678",
        image_url="https://example.test/image.jpg",
        brand="Example",
        shop_name="Shop",
        product_rating=Decimal("4.5"),
        review_count=12,
        current_price=Decimal("210.00"),
        original_price=None,
        currency="USD",
        in_stock=True,
        top_reviews=[],
        price_low=Decimal("189.00"),
        price_high=Decimal("230.00"),
    )


def test_good_price_transition_creates_one_notification_and_marks_tracker(monkeypatch):
    async def scenario():
        product = _product_snapshot()
        tracker = SimpleNamespace(user_id=7, good_price_notified=False)
        initial_session = FakeSession(product)
        update_session = FakeSession(product, [tracker])
        sessions = [initial_session, update_session]
        monkeypatch.setattr(monitor_module, "AsyncSessionLocal", lambda: sessions.pop(0))
        monkeypatch.setattr(
            monitor_module.rapidapi_client,
            "fetch_product",
            AsyncMock(
                return_value=SimpleNamespace(
                    external_id="B012345678",
                    url=product.url,
                    name=product.name,
                    image_url=product.image_url,
                    brand=product.brand,
                    shop_name=product.shop_name,
                    product_rating=product.product_rating,
                    review_count=product.review_count,
                    current_price=Decimal("195.00"),
                    original_price=None,
                    currency="USD",
                    in_stock=True,
                    top_reviews=[],
                )
            ),
        )
        notification = AsyncMock()
        monkeypatch.setattr(monitor_module.notification_crud, "create", notification)

        await PriceMonitorService()._refresh_one(31)

        notification.assert_awaited_once()
        assert notification.await_args.kwargs["kind"] == "good_price"
        assert tracker.good_price_notified is True
        assert update_session.committed is True

    asyncio.run(scenario())
