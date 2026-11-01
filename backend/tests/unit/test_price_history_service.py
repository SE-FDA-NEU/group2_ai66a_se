from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import CustomAppException
from app.models.user_model import User
from app.services.watchlist_service import WatchlistService


def _user(user_id=1):
    return User(
        id=user_id,
        email="test@example.com",
        nickname="Test User",
        password_hashed="secret",
    )


def _price_record(price: str, recorded_at: datetime, record_id: int = 1):
    return SimpleNamespace(
        id=record_id,
        product_id=10,
        price=Decimal(price),
        recorded_at=recorded_at,
    )


@pytest.mark.asyncio
async def test_us03_tc_004_untracked_product_raises_tracking_not_found(monkeypatch):
    """US03-TC-004: Reject history requests for products the user does not track."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=None),
    )

    with pytest.raises(CustomAppException) as exc_info:
        await service.get_price_history(db, user, product_id=10)

    assert exc_info.value.code == "TRACKING_NOT_FOUND"
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_us03_tc_007_empty_price_history(monkeypatch):
    """US03-TC-007: Return an empty chart when tracking has no price records."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=2),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=[]),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert result.min_price is None
    assert result.max_price is None
    assert result.tracked_days == 2
    assert result.data_points == []


@pytest.mark.asyncio
async def test_us03_tc_008_single_price_point(monkeypatch):
    """US03-TC-008: Return one valid record without inventing a gap."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    now = datetime.now(timezone.utc)
    records = [_price_record("199.00", now, record_id=1)]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=1),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert result.min_price == Decimal("199.00")
    assert result.max_price == Decimal("199.00")
    assert result.tracked_days == 1
    assert len(result.data_points) == 1
    assert result.data_points[0].price == Decimal("199.00")
    assert result.data_points[0].is_gap is False


@pytest.mark.asyncio
async def test_us03_tc_001_history_returns_tracked_period_and_price_records(monkeypatch):
    """US03-TC-001: Return ordered prices from the requested tracked period."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime.now(timezone.utc) - timedelta(minutes=15)
    records = [
        _price_record("200.00", base_time, record_id=1),
        _price_record("195.00", base_time + timedelta(minutes=5), record_id=2),
        _price_record("190.00", base_time + timedelta(minutes=10), record_id=3),
        _price_record("205.00", base_time + timedelta(minutes=15), record_id=4),
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=7),
    )
    history_query = AsyncMock(return_value=records)
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        history_query,
    )

    before_request = datetime.now(timezone.utc)
    result = await service.get_price_history(db, user, product_id=10)

    assert result.min_price == Decimal("190.00")
    assert result.max_price == Decimal("205.00")
    assert result.tracked_days == 7
    assert len(result.data_points) == 4
    assert [point.price for point in result.data_points] == [
        Decimal("200.00"),
        Decimal("195.00"),
        Decimal("190.00"),
        Decimal("205.00"),
    ]
    assert [point.timestamp for point in result.data_points] == [
        record.recorded_at for record in records
    ]
    for pt in result.data_points:
        assert pt.is_gap is False
    history_query.assert_awaited_once()
    since = history_query.await_args.kwargs["since"]
    assert (
        before_request - timedelta(days=7)
        <= since
        <= datetime.now(timezone.utc) - timedelta(days=7)
    )


@pytest.mark.asyncio
async def test_us03_tc_002_few_days_of_history_returns_available_data(monkeypatch):
    """US03-TC-002: Preserve available chart data with fewer than seven tracked days."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    records = [
        _price_record("210.00", base_time, record_id=1),
        _price_record("205.00", base_time + timedelta(days=1), record_id=2),
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=2),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert result.tracked_days == 2
    assert result.min_price == Decimal("205.00")
    assert result.max_price == Decimal("210.00")
    assert [point.price for point in result.data_points] == [
        Decimal("210.00"),
        Decimal("205.00"),
    ]
    assert len(result.data_points) == len(records)


@pytest.mark.asyncio
async def test_us03_tc_003_gap_after_tracking_stops_and_resumes(monkeypatch):
    """US03-TC-003: Mark resumed tracking as a gap after a long untracked interval."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime.now(timezone.utc) - timedelta(hours=4)
    records = [
        _price_record("200.00", base_time, record_id=1),
        _price_record("195.00", base_time + timedelta(minutes=5), record_id=2),
        _price_record("185.00", base_time + timedelta(hours=3), record_id=3),
        _price_record("185.00", base_time + timedelta(hours=3, minutes=5), record_id=4),
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=3),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert result.min_price == Decimal("185.00")
    assert result.max_price == Decimal("200.00")
    assert result.tracked_days == 3
    assert len(result.data_points) == 4

    assert result.data_points[0].is_gap is False
    assert result.data_points[1].is_gap is False
    assert result.data_points[2].is_gap is True
    assert result.data_points[3].is_gap is False


@pytest.mark.asyncio
async def test_us03_tc_005_gap_at_threshold_is_not_a_gap(monkeypatch):
    """US03-TC-005: An interval equal to the threshold remains continuous."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime.now(timezone.utc) - timedelta(hours=1)
    records = [
        _price_record("200.00", base_time, record_id=1),
        _price_record("195.00", base_time + timedelta(minutes=30), record_id=2),
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=1),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert [point.is_gap for point in result.data_points] == [False, False]


@pytest.mark.asyncio
async def test_us03_tc_006_gap_exceeding_custom_threshold_is_detected(monkeypatch):
    """US03-TC-006: An interval greater than a custom threshold starts a gap."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime.now(timezone.utc) - timedelta(minutes=30)
    records = [
        _price_record("200.00", base_time, record_id=1),
        # delta = 20 min (vượt ngưỡng tùy chỉnh 15 min -> is_gap = True)
        _price_record("195.00", base_time + timedelta(minutes=20), record_id=2),
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=1),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(
        db, user, product_id=10, gap_threshold_minutes=15
    )

    assert result.data_points[1].is_gap is True


@pytest.mark.asyncio
async def test_us03_tc_009_zero_days_returns_all_history(monkeypatch):
    """US03-TC-009: The all-history boundary does not apply a time cutoff."""
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    records = [
        _price_record(
            "150.00",
            datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
            record_id=1,
        )
    ]

    monkeypatch.setattr(
        "app.services.watchlist_service.tracked_product_crud.get",
        AsyncMock(return_value=tracking),
    )
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_history_distinct_days",
        AsyncMock(return_value=1),
    )
    history_query = AsyncMock(return_value=records)
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        history_query,
    )

    result = await service.get_price_history(db, user, product_id=10, days=0)

    assert result.data_points[0].timestamp == records[0].recorded_at
    history_query.assert_awaited_once_with(db, 10, since=None)
