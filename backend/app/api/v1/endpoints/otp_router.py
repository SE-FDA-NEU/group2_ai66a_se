from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from pydantic import EmailStr

from app.core.database import get_db
from app.core.redis import get_redis
from app.services.auth_service import auth_service
from app.schemas.common import ApiResponse
from app.schemas.otp_schema import OTPReason, OTPVerifyData, OTPSendRequest, OTPVerifyRequest

router = APIRouter()


@router.post("/send", response_model=ApiResponse[None])
async def send_otp_email(
    request: OTPSendRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Gửi mã OTP về email để xác nhận người dùng"""
    await auth_service.send_otp_email(email=request.email, reason=request.reason, db=db, redis=redis)
    return ApiResponse(message=f"OTP đã được gửi tới {request.email}")


@router.post("/verify", response_model=ApiResponse[OTPVerifyData])
async def verify_otp_email(
    request: OTPVerifyRequest,
    redis: Redis = Depends(get_redis)
):
    """Xác nhận mã OTP đã gửi về email"""
    verified_token = await auth_service.verify_otp_email(
        email=request.email, reason=request.reason, otp=request.otp, redis=redis
    )
    return ApiResponse(
        message="Xác thực OTP thành công",
        data=OTPVerifyData(verified_token=verified_token)
    )
