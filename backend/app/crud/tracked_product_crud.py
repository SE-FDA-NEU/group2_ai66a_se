from sqlalchemy import Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import PriceHistory, Product, TrackedProduct


class CRUDTrackedProduct:
    async def count_for_user(self, db: AsyncSession, user_id: int) -> int:
        result = await db.execute(
            select(func.count()).select_from(TrackedProduct).where(TrackedProduct.user_id == user_id)
        )
        return int(result.scalar_one())

    async def get(self, db: AsyncSession, user_id: int, product_id: int) -> TrackedProduct | None:
        result = await db.execute(
            select(TrackedProduct).where(
                TrackedProduct.user_id == user_id,
                TrackedProduct.product_id == product_id,
            )
        )
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
        return tracking


tracked_product_crud = CRUDTrackedProduct()
