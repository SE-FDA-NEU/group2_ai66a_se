import asyncio
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.crud import (
    notification_crud,
    notification_settings_crud,
    pending_notification_email_crud,
    user_crud,
)
from app.helper.notification_email import send_notification_email
from app.models.product_model import PendingNotificationEmail
from app.schemas.notification_schema import NotificationKind
from app.schemas.watchlist_schema import NotificationList


class NotificationService:
    async def list_for_user(
        self, db: AsyncSession, user_id: int, after_id: int = 0
    ) -> NotificationList:
        notifications = await notification_crud.list_after(db, user_id, after_id)
        return NotificationList(notifications=notifications)

    async def get_user_settings(self, db: AsyncSession, user_id: int):
        return await notification_settings_crud.get_or_create(db, user_id)

    async def update_user_settings(self, db: AsyncSession, user_id: int, values: dict):
        return await notification_settings_crud.update(db, user_id, values)


notification_service = NotificationService()
EMAIL_DELIVERY_INTERVAL_SECONDS = 30


def is_quiet_now(now: datetime, *, start: time, end: time) -> bool:
    """Return whether local wall-clock time is within a possibly overnight interval."""
    current = now.timetz().replace(tzinfo=None)
    if start == end:
        return False
    if start < end:
        return start <= current < end
    return current >= start or current < end


async def enqueue_price_email(
    db: AsyncSession, *, user_id: int, kind: str, product_name: str,
    current_price, currency: str, product_url: str, target_price=None,
) -> None:
    preference = await notification_settings_crud.get_or_create(db, user_id)
    if not preference.email_enabled:
        return
    await pending_notification_email_crud.create(
        db,
        user_id=user_id,
        kind=kind,
        product_name=product_name,
        current_price=str(current_price),
        currency=currency,
        product_url=product_url,
        target_price=str(target_price) if target_price is not None else None,
    )


async def deliver_pending_emails(db: AsyncSession, *, now: datetime | None = None) -> int:
    """Send due user alerts and retain quiet-hour alerts until allowed."""
    now = now or datetime.now(timezone.utc)
    pending = await pending_notification_email_crud.pending(db)
    sent = 0
    for item in pending:
        preference = await notification_settings_crud.get_or_create(db, item.user_id)
        if not preference.email_enabled:
            await pending_notification_email_crud.mark_sent(db, item, sent_at=now)
            continue
        if preference.quiet_hours_enabled:
            local_now = now.astimezone(ZoneInfo(preference.timezone))
            start = time.fromisoformat(preference.quiet_start)
            end = time.fromisoformat(preference.quiet_end)
            if is_quiet_now(local_now, start=start, end=end):
                continue
        user = await user_crud.get_by_id(db, item.user_id)
        if user is None:
            await pending_notification_email_crud.mark_sent(db, item, sent_at=now)
            continue
        await send_notification_email(
            email=user.email,
            kind=NotificationKind(item.kind),
            product_name=item.product_name,
            current_price=item.current_price,
            currency=item.currency,
            product_url=item.product_url,
            target_price=item.target_price,
        )
        await pending_notification_email_crud.mark_sent(db, item, sent_at=now)
        sent += 1
    await db.flush()
    return sent


async def run_email_delivery_forever() -> None:
    """Drain the durable email queue frequently so quiet-hour alerts go out promptly."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await deliver_pending_emails(db)
                await db.commit()
        except Exception:
            logger.exception("Pending notification email delivery failed")
        await asyncio.sleep(EMAIL_DELIVERY_INTERVAL_SECONDS)
