from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user_model import User
from app.schemas.token_schema import TokenData, AuthErrors
from app.core.config import settings
from app.core.logger import logger
from app.crud.user_crud import user_crud

secret_key = settings.SECRET_KEY
algorithm = settings.ALGORITHM

oauth_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
        db: AsyncSession = Depends(get_db),
        token: str = Depends(oauth_scheme)
) -> User:
    """
    Hàm xác thực danh tính của user qua token
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise AuthErrors.UNAUTHORIZED.throw()

        token_data = TokenData(user_id=user_id)
    except JWTError as e:
        logger.error(f"Lỗi kiểm tra JWT: {str(e)}")
        raise AuthErrors.UNAUTHORIZED.throw()

    user = await user_crud.get(db, id=int(token_data.user_id))

    if user is None:
        raise AuthErrors.UNAUTHORIZED.throw()

    return user


async def get_current_user_from_token_or_query(
    token: str | None = None,
    token_header: str | None = Depends(oauth_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Xác thực user qua Authorization header hoặc query parameter ?token= (dành cho EventSource/SSE).
    """
    effective_token = token_header or token
    if not effective_token:
        raise AuthErrors.UNAUTHORIZED.throw()

    try:
        payload = jwt.decode(effective_token, secret_key, algorithms=[algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthErrors.UNAUTHORIZED.throw()
        token_data = TokenData(user_id=user_id)
    except JWTError as e:
        logger.error(f"Lỗi kiểm tra JWT: {str(e)}")
        raise AuthErrors.UNAUTHORIZED.throw()

    user = await user_crud.get(db, id=int(token_data.user_id))
    if user is None:
        raise AuthErrors.UNAUTHORIZED.throw()

    return user


async def get_current_developer(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    Hàm xác thực danh tính của developer qua token
    """
    if not current_user.is_developer:
        raise AuthErrors.NOT_DEVELOPER.throw()
    return current_user
