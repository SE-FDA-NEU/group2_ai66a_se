from fastapi import FastAPI
import asyncio
from admin import create_admin_user
from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
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
from app.core.database import AsyncSessionLocal, engine
from app.core.redis import redis_client

from app.api.v1.api import api_router
from app.services.price_monitor_service import price_monitor_service


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
    try:
        yield
    finally:
        price_monitor_task.cancel()
        try:
            await price_monitor_task
        except asyncio.CancelledError:
            pass
        # Đóng các kết nối dùng chung khi ứng dụng shutdown.
        await redis_client.close()
        await engine.dispose()

app = FastAPI(title=settings.PROJECT_NAME,
              version="1.0.0",
              lifespan=lifespan)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.add_exception_handler(CustomAppException, global_app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

@app.get("/", tags=["Root"])
def read_root():
    return {"success": f"Welcome to {settings.PROJECT_NAME} API!"}
