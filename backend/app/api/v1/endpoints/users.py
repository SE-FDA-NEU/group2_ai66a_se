from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.user_schema import UserCreate, UserResponse, UserListResponse
from app.services.user_service import user_service
from app.api.deps import get_current_user
from app.models.user_model import User

router = APIRouter()

@router.get("/me", response_model=ApiResponse[UserResponse], status_code=status.HTTP_200_OK)
async def read_user_me(
    current_user: User = Depends(get_current_user)
):
    """Thông tin cá nhân"""
    return ApiResponse(
        message="Lấy thông tin cá nhân thành công",
        data=current_user
    )