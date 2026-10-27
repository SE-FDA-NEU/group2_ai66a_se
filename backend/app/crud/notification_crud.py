from datetime import datetime
from sqlalchemy import delete, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import (
    NotificationPreference, PendingNotificationEmail, TrackedProduct, UserNotification,
)


class CRUDNotification:
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


notification_settings_crud = CRUDNotificationSettings()
pending_notification_email_crud = CRUDPendingNotificationEmail()
