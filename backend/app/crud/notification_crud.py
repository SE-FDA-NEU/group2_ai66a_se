from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import (
    NotificationPreference, PendingNotificationEmail, SaleEvent, SaleEventNotification,
    TrackedProduct, UserNotification,
)


class CRUDNotification:
    async def list_recent(self, db: AsyncSession, user_id: int) -> list[UserNotification]:
        result = await db.scalars(
            select(UserNotification)
            .where(UserNotification.user_id == user_id)
            .order_by(UserNotification.created_at.desc(), UserNotification.id.desc())
            .limit(10)
        )
        return list(result.all())

    async def create(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        product_id: int | None,
        kind: str,
        title: str,
        message: str,
    ) -> UserNotification:
        notification = UserNotification(
            user_id=user_id,
            product_id=product_id,
            kind=kind,
            title=title,
            message=message,
        )
        db.add(notification)
        await db.flush()
        return notification

    async def list_after(
        self,
        db: AsyncSession,
        user_id: int,
        after_id: int = 0,
        limit: int = 50,
    ) -> list[UserNotification]:
        # Chỉ lấy thông báo của những sản phẩm người dùng đang thực sự theo dõi (hoặc thông báo hệ thống chung)
        tracked_subquery = select(TrackedProduct.product_id).where(
            TrackedProduct.user_id == user_id
        )
        result = await db.scalars(
            select(UserNotification)
            .where(
                UserNotification.user_id == user_id,
                UserNotification.id > after_id,
                or_(
                    UserNotification.product_id.is_(None),
                    UserNotification.product_id.in_(tracked_subquery),
                ),
            )
            .order_by(UserNotification.id)
            .limit(limit)
        )
        return list(result.all())

    async def list_unseen(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
    ) -> list[UserNotification]:
        result = await db.scalars(
            select(UserNotification)
            .where(
                UserNotification.user_id == user_id,
                UserNotification.seen_at.is_(None),
                # Configuration confirmations stay in history; they must not
                # fill the delivery batch and block actual price alerts.
                UserNotification.kind != "target_price_set",
            )
            .order_by(UserNotification.id)
            .limit(limit)
        )
        return list(result.all())

    async def mark_seen(
        self, db: AsyncSession, user_id: int, ids: list[int]
    ) -> int:
        result = await db.execute(
            update(UserNotification)
            .where(
                UserNotification.user_id == user_id,
                UserNotification.id.in_(ids),
                UserNotification.seen_at.is_(None),
            )
            .values(seen_at=datetime.now(timezone.utc))
        )
        return result.rowcount or 0

    async def delete_for_user_product(
        self, db: AsyncSession, user_id: int, product_id: int
    ) -> None:
        """Xóa toàn bộ thông báo liên quan đến một sản phẩm khi người dùng hủy theo dõi."""
        await db.execute(
            delete(UserNotification).where(
                UserNotification.user_id == user_id,
                UserNotification.product_id == product_id,
            )
        )


notification_crud = CRUDNotification()


class CRUDNotificationSettings:
    async def get_or_create(self, db: AsyncSession, user_id: int) -> NotificationPreference:
        preference = await db.get(NotificationPreference, user_id)
        if preference is None:
            preference = NotificationPreference(user_id=user_id)
            db.add(preference)
            await db.flush()
        return preference

    async def update(self, db: AsyncSession, user_id: int, values: dict) -> NotificationPreference:
        preference = await self.get_or_create(db, user_id)
        for key, value in values.items():
            if key in {"quiet_start", "quiet_end"} and value is not None:
                value = value.strftime("%H:%M")
            setattr(preference, key, value)
        if preference.quiet_hours_enabled and (not preference.quiet_start or not preference.quiet_end):
            raise ValueError("quiet_start and quiet_end are required when quiet hours are enabled.")
        await db.flush()
        return preference


class CRUDPendingNotificationEmail:
    async def create(self, db: AsyncSession, **values) -> PendingNotificationEmail:
        item = PendingNotificationEmail(**values)
        db.add(item)
        await db.flush()
        return item

    async def pending(self, db: AsyncSession, limit: int = 100) -> list[PendingNotificationEmail]:
        result = await db.scalars(
            select(PendingNotificationEmail)
            .where(PendingNotificationEmail.sent_at.is_(None))
            .order_by(PendingNotificationEmail.id)
            .limit(limit)
        )
        return list(result.all())

    async def mark_sent(
        self, db: AsyncSession, item: PendingNotificationEmail, sent_at: datetime
    ) -> None:
        """Đánh dấu email thông báo đã được gửi đi tại thời điểm sent_at."""
        item.sent_at = sent_at
        db.add(item)


class CRUDSaleEvent:
    async def list_all(self, db: AsyncSession, *, active_only: bool = False) -> list[SaleEvent]:
        statement = select(SaleEvent)
        if active_only:
            statement = statement.where(SaleEvent.is_active.is_(True))
        statement = statement.order_by(SaleEvent.start_at.asc(), SaleEvent.id.asc())
        result = await db.scalars(statement)
        return list(result.all())

    async def get(self, db: AsyncSession, sale_id: int) -> SaleEvent | None:
        return await db.get(SaleEvent, sale_id)

    async def create(self, db: AsyncSession, **values) -> SaleEvent:
        sale_event = SaleEvent(**values)
        db.add(sale_event)
        await db.flush()
        return sale_event

    async def update(self, db: AsyncSession, sale_event: SaleEvent, values: dict) -> SaleEvent:
        effective_start = values.get("start_at", sale_event.start_at)
        effective_end = values.get("end_at", sale_event.end_at)
        if effective_start is not None and effective_end is not None:
            start_cmp = effective_start if effective_start.tzinfo else effective_start.replace(tzinfo=timezone.utc)
            end_cmp = effective_end if effective_end.tzinfo else effective_end.replace(tzinfo=timezone.utc)
            if end_cmp <= start_cmp:
                raise ValueError("End date must be after the start date")
        for key, value in values.items():
            setattr(sale_event, key, value)
        db.add(sale_event)
        await db.flush()
        return sale_event

    async def delete(self, db: AsyncSession, sale_event: SaleEvent) -> None:
        await db.delete(sale_event)
        await db.flush()

    async def list_due_within_48h(self, db: AsyncSession, now: datetime) -> list[SaleEvent]:
        horizon = now + timedelta(hours=48)
        result = await db.scalars(
            select(SaleEvent)
            .where(
                SaleEvent.is_active.is_(True),
                SaleEvent.start_at > now,
                SaleEvent.start_at <= horizon,
            )
            .order_by(SaleEvent.start_at.asc(), SaleEvent.id.asc())
        )
        return list(result.all())

    async def is_notified(self, db: AsyncSession, sale_event_id: int, user_id: int) -> bool:
        existing = await db.get(SaleEventNotification, (sale_event_id, user_id))
        return existing is not None

    async def mark_notified(
        self, db: AsyncSession, sale_event_id: int, user_id: int, notified_at: datetime
    ) -> SaleEventNotification:
        record = SaleEventNotification(
            sale_event_id=sale_event_id,
            user_id=user_id,
            notified_at=notified_at,
        )
        db.add(record)
        await db.flush()
        return record


notification_settings_crud = CRUDNotificationSettings()
pending_notification_email_crud = CRUDPendingNotificationEmail()
sale_event_crud = CRUDSaleEvent()
