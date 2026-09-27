from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.user_schema import PasswordUpdate, UserResponse, UserUpdate
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

@router.patch("/me", response_model=ApiResponse[UserResponse], status_code=status.HTTP_200_OK)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cập nhật thông tin cá nhân"""
    updated_user = await user_service.update_user_info(db, user=current_user, user_in=user_in)

    return ApiResponse(
        message="Cập nhật thông tin cá nhân thành công",
        data=updated_user
    )

@router.patch("/me/password", response_model=ApiResponse[UserResponse], status_code=status.HTTP_200_OK)
async def update_user_password_me(
    password_in: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cập nhật mật khẩu cá nhân"""
    await user_service.update_user_password(
        db,
        user=current_user,
        password_in=password_in
    )

    return ApiResponse(
        message="Cập nhật mật khẩu thành công",
        data=current_user
    )