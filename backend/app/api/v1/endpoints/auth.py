from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.core.database import get_db
from app.core.redis import get_redis

from app.services.auth_service import auth_service
from app.services.user_service import user_service
    
from app.schemas.token_schema import Token
from app.schemas.common import ApiResponse
from app.schemas.otp_schema import OTPReason
from app.schemas.user_schema import UserCreate, UserResponse

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Đăng nhập và nhận về Access Token"""
    return await auth_service.authenticate_user(db, form_data=form_data)

# Endpoints cho việc đăng ký người dùng bằng email và xác nhận email thông qua OTP

@router.post("/register/email", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register_user_email(
    user_in: UserCreate,
    verify_token: str,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Đăng ký người dùng bằng email"""
    # Xác thực token OTP đã được xác nhận
    await auth_service.verify_action_token(
        email=user_in.email,
        reason=OTPReason.VERIFY_EMAIL,
        token=verify_token,
        redis=redis,
    )

    user = await user_service.register_new_user(db, user_in=user_in)
    return ApiResponse(
        message="Đăng ký tài khoản thành công. Vui lòng kiểm tra email để xác nhận.",
        data=user
    )
