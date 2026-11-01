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
    def __init__(self, product, tracker_batches=(), distinct_days=7):
        self.product = product
        self.tracker_batches = [list(batch) for batch in tracker_batches]
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
        return FakeScalars(self.tracker_batches.pop(0) if self.tracker_batches else [])

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        return None

    async def get(self, entity_class, ident):
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
        current_price=Decimal("210000"),
        original_price=None,
        currency="VND",
        in_stock=True,
        top_reviews=[],
        price_low=Decimal("189000"),
        price_high=Decimal("230000"),
    )


def test_good_price_transition_creates_one_notification_and_marks_tracker(monkeypatch):
    async def scenario():
        product = _product_snapshot()
        tracker = SimpleNamespace(
            user_id=7,
            good_price_notified=False,
            target_price=None,
            target_price_notified=False,
        )
        initial_session = FakeSession(product)
        update_session = FakeSession(product, tracker_batches=[[tracker], []])
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
                    current_price=Decimal("195000"),
                    original_price=None,
                    currency="VND",
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


def test_us02_tc_005_notify_when_price_equals_target(monkeypatch):
    async def scenario():
        product = _product_snapshot()
        tracker = SimpleNamespace(
            user_id=7,
            target_price=Decimal("195000"),
            target_price_notified=False,
        )
        initial_session = FakeSession(product)
        update_session = FakeSession(
            product, tracker_batches=[[tracker]], distinct_days=5
        )
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
                    current_price=Decimal("195000"),
                    original_price=None,
                    currency="VND",
                    in_stock=True,
                    top_reviews=[],
                )
            ),
        )
        notification = AsyncMock()
        monkeypatch.setattr(monitor_module.notification_crud, "create", notification)

        await PriceMonitorService()._refresh_one(31)

        notification.assert_awaited_once()
        assert notification.await_args.kwargs["kind"] == "target_price_reached"
        assert tracker.target_price_notified is True
        assert update_session.committed is True

    asyncio.run(scenario())


def test_us02_tc_007_no_reached_notification_above_target(monkeypatch):
    async def scenario():
        product = _product_snapshot()
        tracker = SimpleNamespace(
            user_id=7,
            target_price=Decimal("195000"),
            target_price_notified=False,
        )
        initial_session = FakeSession(product)
        # No pending-reached trackers; tracker is not yet in the above-target state.
        update_session = FakeSession(product, tracker_batches=[[], []], distinct_days=5)
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
                    current_price=Decimal("195001"),
                    original_price=None,
                    currency="VND",
                    in_stock=True,
                    top_reviews=[],
                )
            ),
        )
        notification = AsyncMock()
        monkeypatch.setattr(monitor_module.notification_crud, "create", notification)

        await PriceMonitorService()._refresh_one(31)

        notification.assert_not_awaited()
        assert tracker.target_price_notified is False
        assert update_session.committed is True

    asyncio.run(scenario())


def test_us02_tc_006_notify_when_price_rises_above_target(monkeypatch):
    async def scenario():
        product = _product_snapshot()
        tracker = SimpleNamespace(
            user_id=7,
            target_price=Decimal("195000"),
            target_price_notified=True,
        )
        initial_session = FakeSession(product)
        update_session = FakeSession(
            product, tracker_batches=[[], [tracker]], distinct_days=5
        )
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
                    current_price=Decimal("196000"),
                    original_price=None,
                    currency="VND",
                    in_stock=True,
                    top_reviews=[],
                )
            ),
        )
        notification = AsyncMock()
        monkeypatch.setattr(monitor_module.notification_crud, "create", notification)
        email_mock = AsyncMock()
        monkeypatch.setattr(monitor_module, "enqueue_price_email", email_mock)

        await PriceMonitorService()._refresh_one(31)

        notification.assert_awaited_once()
        n_kwargs = notification.await_args.kwargs
        assert n_kwargs["kind"] == "price_above_target"
        assert n_kwargs["title"] == "Giá đã tăng trên mục tiêu"
        assert "195.000 ₫" in n_kwargs["message"]
        assert tracker.target_price_notified is False
        assert update_session.committed is True

        email_mock.assert_awaited_once()
        e_kwargs = email_mock.await_args.kwargs
        assert e_kwargs["kind"] == "price_above_target"
        assert e_kwargs["target_price"] == Decimal("195000")

    asyncio.run(scenario())


def test_N185_MAIL_04_target_price_notification_state_machine_full_sequence(monkeypatch):
    """
    Test complete price sequence (BR2, BR4):
    239,000đ -> 189,000đ (notified) -> 190,000đ (suppressed) -> 196,000đ (above target notified) -> 192,000đ (re-notified).
    Target price: 195,000đ.
    """
    async def scenario():
        product = _product_snapshot()
        product.current_price = Decimal("239000")
        product.currency = "VND"

        tracker = SimpleNamespace(
            user_id=7,
            product_id=31,
            target_price=Decimal("195000"),
            target_price_notified=False,
            good_price_notified=False,
        )

        async def fake_list_pending_target(db, product_id, current_price, for_update=False):
            if (
                tracker.target_price is not None
                and tracker.target_price >= current_price
                and not tracker.target_price_notified
            ):
                return [tracker]
            return []

        async def fake_list_above_target(db, product_id, current_price, for_update=False):
            if (
                tracker.target_price is not None
                and tracker.target_price < current_price
                and tracker.target_price_notified
            ):
                return [tracker]
            return []

        async def fake_mark_notified(db, t):
            t.target_price_notified = True

        async def fake_reset_notified(db, t):
            t.target_price_notified = False

        monkeypatch.setattr(
            monitor_module.tracked_product_crud,
            "list_pending_good_price_trackers",
            AsyncMock(return_value=[]),
        )
        monkeypatch.setattr(
            monitor_module.tracked_product_crud,
            "list_pending_target_price_trackers",
            fake_list_pending_target,
        )
        monkeypatch.setattr(
            monitor_module.tracked_product_crud,
            "list_above_target_price_trackers",
            fake_list_above_target,
        )
        monkeypatch.setattr(
            monitor_module.tracked_product_crud,
            "mark_target_price_notified",
            fake_mark_notified,
        )
        monkeypatch.setattr(
            monitor_module.tracked_product_crud,
            "reset_target_price_notified",
            fake_reset_notified,
        )

        async def fake_record_snapshot(db, p, item):
            p.current_price = item.current_price
            return p

        monkeypatch.setattr(
            monitor_module.product_crud, "record_price_snapshot", fake_record_snapshot
        )

        notifications_log = []
        async def fake_create_notification(db, **kwargs):
            notifications_log.append(kwargs)
            return SimpleNamespace(**kwargs)

        emails_log = []
        async def fake_enqueue_email(db, **kwargs):
            emails_log.append(kwargs)

        monkeypatch.setattr(monitor_module.notification_crud, "create", fake_create_notification)
        monkeypatch.setattr(monitor_module, "enqueue_price_email", fake_enqueue_email)
        monkeypatch.setattr(
            monitor_module.price_stream_service, "publish_price_update", AsyncMock()
        )

        async def run_step(new_price: Decimal):
            step_session_1 = FakeSession(product)
            step_session_2 = FakeSession(product, distinct_days=5)
            sessions = [step_session_1, step_session_2]
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
                        current_price=new_price,
                        original_price=None,
                        currency="VND",
                        in_stock=True,
                        top_reviews=[],
                    )
                ),
            )
            await PriceMonitorService()._refresh_one(31)

        # Step 0: 239,000đ (Initial price above target, tracker.target_price_notified == False)
        await run_step(Decimal("239000"))
        assert len(notifications_log) == 0
        assert len(emails_log) == 0
        assert tracker.target_price_notified is False

        # Step 1: 189,000đ (Price drops <= target 195,000đ -> State 1: Notify)
        await run_step(Decimal("189000"))
        assert len(notifications_log) == 1
        assert notifications_log[-1]["kind"] == "target_price_reached"
        assert notifications_log[-1]["title"] == "Giá mục tiêu đã đạt"
        assert "189.000 ₫" in notifications_log[-1]["message"]
        assert "195.000 ₫" in notifications_log[-1]["message"]
        assert len(emails_log) == 1
        assert emails_log[-1]["kind"] == "target_price_reached"
        assert tracker.target_price_notified is True

        # Step 2: 190,000đ (Fluctuates below target 195,000đ, notified == True -> State 2: Suppressed)
        await run_step(Decimal("190000"))
        assert len(notifications_log) == 1  # No duplicate notification
        assert len(emails_log) == 1
        assert tracker.target_price_notified is True

        # Step 3: 196,000đ (Price rises > target 195,000đ, notified == True -> State 3: Above target alert & reset)
        await run_step(Decimal("196000"))
        assert len(notifications_log) == 2
        assert notifications_log[-1]["kind"] == "price_above_target"
        assert notifications_log[-1]["title"] == "Giá đã tăng trên mục tiêu"
        assert "196.000 ₫" in notifications_log[-1]["message"]
        assert "195.000 ₫" in notifications_log[-1]["message"]
        assert len(emails_log) == 2
        assert emails_log[-1]["kind"] == "price_above_target"
        assert tracker.target_price_notified is False

        # Step 4: 192,000đ (Price drops <= target 195,000đ, notified == False -> State 1: Re-notified)
        await run_step(Decimal("192000"))
        assert len(notifications_log) == 3
        assert notifications_log[-1]["kind"] == "target_price_reached"
        assert notifications_log[-1]["title"] == "Giá mục tiêu đã đạt"
        assert "192.000 ₫" in notifications_log[-1]["message"]
        assert "195.000 ₫" in notifications_log[-1]["message"]
        assert len(emails_log) == 3
        assert emails_log[-1]["kind"] == "target_price_reached"
        assert tracker.target_price_notified is True

    asyncio.run(scenario())


def test_tracked_product_crud_helpers():
    from app.crud.tracked_product_crud import tracked_product_crud

    async def scenario():
        tracker = SimpleNamespace(target_price_notified=True)
        fake_db = FakeSession(None)
        await tracked_product_crud.reset_target_price_notified(fake_db, tracker)
        assert tracker.target_price_notified is False
        assert tracker in fake_db.added

        fake_tracker = SimpleNamespace(
            product_id=31, target_price=Decimal("190000"), target_price_notified=True
        )
        fake_db2 = FakeSession(None, tracker_batches=[[fake_tracker]])
        result = await tracked_product_crud.list_above_target_price_trackers(
            fake_db2, product_id=31, current_price=Decimal("195000")
        )
        assert result == [fake_tracker]

    asyncio.run(scenario())

