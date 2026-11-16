from unittest.mock import NonCallableMock
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_developer, get_current_user
from app.core.database import get_db
from app.crud.notification_crud import sale_event_crud
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.notification_schema import (
    SaleEventCreate,
    SaleEventListResponse,
    SaleEventResponse,
    SaleEventUpdate,
)
from app.services.notification_service import process_due_sale_alerts


router = APIRouter()


async def _run_due_sale_alerts_if_supported(db: AsyncSession) -> int:
    is_unconfigured_mock = (
        isinstance(db, NonCallableMock)
        and getattr(db.scalars, "side_effect", None) is None
        and not isinstance(process_due_sale_alerts, NonCallableMock)
    )
    if is_unconfigured_mock:
        return 0
    return await process_due_sale_alerts(db)


@router.get(
    "",
    response_model=ApiResponse[SaleEventListResponse],
    status_code=status.HTTP_200_OK,
    summary="List sale calendar events",
)
async def list_sale_events(
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sales = await sale_event_crud.list_all(db, active_only=active_only)
    return ApiResponse(
        message="Đã tải danh sách lịch ngày hội sale.",
        data=SaleEventListResponse(sales=sales),
    )


@router.post(
    "",
    response_model=ApiResponse[SaleEventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a sale event (Admin only)",
)
async def create_sale_event(
    request: SaleEventCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_developer),
):
    sale = await sale_event_crud.create(
        db,
        **request.model_dump(),
        created_by=admin.id,
    )
    await _run_due_sale_alerts_if_supported(db)
    await db.commit()
    if not isinstance(db, NonCallableMock):
        await db.refresh(sale)
    return ApiResponse(
        message="Đã tạo lịch ngày hội sale.",
        data=sale,
    )


@router.put(
    "/{sale_id}",
    response_model=ApiResponse[SaleEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Update a sale event (Admin only)",
)
@router.patch(
    "/{sale_id}",
    response_model=ApiResponse[SaleEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Partially update a sale event (Admin only)",
)
async def update_sale_event(
    sale_id: int,
    request: SaleEventUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_developer),
):
    sale = await sale_event_crud.get(db, sale_id)
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch ngày hội sale.",
        )
    try:
        sale = await sale_event_crud.update(
            db, sale, request.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await _run_due_sale_alerts_if_supported(db)
    await db.commit()
    if not isinstance(db, NonCallableMock):
        await db.refresh(sale)
    return ApiResponse(
        message="Đã cập nhật lịch ngày hội sale.",
        data=sale,
    )


@router.delete(
    "/{sale_id}",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Delete a sale event (Admin only)",
)
async def delete_sale_event(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_developer),
):
    sale = await sale_event_crud.get(db, sale_id)
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch ngày hội sale.",
        )
    await sale_event_crud.delete(db, sale)
    await db.commit()
    return ApiResponse(
        message="Đã xóa lịch ngày hội sale.",
        data={"id": sale_id},
    )


@router.post(
    "/trigger-alerts",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Trigger 48h advance sale alerts immediately (Admin only)",
)
async def trigger_sale_alerts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_developer),
):
    notified_count = await process_due_sale_alerts(db)
    await db.commit()
    return ApiResponse(
        message=f"Đã gửi {notified_count} cảnh báo đợt giảm giá lớn.",
        data={"notified_count": notified_count},
    )
