import asyncio
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_from_token_or_query
from app.core.database import get_db
from app.crud import tracked_product_crud
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.watchlist_schema import (
    NotificationList,
    PriceHistoryResponse,
    Product,
    ProductCreate,
    ProductList,
    TargetPriceUpdate,
)
from app.services.notification_service import notification_service
from app.services.price_stream_service import price_stream_service
from app.services.watchlist_service import TRACKING_NOT_FOUND, watchlist_service


router = APIRouter()


@router.get(
    "/notifications",
    response_model=ApiResponse[NotificationList],
    status_code=status.HTTP_200_OK,
    summary="List new notifications for the current user",
)
async def list_notifications(
    after_id: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await notification_service.list_for_user(db, current_user.id, after_id)
    return ApiResponse(message="Notifications loaded successfully.", data=result)


@router.post(
    "",
    response_model=ApiResponse[Product],
    status_code=status.HTTP_201_CREATED,
    summary="Add a product to the current user's watchlist",
)
async def add_to_watchlist(
    request: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = await watchlist_service.add_product(db, current_user, request)
    return ApiResponse(message="Product added to watchlist.", data=product)


@router.get(
    "",
    response_model=ApiResponse[ProductList],
    status_code=status.HTTP_200_OK,
    summary="List products tracked by the current user",
)
async def list_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product_list = await watchlist_service.list_products(db, current_user)
    return ApiResponse(message="Watchlist loaded successfully.", data=product_list)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Ngừng theo dõi sản phẩm (Unfollow) khỏi danh sách theo dõi của người dùng",
    description=(
        "Xóa sản phẩm khỏi danh sách theo dõi của người dùng hiện tại. "
        "Sản phẩm sẽ ngừng được hệ thống gọi API cập nhật giá nếu không còn ai theo dõi khác. "
        "Dữ liệu thông tin sản phẩm và lịch sử giá được lưu âm thầm trong 7 ngày "
        "để phục vụ người dùng theo dõi lại trước khi bị xóa vĩnh viễn (BR15)."
    ),
)
async def remove_from_watchlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await watchlist_service.remove_product(db, current_user, product_id)


@router.get(
    "/{product_id}/history",
    response_model=ApiResponse[PriceHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Lấy lịch sử giá và phát hiện khoảng trống gap của sản phẩm",
)
async def get_product_price_history(
    product_id: int,
    days: int = Query(default=7, ge=0, le=365, description="Số ngày lịch sử giá cần lấy (0 = toàn bộ lịch sử)"),
    hours: float | None = Query(default=None, ge=0, description="Số giờ lịch sử giá cần lấy (ưu tiên hơn days)"),
    gap_threshold_minutes: int = Query(default=30, ge=1, le=1440, description="Ngưỡng phát hiện khoảng trống gap (phút)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await watchlist_service.get_price_history(
        db,
        user=current_user,
        product_id=product_id,
        days=days,
        hours=hours,
        gap_threshold_minutes=gap_threshold_minutes,
    )
    return ApiResponse(message="Price history loaded successfully.", data=result)


@router.get(
    "/{product_id}/stream",
    summary="SSE stream nhận cập nhật giá thời gian thực của sản phẩm",
    response_class=StreamingResponse,
)
async def stream_product_price(
    product_id: int,
    request: Request,
    token: str | None = Query(default=None, description="Access token cho EventSource của trình duyệt"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token_or_query),
):
    """
    Server-Sent Events (SSE) stream đẩy giá thời gian thực từ Redis Pub/Sub lên Frontend.
    Hỗ trợ xác thực qua Authorization Header hoặc ?token= query parameter cho EventSource.
    """
    try:
        tracking = await tracked_product_crud.get(db, current_user.id, product_id)
        if tracking is None:
            raise TRACKING_NOT_FOUND.throw()
    finally:
        # Giải phóng session database ngay lập tức trước khi bắt đầu StreamingResponse dài hạn.
        # Do cơ chế request-scoped dependencies của FastAPI chỉ cleanup sau khi response kết thúc,
        # nếu không đóng sớm, mỗi stream SSE mở sẽ giữ 1 kết nối DB cho đến khi client ngắt kết nối,
        # dẫn tới cạn kiệt Connection Pool.
        close_method = getattr(db, "close", None)
        if callable(close_method):
            close_result = close_method()
            if asyncio.iscoroutine(close_result) or hasattr(close_result, "__await__"):
                await close_result

    return StreamingResponse(
        price_stream_service.subscribe_price_updates(product_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.put(
    "/{product_id}/target-price",
    response_model=ApiResponse[Product],
    status_code=status.HTTP_200_OK,
    summary="Đặt hoặc cập nhật giá mục tiêu cho sản phẩm đang theo dõi",
    description="Thiết lập mức giá mục tiêu cho sản phẩm. Yêu cầu giá mục tiêu phải nhỏ hơn giá hiện tại (BR1).",
)
async def update_target_price(
    product_id: int,
    request: TargetPriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = await watchlist_service.update_target_price(
        db, current_user, product_id, request.target_price
    )
    return ApiResponse(message="Target price updated successfully.", data=product)

