from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from app.core.exceptions import ErrorDetail

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    nickname: str
    password: str

class UserRegisterRequest(UserCreate):
    verify_token: str

class UserUpdate(BaseModel):
    nickname: str = Field(min_length=1)

class PasswordUpdate(BaseModel):
    old_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=8)
    verify_token: str

class UserResponse(UserBase):
    id: int
    nickname: str
    is_activate: Optional[bool] = True
    is_developer: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class UserErrors:
    EMAIL_ALREADY_EXISTS = ErrorDetail("EMAIL_ALREADY_EXISTS", 400, "Email này đã tồn tại.")
    USER_NOT_FOUND = ErrorDetail("USER_NOT_FOUND", 404, "Không tìm thấy người dùng này.")
    INVALID_OLD_PASSWORD = ErrorDetail("INVALID_OLD_PASSWORD", 400, "Mật khẩu cũ không chính xác.")