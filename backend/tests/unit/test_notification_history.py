import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.crud.notification_crud import notification_crud
from app.models.product_model import UserNotification


def test_history_returns_ten_newest_for_current_user_including_seen():
    engine = create_engine("sqlite://")
    UserNotification.__table__.create(engine)
    now = datetime(2026, 11, 1)
    with Session(engine) as session:
        for i in range(1, 14):
            session.add(UserNotification(
                id=i, user_id=42, kind="good_price", title=f"Thông báo {i}",
                message="Giá tốt", created_at=now + timedelta(minutes=i // 2),
                seen_at=now if i % 2 == 0 else None,
            ))
        session.add(UserNotification(id=99, user_id=7, kind="good_price",
                                     title="Riêng tư", message="Khác tài khoản", created_at=now + timedelta(days=1)))
        session.commit()
        db = AsyncMock()
        db.scalars.side_effect = session.scalars
        items = asyncio.run(notification_crud.list_recent(db, 42))
        assert [item.id for item in items] == list(range(13, 3, -1))
        assert any(item.seen_at is None for item in items)
        assert any(item.seen_at is not None for item in items)
        assert all(item.user_id == 42 for item in items)
        assert asyncio.run(notification_crud.list_recent(db, 123)) == []
        for i in range(100, 151):
            session.add(UserNotification(id=i, user_id=42, kind="target_price_set",
                                         title="Đã lưu", message="Giá mục tiêu", created_at=now))
        session.commit()
        alerts = asyncio.run(notification_crud.list_unseen(db, 42))
        assert [item.id for item in alerts] == [1, 3, 5, 7, 9, 11, 13]
    engine.dispose()
