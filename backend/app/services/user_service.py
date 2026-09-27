from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user_crud import user_crud
from app.schemas.user_schema import UserCreate, UserErrors, UserUpdate, PasswordUpdate
from app.models.user_model import User
from app.core.security import hash_password, verify_password

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

        new_user = await user_crud.create(
            db,
            email=user_in.email,
            nickname=user_in.nickname,
            hashed_password=hashed_pwd,
        )
        return new_user

    async def update_user_info(self, db: AsyncSession, user: User, user_in: UserUpdate) -> User:
        """Nghiệp vụ cập nhật thông tin người dùng"""
        updated_user = await user_crud.update(
            db,
            db_obj=user,
            obj_in=user_in.model_dump(exclude_unset=True),
        )
        return updated_user

    async def update_user_password(self, db: AsyncSession, user: User, password_in: PasswordUpdate) -> User:
        """Nghiệp vụ cập nhật mật khẩu người dùng"""
        if not user.password_hashed or not await verify_password(password_in.old_password, user.password_hashed):
            raise UserErrors.INVALID_OLD_PASSWORD.throw()

        hashed_new_password = await hash_password(password_in.new_password)
        updated_user = await user_crud.update(
            db,
            db_obj=user,
            obj_in={
                "password_hashed": hashed_new_password
            }
        )
        return updated_user

    async def reset_user_password(self, db: AsyncSession, email: str, new_password: str) -> User:
        """Nghiệp vụ đặt lại mật khẩu người dùng"""
        user = await user_crud.get_by_email(db, email=email)
        if not user:
            raise UserErrors.USER_NOT_FOUND.throw()

        hashed_new_password = await hash_password(new_password)
        updated_user = await user_crud.update(
            db,
            db_obj=user,
            obj_in={
                "password_hashed": hashed_new_password
            }
        )
        return updated_user


user_service = UserService()