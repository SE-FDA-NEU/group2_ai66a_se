import asyncio
from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings
from app.schemas.google_schema import GoogleErrorResponse


async def verify_google_id_token(token: str) -> dict[str, Any]:
	"""Kiểm tra tính hợp lệ của Google ID token và trả về payload nếu hợp lệ, nếu không thì ném ra lỗi."""
	try:
		payload = await asyncio.to_thread(
			id_token.verify_oauth2_token,
			token,
			google_requests.Request(),
			settings.GOOGLE_CLIENT_ID,
		)
	except (ValueError, TypeError):
		raise GoogleErrorResponse.GOOGLE_AUTH_FAILED.throw()

	google_sub = payload.get("sub")
	email = payload.get("email", "").lower()
	if not google_sub or not email or not payload.get("email_verified", False):
		raise GoogleErrorResponse.GOOGLE_AUTH_FAILED.throw()

	return payload
