"""Exercise production SQL against disposable in-memory SQLite, without PostgreSQL."""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.crud.notification_crud import notification_crud
from app.crud.tracked_product_crud import tracked_product_crud
from app.models.product_model import UserNotification, TrackedProduct


@pytest.fixture
def repository():
    engine = create_engine("sqlite://")
    UserNotification.__table__.create(engine)
    TrackedProduct.__table__.create(engine)
    with Session(engine) as session:
        db = AsyncMock()
        db.scalars.side_effect = session.scalars
        db.execute.side_effect = session.execute
        yield session, db
    engine.dispose()


def notification(id, user_id=42, seen=False):
    now = datetime(2026, 1, 1)
    return UserNotification(id=id, user_id=user_id, kind="good_price", title="Giá tốt",
                            message="Giá đã giảm", created_at=now + timedelta(minutes=id // 2),
                            seen_at=now if seen else None)


@pytest.mark.parametrize("count", [0, 9, 10, 11], ids=["empty", "below-10", "at-10", "above-10"])
def test_N185_HIST_01_limit_both_sides(repository, count):
    session, db = repository
    session.add_all([notification(i, seen=i % 2 == 0) for i in range(1, count + 1)])
    session.add(notification(99, user_id=7))
    session.commit()
    result = asyncio.run(notification_crud.list_recent(db, 42))
    assert [item.id for item in result] == list(range(count, max(count - 10, 0), -1))
    assert all(item.user_id == 42 for item in result)


def test_N185_SEEN_01_reload_excludes_seen_but_history_retains_it(repository):
    session, db = repository
    session.add(notification(1))
    session.add(notification(2, user_id=7))
    session.commit()
    assert [n.id for n in asyncio.run(notification_crud.list_unseen(db, 42))] == [1]
    assert asyncio.run(notification_crud.mark_seen(db, 42, [1, 2, 999])) == 1
    session.commit()
    session.expire_all()  # Re-read persisted state, rather than a frontend cache.
    assert asyncio.run(notification_crud.list_unseen(db, 42)) == []
    assert asyncio.run(notification_crud.list_recent(db, 42))[0].seen_at is not None
    assert [n.id for n in asyncio.run(notification_crud.list_unseen(db, 7))] == [2]
    assert asyncio.run(notification_crud.mark_seen(db, 42, [1])) == 0


@pytest.mark.parametrize("price", [194999, 195000, 195001], ids=["below", "equal", "above"])
@pytest.mark.parametrize("notified", [False, True], ids=["not-notified", "already-notified"])
def test_N185_MAIL_05_threshold_both_sides(repository, price, notified):
    session, db = repository
    session.add(TrackedProduct(product_id=31, user_id=42,
                               target_price=Decimal("195000"), target_price_notified=notified))
    session.commit()
    reached = asyncio.run(tracked_product_crud.list_pending_target_price_trackers(db, 31, Decimal(price)))
    above = asyncio.run(tracked_product_crud.list_above_target_price_trackers(db, 31, Decimal(price)))
    assert bool(reached) is (price <= 195000 and not notified)
    assert bool(above) is (price > 195000 and notified)
