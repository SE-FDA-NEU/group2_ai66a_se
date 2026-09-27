from pydantic import BaseModel, Field

from app.core.exceptions import ErrorDetail


class GoogleTokenRequest(BaseModel):
    """Google ID token được gửi từ Frontend sau khi đăng nhập bằng Google Sign-In."""
    id_token: str = Field(min_length=1)

class GoogleErrorResponse:
    """Response model cho Google authentication lỗi."""
    GOOGLE_AUTH_FAILED = ErrorDetail("GOOGLE_AUTH_FAILED", 401, "Xác thực Google thất bại. Vui lòng thử lại.")