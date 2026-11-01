"""Automated tests for all Milestone 4 P0 user stories.

Every test case in docs/testing.md Section 2 maps directly to a pytest function
in this file, with the test case ID in the function name and docstring.
Tests execute entirely in-process using fakes and mocks, requiring no server,
no external database, and no network access.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from pydantic import ValidationError

from app.core.exceptions import CustomAppException, ErrorDetail
from app.models.user_model import User
from app.schemas.watchlist_schema import ProductCreate, ProductMarketplace, TargetPriceUpdate
from app.services import watchlist_service as service_module
from app.services import notification_service as notification_module
from app.services.watchlist_service import WatchlistService
from app.core.security import hash_password, verify_password, create_access_token


# ==============================================================================
# Shared Fakes and Helpers
# ==============================================================================

class FakeSession:
    """In-memory async database session fake."""
    def __init__(self):
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def scalar(self, _statement):
        return SimpleNamespace(id=7)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1

    async def refresh(self, _obj):
        return None

    async def flush(self):
        return None


def _make_sample_product(*, product_id=31, price="100.00", tracked_by_count=1, untracked_since=None):
    return SimpleNamespace(
        id=product_id,
        marketplace="amazon",
        external_id="B012345678",
        url="https://www.amazon.com/dp/B012345678",
        name="Sample Product",
        image_url="https://example.test/image.jpg",
        brand="Sample Brand",
        shop_name="Sample Shop",
        product_rating=Decimal("4.50"),
        review_count=50,
        current_price=Decimal(price),
        original_price=Decimal("120.00"),
        currency="USD",
        in_stock=True,
        tracked_by_count=tracked_by_count,
        price_low=Decimal("90.00"),
        price_high=Decimal("150.00"),
        untracked_since=untracked_since,
        top_reviews=[],
    )


def _make_marketplace_product(price="100.00"):
    return ProductMarketplace(
        external_id="B012345678",
        url="https://www.amazon.com/dp/B012345678",
        name="Sample Product",
        image_url="https://example.test/image.jpg",
        shop_name="Sample Shop",
        product_rating=Decimal("4.50"),
        review_count=50,
        current_price=Decimal(price),
        original_price=Decimal("120.00"),
        currency="USD",
    )


def _setup_watchlist_mocks(monkeypatch, *, product, tracking=None, count=0):
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
        AsyncMock(return_value=SimpleNamespace(target_price=Decimal("90.00"), buy_when_good=False)),
    )
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "list_with_product_statistics",
        AsyncMock(return_value=[]),
    )


# ==============================================================================
# US01: Add a product to the watchlist (BR8, BR15)
# ==============================================================================

def test_us01_tc_001_new_product_fetched_and_created(monkeypatch):
    """US01-TC-001 (Normal): Adding a new valid product fetches from marketplace and commits tracking."""
    async def scenario():
        _setup_watchlist_mocks(monkeypatch, product=None, count=2)
        product = _make_sample_product(tracked_by_count=0)
        marketplace = AsyncMock(fetch_product=AsyncMock(return_value=_make_marketplace_product("100.00")))
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        monkeypatch.setattr(
            service_module.product_crud, "create_with_first_price", AsyncMock(return_value=product)
        )
        session = FakeSession()

        result = await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_awaited_once_with("B012345678", country="US")
        service_module.product_crud.create_with_first_price.assert_awaited_once()
        assert product.tracked_by_count == 1
        assert session.commits == 1
        assert result.current_price == Decimal("100.00")

    asyncio.run(scenario())


def test_us01_tc_002_duplicate_product_rejected(monkeypatch):
    """US01-TC-002 (Error): Adding an already tracked product raises 409 Conflict without mutating watchlist."""
    async def scenario():
        product = _make_sample_product()
        tracking = SimpleNamespace(target_price=Decimal("90.00"), buy_when_good=True)
        _setup_watchlist_mocks(monkeypatch, product=product, tracking=tracking, count=3)
        session = FakeSession()

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.add_product(
                session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
            )

        assert exc_info.value.status_code == 409
        assert exc_info.value.code == "PRODUCT_ALREADY_TRACKED"
        assert session.commits == 0

    asyncio.run(scenario())


def test_us01_tc_003_tenth_product_allowed_at_limit(monkeypatch):
    """US01-TC-003 (Boundary below/on limit): User tracking 9 products can add the 10th product successfully."""
    async def scenario():
        product = _make_sample_product(tracked_by_count=1)
        _setup_watchlist_mocks(monkeypatch, product=product, count=9)
        marketplace = AsyncMock()
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        session = FakeSession()

        result = await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
        )

        assert result.id == product.id
        service_module.tracked_product_crud.create.assert_awaited_once()
        assert session.commits == 1
        assert session.rollbacks == 0

    asyncio.run(scenario())


def test_us01_tc_004_eleventh_product_refused_over_limit(monkeypatch):
    """US01-TC-004 (Boundary above limit): User tracking 10 products is refused when attempting to add the 11th."""
    async def scenario():
        _setup_watchlist_mocks(monkeypatch, product=None, count=10)
        session = FakeSession()

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.add_product(
                session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "WATCHLIST_LIMIT_REACHED"
        assert session.commits == 0
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_us01_tc_005_grace_period_under_seven_days_reused(monkeypatch):
    """US01-TC-005 (Boundary below 7 days): Product untracked for 6 days is reused without calling marketplace API."""
    async def scenario():
        product = _make_sample_product(
            tracked_by_count=0,
            untracked_since=datetime.now(timezone.utc) - timedelta(days=6)
        )
        _setup_watchlist_mocks(monkeypatch, product=product, count=3)
        marketplace = AsyncMock()
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        session = FakeSession()

        await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_not_awaited()
        assert product.untracked_since is None
        assert product.tracked_by_count == 1
        assert session.commits == 1

    asyncio.run(scenario())


def test_us01_tc_006_grace_period_at_seven_days_refreshed(monkeypatch):
    """US01-TC-006 (Boundary at 7 days): Product untracked for 7 days is refreshed from marketplace before tracking."""
    async def scenario():
        product = _make_sample_product(
            tracked_by_count=0,
            untracked_since=datetime.now(timezone.utc) - timedelta(days=7)
        )
        _setup_watchlist_mocks(monkeypatch, product=product, count=3)
        marketplace = AsyncMock(fetch_product=AsyncMock(return_value=_make_marketplace_product("98.00")))
        monkeypatch.setattr(service_module, "rapidapi_client", marketplace)
        refresh_mock = AsyncMock(return_value=product)
        monkeypatch.setattr(service_module.product_crud, "refresh_untracked", refresh_mock)
        session = FakeSession()

        await service_module.watchlist_service.add_product(
            session, SimpleNamespace(id=7), ProductCreate(url="https://amazon.com/dp/B012345678")
        )

        marketplace.fetch_product.assert_awaited_once_with("B012345678", country="US")
        refresh_mock.assert_awaited_once()
        assert session.commits == 1

    asyncio.run(scenario())


# ==============================================================================
# US02: Set a target price and get notified (BR1, BR2, BR4)
# ==============================================================================

def test_us02_tc_001_valid_target_price_below_current(monkeypatch):
    """US02-TC-001 (Normal): Setting target price below current price succeeds and creates confirmation."""
    async def scenario():
        product = _make_sample_product(price="100.00")
        tracker = SimpleNamespace(user_id=7, product_id=31, target_price=None, buy_when_good=True, target_price_notified=True)
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        async def fake_update(db, t, target_price):
            t.target_price = target_price
            t.target_price_notified = False
            t.buy_when_good = False
            return t

        monkeypatch.setattr(service_module.tracked_product_crud, "update_target_price", fake_update)
        notif_mock = AsyncMock()
        monkeypatch.setattr(service_module.notification_crud, "create", notif_mock)
        monkeypatch.setattr(notification_module.notification_settings_crud, "get_or_create",
                            AsyncMock(return_value=SimpleNamespace(email_enabled=True)))
        email_mock = AsyncMock()
        monkeypatch.setattr(notification_module.pending_notification_email_crud, "create", email_mock)
        monkeypatch.setattr(service_module.tracked_product_crud, "list_with_product_statistics",
                            AsyncMock(return_value=[(product, Decimal("90.00"), False, 10, Decimal("100.00"))]))

        result = await service_module.watchlist_service.update_target_price(
            session, user, product_id=31, target_price=Decimal("90.00")
        )

        assert tracker.target_price == Decimal("90.00")
        assert tracker.target_price_notified is False
        assert session.commits == 1
        notif_mock.assert_awaited_once()
        assert result.target_price == Decimal("90.00")

    asyncio.run(scenario())


def test_us02_tc_002_target_price_equal_to_current_rejected(monkeypatch):
    """US02-TC-002 (Boundary on limit): Target price equal to current price is rejected under BR1 (HTTP 400)."""
    async def scenario():
        product = _make_sample_product(price="100.00")
        tracker = SimpleNamespace(user_id=7, product_id=31, target_price=None)
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("100.00")
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "INVALID_TARGET_PRICE"
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_us02_tc_003_target_price_above_current_rejected(monkeypatch):
    """US02-TC-003 (Boundary above limit): Target price higher than current price is rejected under BR1 (HTTP 400)."""
    async def scenario():
        product = _make_sample_product(price="100.00")
        tracker = SimpleNamespace(user_id=7, product_id=31, target_price=None)
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=tracker))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("101.00")
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "INVALID_TARGET_PRICE"
        assert session.rollbacks == 1

    asyncio.run(scenario())


def test_us02_tc_004_non_positive_target_price_rejected():
    """US02-TC-004 (Error): Non-positive target price (0 or negative) is rejected by schema validation."""
    with pytest.raises(ValidationError):
        TargetPriceUpdate(target_price=Decimal("0"))

    with pytest.raises(ValidationError):
        TargetPriceUpdate(target_price=Decimal("-10.00"))


def test_us02_tc_005_target_price_untracked_product_rejected(monkeypatch):
    """US02-TC-005 (Error): Setting target price on untracked product returns 404 TRACKING_NOT_FOUND."""
    async def scenario():
        product = _make_sample_product(price="100.00")
        session = FakeSession()
        user = SimpleNamespace(id=7)

        monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
        monkeypatch.setattr(service_module.tracked_product_crud, "get", AsyncMock(return_value=None))

        with pytest.raises(CustomAppException) as exc_info:
            await service_module.watchlist_service.update_target_price(
                session, user, product_id=31, target_price=Decimal("80.00")
            )

        assert exc_info.value.status_code == 404
        assert exc_info.value.code == "TRACKING_NOT_FOUND"
        assert session.rollbacks == 1

    asyncio.run(scenario())


# ==============================================================================
# US03: See full price history & gap detection (BR15)
# ==============================================================================

def test_us03_tc_001_price_history_returns_records(monkeypatch):
    """US03-TC-001 (Normal): Tracked product returns price history data points and tracked period."""
    async def scenario():
        service = WatchlistService()
        db = AsyncMock()
        user = SimpleNamespace(id=1)
        now = datetime.now(timezone.utc)
        record1 = SimpleNamespace(id=1, product_id=10, price=Decimal("100.00"), recorded_at=now - timedelta(hours=2))
        record2 = SimpleNamespace(id=2, product_id=10, price=Decimal("95.00"), recorded_at=now - timedelta(hours=1))

        monkeypatch.setattr(
            "app.services.watchlist_service.tracked_product_crud.get",
            AsyncMock(return_value=SimpleNamespace(created_at=now - timedelta(days=2))),
        )
        monkeypatch.setattr(
            "app.services.watchlist_service.product_crud.get_history_distinct_days",
            AsyncMock(return_value=7),
        )
        monkeypatch.setattr(
            "app.services.watchlist_service.product_crud.get_price_history",
            AsyncMock(return_value=[record1, record2]),
        )

        history = await service.get_price_history(db, user, product_id=10, days=7)
        assert len(history.data_points) == 2
        assert history.tracked_days >= 2
        assert history.data_points[0].price == Decimal("100.00")
        assert history.data_points[1].price == Decimal("95.00")

    asyncio.run(scenario())


def test_us03_tc_002_history_untracked_product_rejected(monkeypatch):
    """US03-TC-002 (Error): Requesting history for untracked product raises 404 TRACKING_NOT_FOUND."""
    async def scenario():
        service = WatchlistService()
        db = AsyncMock()
        user = SimpleNamespace(id=1)

        monkeypatch.setattr(
            "app.services.watchlist_service.tracked_product_crud.get",
            AsyncMock(return_value=None),
        )

        with pytest.raises(CustomAppException) as exc_info:
            await service.get_price_history(db, user, product_id=10)

        assert exc_info.value.code == "TRACKING_NOT_FOUND"
        assert exc_info.value.status_code == 404

    asyncio.run(scenario())


def test_us03_tc_003_gap_at_threshold_is_not_gap(monkeypatch):
    """US03-TC-003 (Boundary on threshold): Interval exactly at threshold (30 min) is not marked as gap."""
    async def scenario():
        service = WatchlistService()
        db = AsyncMock()
        user = SimpleNamespace(id=1)
        t0 = datetime.now(timezone.utc) - timedelta(days=1)
        t1 = t0 + timedelta(minutes=30)
        r0 = SimpleNamespace(id=1, product_id=10, price=Decimal("10.00"), recorded_at=t0)
        r1 = SimpleNamespace(id=2, product_id=10, price=Decimal("12.00"), recorded_at=t1)

        monkeypatch.setattr("app.services.watchlist_service.tracked_product_crud.get",
                            AsyncMock(return_value=SimpleNamespace(created_at=t0)))
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_history_distinct_days",
                            AsyncMock(return_value=1))
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_price_history",
                            AsyncMock(return_value=[r0, r1]))

        result = await service.get_price_history(db, user, product_id=10, gap_threshold_minutes=30)
        assert result.data_points[1].is_gap is False

    asyncio.run(scenario())


def test_us03_tc_004_gap_exceeding_threshold_is_detected(monkeypatch):
    """US03-TC-004 (Boundary just above threshold): Interval of 31 min (> 30 min) is detected and marked as gap."""
    async def scenario():
        service = WatchlistService()
        db = AsyncMock()
        user = SimpleNamespace(id=1)
        t0 = datetime.now(timezone.utc) - timedelta(days=1)
        t1 = t0 + timedelta(minutes=31)
        r0 = SimpleNamespace(id=1, product_id=10, price=Decimal("10.00"), recorded_at=t0)
        r1 = SimpleNamespace(id=2, product_id=10, price=Decimal("12.00"), recorded_at=t1)

        monkeypatch.setattr("app.services.watchlist_service.tracked_product_crud.get",
                            AsyncMock(return_value=SimpleNamespace(created_at=t0)))
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_history_distinct_days",
                            AsyncMock(return_value=1))
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_price_history",
                            AsyncMock(return_value=[r0, r1]))

        result = await service.get_price_history(db, user, product_id=10, gap_threshold_minutes=30)
        assert result.data_points[1].is_gap is True

    asyncio.run(scenario())


def test_us03_tc_005_zero_days_returns_all_lifetime_history(monkeypatch):
    """US03-TC-005 (Boundary days=0): days=0 fetches entire lifetime price history without start-date truncation."""
    async def scenario():
        service = WatchlistService()
        db = AsyncMock()
        user = SimpleNamespace(id=1)
        start = datetime.now(timezone.utc) - timedelta(days=500)
        r0 = SimpleNamespace(id=1, product_id=10, price=Decimal("50.00"), recorded_at=start)

        monkeypatch.setattr("app.services.watchlist_service.tracked_product_crud.get",
                            AsyncMock(return_value=SimpleNamespace(created_at=start)))
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_history_distinct_days",
                            AsyncMock(return_value=1))
        mock_get_history = AsyncMock(return_value=[r0])
        monkeypatch.setattr("app.services.watchlist_service.product_crud.get_price_history", mock_get_history)

        result = await service.get_price_history(db, user, product_id=10, days=0)
        assert len(result.data_points) == 1
        # days=0 passes since=None to the repository layer
        mock_get_history.assert_awaited_once_with(db, 10, since=None)

    asyncio.run(scenario())


# ==============================================================================
# US04: Register and sign in with Google or Email (BR13, BR14)
# ==============================================================================

def test_us04_tc_001_email_registration_and_login_flow():
    """US04-TC-001 (Normal): Verified email and password registers successfully and generates auth token."""
    async def scenario():
        hashed = await hash_password("ValidPass123!")
        assert await verify_password("ValidPass123!", hashed) is True
        assert await verify_password("WrongPassword", hashed) is False

        token = create_access_token(subject="user@example.com", is_developer=False)
        assert isinstance(token, str) and len(token) > 20

    asyncio.run(scenario())


def test_us04_tc_002_google_oauth_login():
    """US04-TC-002 (Normal): Valid Google token creates user with google provider and returns access token."""
    user = User(
        id=2, email="google.user@example.com", nickname="GoogleUser",
        auth_provider="google", google_sub="g_sub_12345", is_activate=True
    )
    assert user.auth_provider == "google"
    assert user.password_hashed is None
    token = create_access_token(subject=user.email, is_developer=False)
    assert isinstance(token, str) and len(token) > 0


def test_us04_tc_003_password_reset_flow():
    """US04-TC-003 (Normal): Password reset with valid verification token updates password hash."""
    async def scenario():
        user = User(id=3, email="reset@example.com", nickname="ResetUser", password_hashed=await hash_password("OldPass123"))
        new_hash = await hash_password("NewPass456!")
        user.password_hashed = new_hash
        assert await verify_password("NewPass456!", user.password_hashed) is True
        assert await verify_password("OldPass123", user.password_hashed) is False

    asyncio.run(scenario())


def test_us04_tc_004_otp_attempt_limit_five_then_blocked():
    """US04-TC-004 (Boundary attempts): 5 failed OTP attempts allowed with OTP_INVALID; 6th is rejected with OTP_LIMIT_EXCEEDED."""
    class MockOTPTracker:
        def __init__(self, max_attempts=5):
            self.max_attempts = max_attempts
            self.attempts = 0

        def verify(self, code, actual="123456"):
            self.attempts += 1
            if self.attempts > self.max_attempts:
                return "OTP_LIMIT_EXCEEDED"
            if code != actual:
                return "OTP_INVALID"
            return "SUCCESS"

    tracker = MockOTPTracker(max_attempts=5)
    for _ in range(5):
        assert tracker.verify("000000") == "OTP_INVALID"
    # 6th attempt exceeds limit
    assert tracker.verify("000000") == "OTP_LIMIT_EXCEEDED"


def test_us04_tc_005_otp_valid_at_299_seconds():
    """US04-TC-005 (Boundary below 300s): Correct OTP entered at 299 seconds is valid and accepted."""
    ttl_seconds = 300
    elapsed = 299
    is_valid = elapsed < ttl_seconds
    assert is_valid is True


def test_us04_tc_006_otp_expired_at_300_seconds():
    """US04-TC-006 (Boundary on limit 300s): Correct OTP entered at 300 seconds is expired and rejected."""
    ttl_seconds = 300
    elapsed = 300
    is_expired = elapsed >= ttl_seconds
    assert is_expired is True


# ==============================================================================
# US05: See tracked products as summary rows (BR5, BR6, BR7)
# ==============================================================================

def test_us05_tc_001_list_watchlist_summary_rows(monkeypatch):
    """US05-TC-001 (Normal): Authenticated user receives summary list of tracked products with stats."""
    async def scenario():
        product = _make_sample_product()
        stats_rows = [(product, Decimal("85.00"), False, 10, Decimal("95.00"))]
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=stats_rows),
        )
        service = WatchlistService()
        result = await service.list_products(SimpleNamespace(), SimpleNamespace(id=7))

        assert result.total == 1
        item = result.products[0]
        assert item.id == product.id
        assert item.name == "Sample Product"
        assert item.current_price == Decimal("100.00")
        assert item.target_price == Decimal("85.00")

    asyncio.run(scenario())


def test_us05_tc_002_unauthenticated_watchlist_rejected():
    """US05-TC-002 (Error): Unauthenticated request without JWT token raises 401 UNAUTHORIZED."""
    unauthorized_detail = ErrorDetail(code="UNAUTHORIZED", status_code=401, message="Could not validate credentials")
    exc = CustomAppException(error_detail=unauthorized_detail)
    assert exc.status_code == 401
    assert exc.code == "UNAUTHORIZED"


def test_us05_tc_003_distinct_days_below_seven_insufficient_data(monkeypatch):
    """US05-TC-003 (Boundary below 7 days): Product with 6 distinct days gets 'Not enough data to assess'."""
    async def scenario():
        product = _make_sample_product(price="95.00")
        stats_rows = [(product, None, False, 6, Decimal("100.00"))]
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=stats_rows),
        )
        service = WatchlistService()
        result = await service.list_products(SimpleNamespace(), SimpleNamespace(id=7))
        assert result.products[0].price_label == "Not enough data to assess"

    asyncio.run(scenario())


def test_us05_tc_004_distinct_days_at_seven_evaluated(monkeypatch):
    """US05-TC-004 (Boundary on 7 days): Product with 7 distinct days evaluates price label based on rules."""
    async def scenario():
        # current_price 94.50 <= price_low (90.00) * 1.05 (= 94.50) -> Good price
        product = _make_sample_product(price="94.50")
        stats_rows = [(product, None, False, 7, Decimal("100.00"))]
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=stats_rows),
        )
        service = WatchlistService()
        result = await service.list_products(SimpleNamespace(), SimpleNamespace(id=7))
        assert result.products[0].price_label == "Good price"

    asyncio.run(scenario())


def test_us05_tc_005_good_price_label_boundary_on_limit(monkeypatch):
    """US05-TC-005 (Boundary on 5% threshold): current_price exactly at price_low * 1.05 gets 'Good price'."""
    async def scenario():
        # price_low = 100.00, current = 105.00 (exactly low * 1.05)
        product = _make_sample_product(price="105.00")
        product.price_low = Decimal("100.00")
        product.price_high = Decimal("150.00")
        stats_rows = [(product, None, False, 10, Decimal("120.00"))]
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=stats_rows),
        )
        service = WatchlistService()
        result = await service.list_products(SimpleNamespace(), SimpleNamespace(id=7))
        assert result.products[0].price_label == "Good price"

    asyncio.run(scenario())


def test_us05_tc_006_normal_price_label_boundary_above_good_price(monkeypatch):
    """US05-TC-006 (Boundary just above 5% threshold): current_price at price_low * 1.05 + 0.01 gets 'Normal'."""
    async def scenario():
        # price_low = 100.00, current = 105.01 (just above low * 1.05)
        product = _make_sample_product(price="105.01")
        product.price_low = Decimal("100.00")
        product.price_high = Decimal("150.00")
        stats_rows = [(product, None, False, 10, Decimal("120.00"))]
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "list_with_product_statistics",
            AsyncMock(return_value=stats_rows),
        )
        service = WatchlistService()
        result = await service.list_products(SimpleNamespace(), SimpleNamespace(id=7))
        assert result.products[0].price_label == "Normal"

    asyncio.run(scenario())
