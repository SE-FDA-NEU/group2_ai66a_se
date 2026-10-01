from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import TrackedProduct


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
