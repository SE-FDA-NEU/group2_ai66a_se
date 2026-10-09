from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.notification_crud import notification_crud
from app.schemas.watchlist_schema import NotificationList


class NotificationService:
    async def list_for_user(
        self, db: AsyncSession, user_id: int, after_id: int = 0
    ) -> NotificationList:
        notifications = await notification_crud.list_after(db, user_id, after_id)
        return NotificationList(notifications=notifications)


notification_service = NotificationService()
