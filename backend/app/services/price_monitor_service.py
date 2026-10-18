import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.crud import notification_crud, product_crud, tracked_product_crud
from app.services.notification_service import enqueue_price_email
from app.services.price_stream_service import price_stream_service
from app.helper.rapidapi_client import rapidapi_client


REFRESH_INTERVAL_SECONDS = 5 * 60
RETENTION_DAYS = 7


class PriceMonitorService:
    """Refresh active products and create one alert when a tracker gets a good price."""

    @staticmethod
    def is_good_price(current_price: Decimal, lowest_price: Decimal) -> bool:
        return current_price <= lowest_price * Decimal("1.05")

    async def refresh_active_products(self) -> None:
        async with AsyncSessionLocal() as db:
            product_ids = await product_crud.get_active_product_ids(db)

        for product_id in product_ids:
            try:
                await self._refresh_one(product_id)
            except Exception:
                logger.exception("Price refresh failed for product %s", product_id)

    async def _refresh_one(self, product_id: int) -> None:
        async with AsyncSessionLocal() as db:
            product = await product_crud.get_by_id(db, product_id)
            if product is None or product.tracked_by_count < 1:
                return
            external_id = product.external_id

        item = await rapidapi_client.fetch_product(external_id, country="US")
        if item.external_id != external_id:
            logger.error("Marketplace returned a different product for %s", product_id)
            return

        async with AsyncSessionLocal() as db:
            product = await product_crud.get_by_id(db, product_id, for_update=True)
            if product is None or product.tracked_by_count < 1:
                return
            if item.external_id != product.external_id:
                logger.error("Marketplace returned a different product for %s", product_id)
                return

            await product_crud.record_price_snapshot(db, product, item)

            if await self._has_enough_history(db, product.id) and self.is_good_price(
                Decimal(product.current_price), Decimal(product.price_low)
            ):
                trackers = await tracked_product_crud.list_pending_good_price_trackers(
                    db, product.id, for_update=True
                )
                for tracker in trackers:
                    current_disp = f"{product.current_price} {product.currency}"
                    if str(product.currency).upper() == "USD":
                        vnd_curr = round(Decimal(str(product.current_price)) * Decimal("26000"))
                        current_disp = f"{vnd_curr:,.0f} ₫ ({product.current_price} {product.currency})".replace(",", ".")

                    await notification_crud.create(
                        db,
                        user_id=tracker.user_id,
                        product_id=product.id,
                        kind="good_price",
                        title="Sản phẩm đang có giá tốt",
                        message=(
                            f"{product.name} hiện có giá {current_disp}, "
                            f"thấp hơn hoặc bằng ngưỡng giá tốt."
                        ),
                    )
                    await tracked_product_crud.mark_good_price_notified(db, tracker)

            target_trackers = await tracked_product_crud.list_pending_target_price_trackers(
                db, product.id, product.current_price, for_update=True
            )
            for tracker in target_trackers:
                current_disp = f"{product.current_price} {product.currency}"
                target_disp = f"{tracker.target_price} {product.currency}"
                if str(product.currency).upper() == "USD":
                    vnd_curr = round(Decimal(str(product.current_price)) * Decimal("26000"))
                    current_disp = f"{vnd_curr:,.0f} ₫ ({product.current_price} {product.currency})".replace(",", ".")
                    vnd_target = round(Decimal(str(tracker.target_price)) * Decimal("26000"))
                    target_disp = f"{vnd_target:,.0f} ₫ ({tracker.target_price} {product.currency})".replace(",", ".")

                await notification_crud.create(
                    db,
                    user_id=tracker.user_id,
                    product_id=product.id,
                    kind="target_price_reached",
                    title="Giá mục tiêu đã đạt",
                    message=(
                        f"Sản phẩm {product.name} hiện có giá {current_disp}, "
                        f"đã chạm mức giá mục tiêu {target_disp} của bạn. Xem tại: {product.url}"
                    ),
                )
                await tracked_product_crud.mark_target_price_notified(db, tracker)
                await enqueue_price_email(
                    db,
                    user_id=tracker.user_id,
                    kind="target_price_reached",
                    product_name=product.name,
                    current_price=product.current_price,
                    currency=product.currency,
                    product_url=product.url,
                    target_price=tracker.target_price,
                )

            above_target_trackers = await tracked_product_crud.list_above_target_price_trackers(
                db, product.id, product.current_price, for_update=True
            )
            for tracker in above_target_trackers:
                current_disp = f"{product.current_price} {product.currency}"
                target_disp = f"{tracker.target_price} {product.currency}"
                if str(product.currency).upper() == "USD":
                    vnd_curr = round(Decimal(str(product.current_price)) * Decimal("26000"))
                    current_disp = f"{vnd_curr:,.0f} ₫ ({product.current_price} {product.currency})".replace(",", ".")
                    vnd_target = round(Decimal(str(tracker.target_price)) * Decimal("26000"))
                    target_disp = f"{vnd_target:,.0f} ₫ ({tracker.target_price} {product.currency})".replace(",", ".")

                await notification_crud.create(
                    db,
                    user_id=tracker.user_id,
                    product_id=product.id,
                    kind="price_above_target",
                    title="Giá đã tăng trên mục tiêu",
                    message=(
                        f"Sản phẩm {product.name} hiện có giá {current_disp}, "
                        f"đã vượt trên mức giá mục tiêu {target_disp} của bạn."
                    ),
                )
                await tracked_product_crud.reset_target_price_notified(db, tracker)
                await enqueue_price_email(
                    db,
                    user_id=tracker.user_id,
                    kind="price_above_target",
                    product_name=product.name,
                    current_price=product.current_price,
                    currency=product.currency,
                    product_url=product.url,
                    target_price=tracker.target_price,
                )

            await db.commit()
            await price_stream_service.publish_price_update(
                product_id=product.id,
                price=Decimal(product.current_price),
                currency=product.currency,
                timestamp=datetime.now(timezone.utc),
                price_low=Decimal(product.price_low),
                price_high=Decimal(product.price_high),
            )

    @staticmethod
    async def _has_enough_history(db, product_id: int) -> bool:
        return await product_crud.get_history_distinct_days(db, product_id) >= 7

    async def cleanup_expired_products(
        self, retention_days: int = RETENTION_DAYS
    ) -> list[int]:
        """Xóa vĩnh viễn các sản phẩm đã ngừng theo dõi quá thời hạn lưu trữ (7 ngày)."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        async with AsyncSessionLocal() as db:
            deleted_ids = await product_crud.delete_expired_untracked(db, cutoff=cutoff)
            if deleted_ids:
                logger.info(
                    "Xóa vĩnh viễn %d sản phẩm hết hạn %d ngày không có người theo dõi: %s",
                    len(deleted_ids),
                    retention_days,
                    deleted_ids,
                )
            return deleted_ids

    async def run_forever(self) -> None:
        while True:
            await self.refresh_active_products()
            try:
                await self.cleanup_expired_products()
            except Exception:
                logger.exception("Price monitor: Lỗi khi dọn dẹp sản phẩm hết hạn theo dõi")
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


price_monitor_service = PriceMonitorService()
