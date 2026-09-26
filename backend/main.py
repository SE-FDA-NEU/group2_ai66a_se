from fastapi import FastAPI
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
from app.core.database import AsyncSessionLocal
from app.core.redis import redis_client

from app.api.v1.api import api_router


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
            
    yield
    # Đóng kết nối Redis
    await redis_client.close()

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
