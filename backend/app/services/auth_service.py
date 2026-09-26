import json
import secrets

from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from fastapi.security import OAuth2PasswordRequestForm

from app.crud.user_crud import user_crud
from app.core.security import verify_password, create_access_token
from app.schemas.token_schema import AuthErrors
from app.schemas.user_schema import UserErrors
from app.schemas.otp_schema import OTPErrors
from app.helper.otp import send_email

class AuthService:
    async def authenticate_user(self, db: AsyncSession, form_data: OAuth2PasswordRequestForm) -> dict:
        """Nghiệp vụ xác thực thông tin đăng nhập và cấp Token"""
        user = await user_crud.get_by_email(db, email=form_data.username)

        if not user or not user.is_activate or not await verify_password(form_data.password, user.password_hashed):
            raise AuthErrors.INVALID_LOGIN.throw()

        access_token = create_access_token(subject=user.id, is_developer=user.is_developer)
        return {
            "access_token": access_token, 
            "token_type": "bearer"
        }

    async def send_otp_email(self, email: str, reason: str, db: AsyncSession, redis: Redis):
        """Nghiệp vụ gửi mã OTP"""
        existed_user = await user_crud.get_by_email(db, email=email)

        if reason == "verify-email":
            if existed_user:
                raise UserErrors.EMAIL_ALREADY_EXISTS.throw()
        elif reason == "change-password":
            if not existed_user:
                raise UserErrors.USER_NOT_FOUND.throw()

        code = "".join(secrets.choice("0123456789") for _ in range(6))
        payload = json.dumps({"code": code, "attempts": 0})

        await redis.set(f"otp:{reason}:{email}", payload, ex=300)
        await send_email(email=email, otp=code)


    async def verify_otp_email(self, email: str, reason: str, otp: str, redis: Redis) -> str:
        """Nghiệp vụ xác minh mã OTP"""
        redis_key = f"otp:{reason}:{email}"

        otp_data = await redis.get(redis_key)

        if not otp_data:
            raise OTPErrors.OTP_EXPIRED.throw()

        otp_data = json.loads(otp_data)

        if otp_data.get("attempts", 0) >= 5:
            await redis.delete(redis_key)
            raise OTPErrors.OTP_LIMIT_EXCEEDED.throw()

        if otp_data["code"] != otp:
            otp_data["attempts"] = otp_data.get("attempts", 0) + 1
            remain = 5 - otp_data["attempts"]
            await redis.set(redis_key, json.dumps(otp_data), ex=300)
            raise OTPErrors.OTP_INVALID.throw(dynamic_message=f"Mã OTP không chính xác.\n Bạn còn {remain} lần thử.")

        verification_token = secrets.token_hex(16)

        await redis.set(f"verified-token:{reason}:{email}", verification_token, ex=300)
        await redis.delete(redis_key)

        return verification_token


auth_service = AuthService()