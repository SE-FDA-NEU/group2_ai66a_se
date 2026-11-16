import asyncio
from datetime import datetime, time, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.crud import (
    notification_crud,
    notification_settings_crud,
    pending_notification_email_crud,
    sale_event_crud,
    user_crud,
)
from app.helper.notification_email import send_notification_email
from app.models.product_model import (
    NotificationPreference,
    PendingNotificationEmail,
    Product,
    TrackedProduct,
)
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


def _format_sale_product_price(price, currency: str) -> str:
    if price is None:
        return "Chưa có dữ liệu"
    cur = str(currency or "VND").upper()
    if cur == "VND":
        return f"{int(round(Decimal(str(price)))):,} ₫".replace(",", ".")
    if cur == "USD":
        vnd_curr = round(Decimal(str(price)) * Decimal("26000"))
        return f"{vnd_curr:,.0f} ₫ ({price} {currency})".replace(",", ".")
    return f"{price} {currency}"


async def process_due_sale_alerts(
    db: AsyncSession,
    *,
    now: datetime | None = None,
    user_id: int | None = None,
) -> int:
    """Create 48-hour advance sale notifications for eligible users tracking products."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    due_sales = await sale_event_crud.list_due_within_48h(db, now)
    if not due_sales:
        return 0

    pref_stmt = select(NotificationPreference).where(
        NotificationPreference.sale_alert_enabled.is_(True)
    )
    if user_id is not None:
        pref_stmt = pref_stmt.where(NotificationPreference.user_id == user_id)
    preferences = list((await db.scalars(pref_stmt)).all())
    if not preferences:
        return 0

    pref_by_user = {pref.user_id: pref for pref in preferences}
    tracked_rows = (
        await db.execute(
            select(TrackedProduct.user_id, Product)
            .join(Product, Product.id == TrackedProduct.product_id)
            .where(TrackedProduct.user_id.in_(list(pref_by_user.keys())))
            .order_by(
                TrackedProduct.user_id.asc(),
                TrackedProduct.created_at.asc(),
                Product.id.asc(),
            )
        )
    ).all()

    products_by_user: dict[int, list[Product]] = {}
    for row_user_id, product in tracked_rows:
        products_by_user.setdefault(row_user_id, []).append(product)

    notified_count = 0
    for sale in due_sales:
        target_marketplace = (sale.marketplace or "").strip().lower()
        filter_by_marketplace = bool(target_marketplace and target_marketplace != "all")
        sale_start_utc = (
            sale.start_at.replace(tzinfo=timezone.utc)
            if sale.start_at.tzinfo is None
            else sale.start_at.astimezone(timezone.utc)
        )

        for uid, pref in pref_by_user.items():
            user_products = products_by_user.get(uid, [])
            if filter_by_marketplace:
                matching_products = [
                    product
                    for product in user_products
                    if (product.marketplace or "").strip().lower() == target_marketplace
                ]
            else:
                matching_products = user_products

            if not matching_products:
                continue
            if await sale_event_crud.is_notified(db, sale.id, uid):
                continue

            first_product = matching_products[0]
            try:
                user_tz = ZoneInfo(pref.timezone or "Asia/Ho_Chi_Minh")
            except (ZoneInfoNotFoundError, ValueError):
                user_tz = ZoneInfo("Asia/Ho_Chi_Minh")
            start_local = sale_start_utc.astimezone(user_tz)
            start_text = start_local.strftime("%H:%M %d/%m/%Y")
            price_text = _format_sale_product_price(
                first_product.current_price, first_product.currency
            )

            await notification_crud.create(
                db,
                user_id=uid,
                product_id=first_product.id,
                kind=NotificationKind.SALE_ALERT.value,
                title=f"Sắp diễn ra đợt giảm giá lớn: {sale.name}"[:255],
                message=(
                    f"Đợt giảm giá {sale.name} sẽ bắt đầu lúc {start_text}. "
                    f"Sản phẩm {first_product.name} bạn đang theo dõi hiện có giá {price_text}."
                ),
            )
            await enqueue_price_email(
                db,
                user_id=uid,
                kind=NotificationKind.SALE_ALERT.value,
                product_name=first_product.name,
                current_price=first_product.current_price,
                currency=first_product.currency,
                product_url=first_product.url,
            )
            await sale_event_crud.mark_notified(db, sale.id, uid, now)
            notified_count += 1

    await db.flush()
    return notified_count
