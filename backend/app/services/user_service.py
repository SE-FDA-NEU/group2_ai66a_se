from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user_crud import user_crud
from app.schemas.user_schema import UserCreate, UserErrors
from app.models.user_model import User
from app.core.security import hash_password

class UserService:
    async def get_all_users(self, page: int, limit: int, current_user: User, db: AsyncSession) -> List[User]:
        """Nghiệp vụ lấy toàn bộ người dùng"""
        return await user_crud.get_all_users(page=page, limit=limit, current_user_id=current_user.id, db=db)


    async def register_new_user(self, db: AsyncSession, user_in: UserCreate) -> User:
        """Nghiệp vụ đăng ký tài khoản mới"""
        # 1. Kiểm tra Email trùng lặp qua tầng CRUD
        existing_user = await user_crud.get_by_email(db, email=user_in.email)
        if existing_user:
            raise UserErrors.EMAIL_ALREADY_EXISTS.throw()

        # 2. Mã hóa mật khẩu bất đồng bộ (Giải phóng Event Loop)
        hashed_pwd = await hash_password(user_in.password)

        # 3. Ra lệnh cho CRUD lưu xuống Database
        return await user_crud.create(db, obj_in=user_in, hashed_password=hashed_pwd)

# Khởi tạo thực thể dùng chung
user_service = UserService()