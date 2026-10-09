import asyncio
from decimal import Decimal

from sqlalchemy import Date, func, select

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.crud.notification_crud import notification_crud
from app.helper.rapidapi_client import rapidapi_client
from app.models.product_model import PriceHistory, Product, TrackedProduct


REFRESH_INTERVAL_SECONDS = 5 * 60


class PriceMonitorService:
    """Refresh active products and create one alert when a tracker gets a good price."""

    @staticmethod
    def is_good_price(current_price: Decimal, lowest_price: Decimal) -> bool:
        return current_price <= lowest_price * Decimal("1.05")

    async def refresh_active_products(self) -> None:
        async with AsyncSessionLocal() as db:
            product_ids = list(
                await db.scalars(
                    select(Product.id)
                    .where(Product.tracked_by_count > 0)
                    .order_by(Product.id)
                )
            )

        for product_id in product_ids:
            try:
                await self._refresh_one(product_id)
            except Exception:
                logger.exception("Price refresh failed for product %s", product_id)

    async def _refresh_one(self, product_id: int) -> None:
        async with AsyncSessionLocal() as db:
            product = await db.scalar(select(Product).where(Product.id == product_id))
            if product is None or product.tracked_by_count < 1:
                return
            external_id = product.external_id

        item = await rapidapi_client.fetch_product(external_id, country="US")
        if item.external_id != external_id:
            logger.error("Marketplace returned a different product for %s", product_id)
            return

        async with AsyncSessionLocal() as db:
            product = await db.scalar(
                select(Product).where(Product.id == product_id).with_for_update()
            )
            if product is None or product.tracked_by_count < 1:
                return
            if item.external_id != product.external_id:
                logger.error("Marketplace returned a different product for %s", product_id)
                return

            product.url = item.url
            product.name = item.name
            product.image_url = item.image_url
            product.brand = item.brand
            product.shop_name = item.shop_name
            product.product_rating = item.product_rating
            product.review_count = item.review_count
            product.current_price = item.current_price
            product.original_price = item.original_price
            product.currency = item.currency
            product.in_stock = item.in_stock
            product.top_reviews = item.top_reviews
            product.price_low = min(Decimal(product.price_low), item.current_price)
            product.price_high = max(Decimal(product.price_high), item.current_price)
            product.last_refreshed_at = func.now()
            db.add(PriceHistory(product_id=product.id, price=item.current_price))
            await db.flush()

            if await self._has_enough_history(db, product.id) and self.is_good_price(
                Decimal(product.current_price), Decimal(product.price_low)
            ):
                trackers = await db.scalars(
                    select(TrackedProduct)
                    .where(
                        TrackedProduct.product_id == product.id,
                        TrackedProduct.buy_when_good.is_(True),
                        TrackedProduct.good_price_notified.is_(False),
                    )
                    .with_for_update()
                )
                for tracker in trackers:
                    await notification_crud.create(
                        db,
                        user_id=tracker.user_id,
                        product_id=product.id,
                        kind="good_price",
                        title="Sản phẩm đang có giá tốt",
                        message=(
                            f"{product.name} hiện có giá {product.current_price} "
                            f"{product.currency}, thấp hơn hoặc bằng ngưỡng giá tốt."
                        ),
                    )
                    tracker.good_price_notified = True
                    db.add(tracker)

            await db.commit()

    @staticmethod
    async def _has_enough_history(db, product_id: int) -> bool:
        distinct_days = await db.scalar(
            select(func.count(func.distinct(func.cast(PriceHistory.recorded_at, Date)))).where(
                PriceHistory.product_id == product_id
            )
        )
        return int(distinct_days or 0) >= 7

    async def run_forever(self) -> None:
        while True:
            await self.refresh_active_products()
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


price_monitor_service = PriceMonitorService()
