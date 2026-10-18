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
async def test_untracked_product_raises_tracking_not_found(monkeypatch):
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
async def test_empty_price_history(monkeypatch):
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
async def test_single_price_point(monkeypatch):
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
async def test_continuous_price_points_no_gap(monkeypatch):
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime(2026, 10, 15, 10, 0, tzinfo=timezone.utc)
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
    monkeypatch.setattr(
        "app.services.watchlist_service.product_crud.get_price_history",
        AsyncMock(return_value=records),
    )

    result = await service.get_price_history(db, user, product_id=10)

    assert result.min_price == Decimal("190.00")
    assert result.max_price == Decimal("205.00")
    assert result.tracked_days == 7
    assert len(result.data_points) == 4
    for pt in result.data_points:
        assert pt.is_gap is False


@pytest.mark.asyncio
async def test_gap_detection_exceeding_threshold(monkeypatch):
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime(2026, 10, 15, 10, 0, tzinfo=timezone.utc)
    records = [
        # Point 1: 10:00
        _price_record("200.00", base_time, record_id=1),
        # Point 2: 10:05 (delta = 5 min <= 30 min -> is_gap = False)
        _price_record("195.00", base_time + timedelta(minutes=5), record_id=2),
        # Point 3: 13:00 (delta = 2h55m > 30 min -> is_gap = True)
        _price_record("185.00", base_time + timedelta(hours=3), record_id=3),
        # Point 4: 13:05 (delta = 5 min <= 30 min -> is_gap = False)
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
async def test_custom_gap_threshold(monkeypatch):
    service = WatchlistService()
    db = AsyncMock()
    user = _user()
    tracking = SimpleNamespace(user_id=1, product_id=10)
    base_time = datetime(2026, 10, 15, 10, 0, tzinfo=timezone.utc)
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

