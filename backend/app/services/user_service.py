from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user_crud import user_crud
from app.schemas.user_schema import UserCreate, UserErrors
from app.models.user_model import User
from app.core.security import hash_password

class UserService:
    async def register_by_email(self, db: AsyncSession, user_in: UserCreate) -> User:
        """Nghiệp vụ đăng ký tài khoản mới bằng email"""
        existing_user = await user_crud.get_by_email(db, email=user_in.email)
        if existing_user and existing_user.auth_provider != "google":
            raise UserErrors.EMAIL_ALREADY_EXISTS.throw()

        hashed_pwd = await hash_password(user_in.password)

        if existing_user and existing_user.auth_provider == "google":
            updated_user = await user_crud.update(
                db,
                db_obj=existing_user,
                obj_in={
                    "password_hashed": hashed_pwd,
                    "auth_provider": "both",
                }
            )
            return updated_user

        new_user =  await user_crud.create(db, obj_in=user_in, hashed_password=hashed_pwd, auth_provider="email")
        return new_user

user_service = UserService()