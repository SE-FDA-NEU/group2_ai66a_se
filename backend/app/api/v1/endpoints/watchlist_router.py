from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.schemas.common import ApiResponse
from app.schemas.watchlist_schema import WatchlistCreate, WatchlistProduct
from app.services.watchlist_service import watchlist_service


router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[WatchlistProduct],
    status_code=status.HTTP_201_CREATED,
    summary="Add a product to the current user's watchlist",
)
async def add_to_watchlist(
    request: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = await watchlist_service.add_product(db, current_user, request)
    return ApiResponse(message="Product added to watchlist.", data=product)
