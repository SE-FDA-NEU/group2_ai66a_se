from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import UserNotification


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
        result = await db.scalars(
            select(UserNotification)
            .where(UserNotification.user_id == user_id, UserNotification.id > after_id)
            .order_by(UserNotification.id)
            .limit(limit)
        )
        return list(result.all())


notification_crud = CRUDNotification()
