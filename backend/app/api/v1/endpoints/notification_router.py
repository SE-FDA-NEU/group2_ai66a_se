from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.notification_schema import (
    NotificationPreferenceResponse, NotificationPreferenceUpdate,
)
from app.crud.notification_crud import notification_settings_crud


router = APIRouter()


@router.get(
    "/settings",
    response_model=ApiResponse[NotificationPreferenceResponse],
    summary="Get notification settings for the current user",
)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = await notification_settings_crud.get_or_create(db, current_user.id)
    await db.commit()
    return ApiResponse(message="Notification settings loaded.", data=settings)


@router.patch(
    "/settings",
    response_model=ApiResponse[NotificationPreferenceResponse],
    status_code=status.HTTP_200_OK,
    summary="Update notification settings for the current user",
)
async def update_notification_settings(
    request: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        settings = await notification_settings_crud.update(
            db, current_user.id, request.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await db.commit()
    return ApiResponse(message="Notification settings saved.", data=settings)
