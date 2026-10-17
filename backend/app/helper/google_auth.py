import asyncio
import base64
import json
from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings
from app.core.logger import logger
from app.schemas.google_schema import GoogleErrorResponse


def _decode_unverified_claims(token: str) -> dict[str, Any]:
	"""Giải mã phần claims (payload) mà không cần xác minh chữ ký nhằm mục đích logging/debug."""
	try:
		parts = token.split(".")
		if len(parts) >= 2:
			padding = 4 - len(parts[1]) % 4
			padded = parts[1] + ("=" * (padding % 4))
			return json.loads(base64.urlsafe_b64decode(padded))
	except Exception:
		pass
	return {}


async def verify_google_id_token(token: str) -> dict[str, Any]:
	"""Kiểm tra tính hợp lệ của Google ID token và trả về payload nếu hợp lệ, nếu không thì ném ra lỗi."""
	unverified = _decode_unverified_claims(token)
	logger.info(
		f"Xác thực Google ID Token - Claims nhận được: "
		f"aud={unverified.get('aud')}, iss={unverified.get('iss')}, email={unverified.get('email')}, exp={unverified.get('exp')}"
	)

	expected_client_id = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None

	try:
		payload = await asyncio.to_thread(
			id_token.verify_oauth2_token,
			token,
			google_requests.Request(),
			expected_client_id,
			clock_skew_in_seconds=120,
		)
	except Exception as e:
		logger.error(f"Xác thực Google ID token thất bại: {type(e).__name__} - {str(e)}")
		raise GoogleErrorResponse.GOOGLE_AUTH_FAILED.throw(
			dynamic_message=f"Xác thực Google thất bại: {str(e)}"
		)

	google_sub = payload.get("sub")
	email = payload.get("email", "").lower()
	email_verified = payload.get("email_verified")
	is_verified = email_verified is True or str(email_verified).lower() == "true"

	if not google_sub or not email:
		logger.error(f"Google payload thiếu sub hoặc email: sub={google_sub}, email={email}")
		raise GoogleErrorResponse.GOOGLE_AUTH_FAILED.throw(
			dynamic_message="Google token không chứa thông tin email hoặc định danh hợp lệ."
		)

	if not is_verified:
		logger.error(f"Google email chưa được xác minh: {payload}")
		raise GoogleErrorResponse.GOOGLE_AUTH_FAILED.throw(
			dynamic_message="Email tài khoản Google của bạn chưa được xác minh."
		)

	return payload
