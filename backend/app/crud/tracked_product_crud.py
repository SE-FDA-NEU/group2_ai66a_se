from decimal import Decimal
from sqlalchemy import Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import PriceHistory, Product, TrackedProduct


class CRUDTrackedProduct:
    async def count_for_user(self, db: AsyncSession, user_id: int) -> int:
        result = await db.execute(
            select(func.count()).select_from(TrackedProduct).where(TrackedProduct.user_id == user_id)
        )
        return int(result.scalar_one())

    async def get(
        self, db: AsyncSession, user_id: int, product_id: int, *, for_update: bool = False
    ) -> TrackedProduct | None:
        statement = select(TrackedProduct).where(
            TrackedProduct.user_id == user_id,
            TrackedProduct.product_id == product_id,
        )
        if for_update:
            statement = statement.with_for_update()
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def list_with_product_statistics(
        self, db: AsyncSession, user_id: int
    ):
        history_stats = (
            select(
                PriceHistory.product_id.label("product_id"),
                func.count(func.distinct(func.cast(PriceHistory.recorded_at, Date))).label(
                    "distinct_days"
                ),
                func.percentile_cont(0.5)
                .within_group(PriceHistory.price)
                .label("median_price"),
            )
            .group_by(PriceHistory.product_id)
            .subquery()
        )
        statement = (
            select(
                Product,
                TrackedProduct.target_price,
                TrackedProduct.buy_when_good,
                func.coalesce(history_stats.c.distinct_days, 0).label("distinct_days"),
                history_stats.c.median_price,
            )
            .join(Product, Product.id == TrackedProduct.product_id)
            .outerjoin(history_stats, history_stats.c.product_id == Product.id)
            .where(TrackedProduct.user_id == user_id)
            .order_by(Product.id)
        )
        result = await db.execute(statement)
        return result.all()

    async def create(
        self,
        db: AsyncSession,
        user_id: int,
        product_id: int,
        target_price,
        buy_when_good: bool,
    ) -> TrackedProduct:
        tracking = TrackedProduct(
            user_id=user_id,
            product_id=product_id,
            target_price=target_price,
            buy_when_good=buy_when_good,
        )
        db.add(tracking)
        await db.flush()
    async def delete(self, db: AsyncSession, tracking: TrackedProduct) -> None:
        """Xóa một bản ghi theo dõi sản phẩm."""
        await db.delete(tracking)
        await db.flush()

    async def list_pending_good_price_trackers(
        self, db: AsyncSession, product_id: int, *, for_update: bool = False
    ) -> list[TrackedProduct]:
        """Lấy danh sách người theo dõi đang bật nhận thông báo giá tốt và chưa được thông báo."""
        statement = select(TrackedProduct).where(
            TrackedProduct.product_id == product_id,
            TrackedProduct.buy_when_good.is_(True),
            TrackedProduct.good_price_notified.is_(False),
        )
        if for_update:
            statement = statement.with_for_update()
        result = await db.scalars(statement)
        return list(result)

    async def list_pending_target_price_trackers(
        self, db: AsyncSession, product_id: int, current_price: Decimal, *, for_update: bool = False
    ) -> list[TrackedProduct]:
        """Lấy danh sách người theo dõi có giá mục tiêu đã đạt và chưa được thông báo."""
        statement = select(TrackedProduct).where(
            TrackedProduct.product_id == product_id,
            TrackedProduct.target_price.is_not(None),
            TrackedProduct.target_price >= current_price,
            TrackedProduct.target_price_notified.is_(False),
        )
        if for_update:
            statement = statement.with_for_update()
        result = await db.scalars(statement)
        return list(result)

    async def mark_good_price_notified(self, db: AsyncSession, tracker: TrackedProduct) -> None:
        """Đánh dấu tracker đã được thông báo giá tốt."""
        tracker.good_price_notified = True
        db.add(tracker)

    async def mark_target_price_notified(self, db: AsyncSession, tracker: TrackedProduct) -> None:
        """Đánh dấu tracker đã được thông báo chạm giá mục tiêu."""
        tracker.target_price_notified = True
        db.add(tracker)


tracked_product_crud = CRUDTrackedProduct()
