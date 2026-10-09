from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.watchlist_schema import ProductList, Product, ProductCreate
from app.schemas.watchlist_schema import NotificationList
from app.services.notification_service import notification_service
from app.services.watchlist_service import watchlist_service


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
    summary="Xóa sản phẩm khỏi danh sách theo dõi của người dùng hiện tại",
)
async def remove_from_watchlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await watchlist_service.remove_product(db, current_user, product_id)
