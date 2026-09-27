from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.crud.base import CRUDBase
from app.models.user_model import User
from app.schemas.user_schema import UserCreate

class CRUDUser(CRUDBase[User]):
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Truy vấn người dùng bằng Email bất đồng bộ"""
        result = await db.execute(select(self.model).where(self.model.email == email))
        return result.scalars().first()


    async def create(self, db: AsyncSession, obj_in: UserCreate, hashed_password: str, auth_provider: str) -> User:
        """Tạo mới một người dùng vào Database"""
        db_obj = User(
            email=obj_in.email,
            nickname=obj_in.nickname,
            password_hashed=hashed_password,
            auth_provider=auth_provider,
            is_activate=True
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


    async def update(self, db: AsyncSession, db_obj: User, obj_in: dict) -> User:
        """Cập nhật thông tin người dùng"""
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


    async def set_admin(self, email: str, db: AsyncSession) -> None:
        """Thiết lập Admin cho các tài khoản email khác"""
        stmt = (
            update(self.model)
            .where(self.model.email == email)
            .values(is_developer=True)
        )
        await db.execute(stmt)
        await db.commit()


# Khởi tạo một thực thể dùng chung (Singleton) cho toàn ứng dụng
user_crud = CRUDUser(User)