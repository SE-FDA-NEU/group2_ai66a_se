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
from app.schemas.user_schema import UserCreate, UserResponse, ResetPasswordRequest, UserRegisterRequest
from app.schemas.google_schema import GoogleTokenRequest

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Đăng nhập và nhận về Access Token"""
    return await auth_service.authenticate_user(db, form_data=form_data)


@router.post("/google", response_model=Token)
async def login_or_sign_up_with_google(
    google_token: GoogleTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Đăng nhập hoặc đăng ký bằng Google"""
    return await auth_service.authenticate_google(db, google_token=google_token)


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register_user_email(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Đăng ký người dùng bằng email"""
    # Xác thực token OTP đã được xác nhận
    await auth_service.verify_action_token(
        email=request.email,
        reason=OTPReason.VERIFY_EMAIL,
        token=request.verify_token,
        redis=redis,
    )

    user = await user_service.register_by_email(db, user_in=request)
    return ApiResponse(
        message="Đăng ký tài khoản thành công.",
        data=user
    )

@router.post("/reset-password", response_model=ApiResponse[None], status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Đặt lại mật khẩu người dùng"""
    # Xác thực token OTP đã được xác nhận
    await auth_service.verify_action_token(
        email=request.email,
        reason=OTPReason.RESET_PASSWORD,
        token=request.verify_token,
        redis=redis,
    )

    await user_service.reset_user_password(db, email=request.email, new_password=request.new_password)
    return ApiResponse(
        message="Đặt lại mật khẩu thành công."
    )