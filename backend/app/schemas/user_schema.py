from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.exceptions import ErrorDetail

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    nickname: str
    password: str

class UserResponse(UserBase):
    id: int
    nickname: str
    is_activate: Optional[bool] = True
    is_developer: Optional[bool] = False

    class Config:
        from_attributes = True

class UserErrors:
    EMAIL_ALREADY_EXISTS = ErrorDetail("EMAIL_ALREADY_EXISTS", 400, "Email này đã tồn tại.")
    USER_NOT_FOUND = ErrorDetail("USER_NOT_FOUND", 404, "Không tìm thấy người dùng này.")