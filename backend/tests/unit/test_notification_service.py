import asyncio
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import create_engine, event, select, text
from sqlalchemy.orm import Session

from app.crud.notification_crud import sale_event_crud
from app.models.product_model import (
    NotificationPreference,
    PendingNotificationEmail,
    Product,
    SaleEvent,
    SaleEventNotification,
    TrackedProduct,
    UserNotification,
)
from app.models.user_model import User
from app.services.notification_service import is_quiet_now, process_due_sale_alerts


def test_quiet_hours_support_overnight_interval():
    assert is_quiet_now(datetime.fromisoformat("2026-10-17T02:00:00+07:00"), start=time(23), end=time(7))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T07:00:00+07:00"), start=time(23), end=time(7))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T12:00:00+07:00"), start=time(23), end=time(7))


def test_quiet_hours_support_same_day_interval():
    assert is_quiet_now(datetime.fromisoformat("2026-10-17T12:30:00+07:00"), start=time(12), end=time(13))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T13:00:00+07:00"), start=time(12), end=time(13))


def test_equal_quiet_hour_bounds_mean_no_quiet_period():
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T02:00:00+07:00"), start=time(7), end=time(7))


@pytest.fixture
def sale_sqlite_db():
    engine = create_engine("sqlite://")
    User.__table__.create(engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE products (
                    id INTEGER PRIMARY KEY,
                    marketplace VARCHAR(20) NOT NULL,
                    external_id VARCHAR(64) NOT NULL,
                    url TEXT NOT NULL,
                    name TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    brand VARCHAR(255),
                    shop_name VARCHAR(255),
                    product_rating NUMERIC(3, 2),
                    review_count INTEGER DEFAULT 0 NOT NULL,
                    current_price NUMERIC(12, 2) NOT NULL,
                    original_price NUMERIC(12, 2),
                    currency VARCHAR(10) NOT NULL,
                    in_stock BOOLEAN DEFAULT 1 NOT NULL,
                    tracked_by_count INTEGER DEFAULT 0 NOT NULL,
                    price_low NUMERIC(12, 2) NOT NULL,
                    price_high NUMERIC(12, 2) NOT NULL,
                    untracked_since DATETIME,
                    top_reviews TEXT DEFAULT '[]' NOT NULL,
                    details TEXT DEFAULT '{}' NOT NULL,
                    details_updated_at DATETIME,
                    last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
                """
            )
        )
    for model in (
        TrackedProduct,
        NotificationPreference,
        UserNotification,
        PendingNotificationEmail,
        SaleEvent,
        SaleEventNotification,
    ):
        model.__table__.create(engine)

    counters = {UserNotification: 0, PendingNotificationEmail: 0}

    def assign_pk(_mapper, _connection, target):
        model_cls = type(target)
        if getattr(target, "id", None) is None and model_cls in counters:
            counters[model_cls] += 1
            target.id = counters[model_cls]

    event.listen(UserNotification, "before_insert", assign_pk)
    event.listen(PendingNotificationEmail, "before_insert", assign_pk)

    with Session(engine) as session:
        db = AsyncMock()
        db.scalars.side_effect = session.scalars
        db.execute.side_effect = session.execute
        db.get.side_effect = session.get
        db.add = MagicMock(side_effect=session.add)
        db.flush.side_effect = session.flush
        db.delete.side_effect = session.delete
        yield session, db

    event.remove(UserNotification, "before_insert", assign_pk)
    event.remove(PendingNotificationEmail, "before_insert", assign_pk)
    engine.dispose()


def test_sale_event_crud_and_due_48h_window(sale_sqlite_db):
    session, db = sale_sqlite_db
    now = datetime(2026, 11, 10, 0, 0, tzinfo=timezone.utc)

    async def scenario():
        due_soon = await sale_event_crud.create(
            db,
            name="Flash Sale 1h",
            start_at=now + timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_active=True,
        )
        due_exact = await sale_event_crud.create(
            db,
            name="Mega Sale 48h",
            start_at=now + timedelta(hours=48),
            end_at=now + timedelta(hours=72),
            is_active=True,
        )
        await sale_event_crud.create(
            db,
            name="Too Far Sale",
            start_at=now + timedelta(hours=48, minutes=1),
            is_active=True,
        )
        await sale_event_crud.create(
            db,
            name="Already Started",
            start_at=now - timedelta(minutes=1),
            is_active=True,
        )
        await sale_event_crud.create(
            db,
            name="Inactive Sale",
            start_at=now + timedelta(hours=10),
            is_active=False,
        )
        session.commit()

        due = await sale_event_crud.list_due_within_48h(db, now)
        assert [s.id for s in due] == [due_soon.id, due_exact.id]

        with pytest.raises(ValueError, match="End date must be after the start date"):
            await sale_event_crud.update(db, due_soon, {"end_at": due_soon.start_at})

    asyncio.run(scenario())


def test_process_due_sale_alerts_respects_preference_watchlist_and_dedup(sale_sqlite_db):
    session, db = sale_sqlite_db
    now = datetime(2026, 11, 10, 0, 0, tzinfo=timezone.utc)

    session.add_all([
        User(id=1, email="van@example.com", nickname="Van", password_hashed="x"),
        User(id=2, email="off@example.com", nickname="Off", password_hashed="x"),
        User(id=3, email="empty@example.com", nickname="Empty", password_hashed="x"),
        User(id=4, email="amazon@example.com", nickname="AmazonUser", password_hashed="x"),
        Product(
            id=10,
            marketplace="shopee",
            external_id="SP10",
            url="https://shopee.vn/item/10",
            name="Đèn ngủ dễ thương",
            image_url="https://example.com/10.jpg",
            current_price=Decimal("70000"),
            currency="VND",
            price_low=Decimal("50000"),
            price_high=Decimal("100000"),
            tracked_by_count=2,
        ),
        Product(
            id=20,
            marketplace="amazon",
            external_id="B00020",
            url="https://amazon.com/dp/B00020",
            name="Tai nghe Bluetooth",
            image_url="https://example.com/20.jpg",
            current_price=Decimal("350000"),
            currency="VND",
            price_low=Decimal("300000"),
            price_high=Decimal("400000"),
            tracked_by_count=1,
        ),
        TrackedProduct(user_id=1, product_id=10),
        TrackedProduct(user_id=2, product_id=10),
        TrackedProduct(user_id=4, product_id=20),
        NotificationPreference(
            user_id=1,
            email_enabled=True,
            quiet_hours_enabled=False,
            sale_alert_enabled=True,
            timezone="Asia/Ho_Chi_Minh",
        ),
        NotificationPreference(
            user_id=2,
            email_enabled=True,
            quiet_hours_enabled=False,
            sale_alert_enabled=False,
            timezone="Asia/Ho_Chi_Minh",
        ),
        NotificationPreference(
            user_id=3,
            email_enabled=True,
            quiet_hours_enabled=False,
            sale_alert_enabled=True,
            timezone="Asia/Ho_Chi_Minh",
        ),
        NotificationPreference(
            user_id=4,
            email_enabled=False,
            quiet_hours_enabled=False,
            sale_alert_enabled=True,
            timezone="Asia/Ho_Chi_Minh",
        ),
    ])
    session.commit()

    async def scenario():
        await sale_event_crud.create(
            db,
            name="Shopee 11.11",
            marketplace="shopee",
            start_at=now + timedelta(hours=36),
            is_active=True,
        )
        await sale_event_crud.create(
            db,
            name="Ngày hội siêu sale toàn sàn",
            marketplace=None,
            start_at=now + timedelta(hours=24),
            is_active=True,
        )
        session.commit()

        count = await process_due_sale_alerts(db, now=now)
        session.commit()
        assert count == 3  # user 1 gets both sales, user 4 gets global sale only

        notifications = list(session.scalars(select(UserNotification).order_by(UserNotification.id)).all())
        assert len(notifications) == 3
        assert all(n.kind == "sale_alert" for n in notifications)
        assert {n.user_id for n in notifications} == {1, 4}
        assert "70.000 ₫" in notifications[0].message

        queued_emails = list(session.scalars(select(PendingNotificationEmail)).all())
        assert len(queued_emails) == 2
        assert all(email.user_id == 1 and email.kind == "sale_alert" for email in queued_emails)

        # Second run is deduplicated
        second_count = await process_due_sale_alerts(db, now=now)
        assert second_count == 0

    asyncio.run(scenario())
