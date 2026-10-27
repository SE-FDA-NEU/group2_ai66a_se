import json
import secrets
import time

from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from fastapi.security import OAuth2PasswordRequestForm

from app.crud.user_crud import user_crud

from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.core.exceptions import CustomAppException
from app.core.logger import logger

from app.schemas.token_schema import AuthErrors
from app.schemas.user_schema import UserErrors
from app.schemas.otp_schema import OTPReason, OTPErrors
from app.schemas.google_schema import GoogleTokenRequest

from app.helper.google_auth import verify_google_id_token
from app.helper.otp import send_email

class AuthService:
    async def authenticate_user(self, db: AsyncSession, form_data: OAuth2PasswordRequestForm) -> dict:
        """Nghiệp vụ xác thực thông tin đăng nhập và cấp Token"""
        user = await user_crud.get_by_email(db, email=form_data.username)

        if not user or not user.is_activate or not user.password_hashed or not await verify_password(form_data.password, user.password_hashed):
            raise AuthErrors.INVALID_LOGIN.throw()

        access_token = create_access_token(subject=user.id, is_developer=user.is_developer)
        return {
            "access_token": access_token, 
            "token_type": "bearer"
        }


    async def authenticate_google(self, db: AsyncSession, google_token: GoogleTokenRequest) -> dict:
        """Nghiệp vụ xác thực thông tin đăng nhập bằng Google và cấp Token"""
        logger.info("Bắt đầu xử lý đăng nhập Google...")
        google_payload = await verify_google_id_token(google_token.id_token)
        google_sub = google_payload["sub"]
        email = google_payload["email"].lower()
        logger.info(f"Xác thực Google ID token thành công cho email: {email}, sub: {google_sub}")

        user = await user_crud.get_by_email(db, email=email)

        if not user:
            logger.info(f"Tạo người dùng mới từ Google: {email}")
            user = await user_crud.create(
                db,
                email=email,
                nickname=google_payload.get("name") or email.split("@", 1)[0],
                hashed_password=None,
                auth_provider="google",
                google_sub=google_sub,
            )

        if user and user.auth_provider == "email":
            logger.info(f"Liên kết tài khoản Google cho người dùng email: {email}")
            user = await user_crud.update(
                db,
                db_obj=user, 
                obj_in={
                    "google_sub": google_sub, 
                    "auth_provider": "both"
                    }
                )
        elif user and not user.google_sub:
            user = await user_crud.update(
                db,
                db_obj=user,
                obj_in={"google_sub": google_sub}
            )

        if not user.is_activate:
            logger.warning(f"Tài khoản người dùng chưa kích hoạt: {email}")
            raise AuthErrors.INVALID_LOGIN.throw(dynamic_message="Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt.")

        access_token = create_access_token(subject=user.id, is_developer=user.is_developer)
        logger.info(f"Đăng nhập Google thành công, đã cấp Access Token cho user ID: {user.id}")
        return {
            "access_token": access_token, 
            "token_type": "bearer"
        }


    async def send_otp_email(self, email: str, reason: OTPReason, db: AsyncSession, redis: Redis) -> None:
        """Nghiệp vụ gửi mã OTP kèm cơ chế chống spam (cooldown & rate limit)"""
        email = email.strip().lower()
        existed_user = await user_crud.get_by_email(db, email=email)

        if reason == OTPReason.VERIFY_EMAIL:
            if existed_user:
                if existed_user.auth_provider != "google":
                    raise UserErrors.EMAIL_ALREADY_EXISTS.throw()
        elif reason == OTPReason.RESET_PASSWORD:
            if not existed_user:
                raise UserErrors.USER_NOT_FOUND.throw()
            if existed_user.auth_provider == "google" and not existed_user.password_hashed:
                raise UserErrors.GOOGLE_ACCOUNT_NO_PASSWORD.throw()

        now = time.time()
        cooldown_key = f"otp-cooldown:{email}"
        hourly_key = f"otp-hourly:{email}"

        # 1. Kiểm tra giới hạn số lần yêu cầu OTP trong 1 giờ (Tối đa settings.OTP_MAX_REQUESTS_PER_HOUR lần/giờ)
        hourly_data = await redis.get(hourly_key)
        hourly_count = 0
        if hourly_data:
            try:
                hourly_count = int(hourly_data)
            except (ValueError, TypeError):
                hourly_count = 0

        if hourly_count >= settings.OTP_MAX_REQUESTS_PER_HOUR:
            raise OTPErrors.OTP_MAX_REQUESTS_EXCEEDED.throw(
                dynamic_message=f"Bạn đã yêu cầu gửi mã OTP quá {settings.OTP_MAX_REQUESTS_PER_HOUR} lần trong vòng 1 giờ. Vui lòng thử lại sau."
            )

        # 2. Kiểm tra Cooldown giữa các lần gửi (Tối thiểu settings.OTP_RESEND_COOLDOWN_SECONDS giây)
        cooldown_data = await redis.get(cooldown_key)
        if cooldown_data:
            try:
                expire_at = float(cooldown_data)
                remaining = max(1, int(expire_at - now))
            except (ValueError, TypeError):
                remaining = settings.OTP_RESEND_COOLDOWN_SECONDS

            if remaining > 0:
                raise OTPErrors.OTP_COOLDOWN_ACTIVE.throw(
                    dynamic_message=f"Vui lòng đợi {remaining} giây trước khi yêu cầu gửi lại mã OTP."
                )

        # 3. Tạo mã OTP mới
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        payload = json.dumps({"code": code, "attempts": 0})
        otp_key = f"otp:{reason}:{email}"

        # Lưu OTP và trạng thái Cooldown & Rate Limit vào Redis
        await redis.set(otp_key, payload, ex=settings.OTP_EXPIRE_SECONDS)
        await redis.set(cooldown_key, str(now + settings.OTP_RESEND_COOLDOWN_SECONDS), ex=settings.OTP_RESEND_COOLDOWN_SECONDS)

        # Cập nhật số lần gửi trong 1 giờ
        new_hourly_count = hourly_count + 1
        await redis.set(hourly_key, str(new_hourly_count), ex=3600)

        # 4. Gửi email qua SMTP (nếu lỗi -> rollback Redis)
        try:
            await send_email(email=email, otp=code)
        except Exception as e:
            await redis.delete(otp_key)
            await redis.delete(cooldown_key)
            if hourly_count > 0:
                await redis.set(hourly_key, str(hourly_count), ex=3600)
            else:
                await redis.delete(hourly_key)
            if isinstance(e, CustomAppException):
                raise e
            raise OTPErrors.EMAIL_SEND_FAILED.throw()


    async def verify_otp_email(self, email: str, reason: OTPReason, otp: str, redis: Redis) -> str:
        """Nghiệp vụ xác minh mã OTP"""
        email = email.strip().lower()
        redis_key = f"otp:{reason}:{email}"

        otp_data = await redis.get(redis_key)

        if not otp_data:
            raise OTPErrors.OTP_EXPIRED.throw()

        otp_data = json.loads(otp_data)

        if otp_data.get("attempts", 0) >= settings.OTP_MAX_ATTEMPTS:
            await redis.delete(redis_key)
            raise OTPErrors.OTP_LIMIT_EXCEEDED.throw(
                dynamic_message="Bạn đã nhập sai mã OTP quá 5 lần. Mã hiện tại đã bị hủy để đảm bảo an toàn. Vui lòng yêu cầu mã mới."
            )

        if otp_data["code"] != otp:
            current_attempts = otp_data.get("attempts", 0) + 1
            otp_data["attempts"] = current_attempts
            remain = settings.OTP_MAX_ATTEMPTS - current_attempts

            ttl = settings.OTP_EXPIRE_SECONDS
            if hasattr(redis, "ttl"):
                try:
                    t = await redis.ttl(redis_key)
                    if t and t > 0:
                        ttl = t
                except Exception:
                    pass

            await redis.set(redis_key, json.dumps(otp_data), ex=ttl)

            if remain > 0:
                raise OTPErrors.OTP_INVALID.throw(
                    dynamic_message=f"Mã OTP không chính xác. Bạn còn {remain} lần thử."
                )
            else:
                raise OTPErrors.OTP_INVALID.throw(
                    dynamic_message="Mã OTP không chính xác. Bạn đã hết 5 lần thử. Vui lòng nhấn 'Gửi lại mã' để nhận mã mới."
                )

        verification_token = secrets.token_hex(16)

        await redis.set(f"verified-token:{reason}:{email}", verification_token, ex=settings.OTP_EXPIRE_SECONDS)
        await redis.delete(redis_key)

        return verification_token


    async def verify_action_token(self, email: str, reason: OTPReason, token: str, redis: Redis) -> None:
        """Nghiệp vụ xác minh token hành động (sau khi xác thực OTP)"""
        email = email.strip().lower()
        token_key = f"verified-token:{reason}:{email}"
        saved_token = await redis.get(token_key)

        if not saved_token or saved_token != token:
            raise OTPErrors.OTP_EXPIRED.throw()

        await redis.delete(token_key)


auth_service = AuthService()