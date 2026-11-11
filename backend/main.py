from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from admin import create_admin_user
from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.exceptions import (
    CustomAppException,
    global_app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.logger import logger
from app.core.database import AsyncSessionLocal, engine, get_db
from app.core.redis import get_redis, redis_client

from app.api.v1.api import api_router
from app.services.dev_service import dev_service
from app.services.price_monitor_service import price_monitor_service
from app.services.notification_service import run_email_delivery_forever


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động kết nối tới Redis
    try:
        await redis_client.connect()
    except Exception as e:
        logger.error(f"Không thể kết nối tới Redis lúc khởi chạy: {e}")

    async with AsyncSessionLocal() as session:
        try:
            await create_admin_user(session)
        except Exception as e:
            logger.error(f"không thể tạo tài khoản Admin: {e}")
    price_monitor_task = asyncio.create_task(price_monitor_service.run_forever())
    notification_email_task = asyncio.create_task(run_email_delivery_forever())
    try:
        yield
    finally:
        price_monitor_task.cancel()
        notification_email_task.cancel()
        try:
            await price_monitor_task
        except asyncio.CancelledError:
            pass
        try:
            await notification_email_task
        except asyncio.CancelledError:
            pass
        # Đóng các kết nối dùng chung khi ứng dụng shutdown.
        await redis_client.close()
        await engine.dispose()

app = FastAPI(title=settings.PROJECT_NAME,
              version="1.0.0",
              lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.add_exception_handler(CustomAppException, global_app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

@app.get("/", tags=["Root"])
def read_root():
    return {"success": f"Welcome to {settings.PROJECT_NAME} API!"}


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"], include_in_schema=False)
async def public_health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Public health check returning 200 when PostgreSQL and Redis are healthy, 503 otherwise."""
    await dev_service.check_health(db=db, redis=redis)
    return {"status": "ok", "database": "connected", "redis": "connected"}

