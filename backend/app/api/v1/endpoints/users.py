from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.user_schema import UserCreate, UserResponse, UserListResponse
from app.services.user_service import user_service
from app.api.deps import get_current_user
from app.models.user_model import User

router = APIRouter()

@router.post("/register", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Đăng ký người dùng mới"""
    user = await user_service.register_new_user(db, user_in=user_in)
    return ApiResponse(
        message="Đăng ký tài khoản thành công",
        data=user
    )

@router.get("", response_model=ApiResponse[UserListResponse], status_code=status.HTTP_200_OK)
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """API xem toàn bộ người dùng"""
    users = await user_service.get_all_users(page=page, limit=limit, current_user=current_user, db=db)
    return ApiResponse(
        message="Lấy thông tin của toàn bộ người dùng thành công",
        data=UserListResponse(
            page=page,
            limit=limit,
            items=users
        )
    )

@router.get("/me", response_model=ApiResponse[UserResponse], status_code=status.HTTP_200_OK)
async def read_user_me(
    current_user: User = Depends(get_current_user)
):
    """Thông tin cá nhân"""
    return ApiResponse(
        message="Lấy thông tin cá nhân thành công",
        data=current_user
    )