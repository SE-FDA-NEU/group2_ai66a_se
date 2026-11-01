from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.notification_schema import (
    NotificationPreferenceResponse, NotificationPreferenceUpdate, NotificationSeenRequest,
)
from app.schemas.watchlist_schema import NotificationList
from app.crud.notification_crud import notification_crud, notification_settings_crud


router = APIRouter()


@router.get("/history", response_model=ApiResponse[NotificationList],
            summary="List the ten most recent notifications, including seen items")
async def list_notification_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await notification_crud.list_recent(db, current_user.id)
    return ApiResponse(message="Đã tải lịch sử thông báo.", data=NotificationList(notifications=items))


@router.get(
    "",
    response_model=ApiResponse[NotificationList],
    status_code=status.HTTP_200_OK,
    summary="List unseen price alerts for the current user",
)
async def list_unseen_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await notification_crud.list_unseen(db, current_user.id)
    return ApiResponse(message="Đã tải các thông báo chưa xem.", data=NotificationList(notifications=items))


@router.post(
    "/seen",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Mark notifications as seen for the current user",
)
async def mark_notifications_seen(
    request: NotificationSeenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await notification_crud.mark_seen(db, current_user.id, request.ids)
    await db.commit()
    return ApiResponse(message="Đã đánh dấu thông báo là đã xem.", data={"count": count})


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
    return ApiResponse(message="Đã tải cài đặt thông báo.", data=settings)


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
    return ApiResponse(message="Đã lưu cài đặt thông báo.", data=settings)
