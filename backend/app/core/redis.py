import redis.asyncio as aioredis
from typing import Optional
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logger import logger

class RedisClient:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        """
        Khởi tạo kết nối Redis bất đồng bộ sử dụng Connection Pool.
        """
        try:
            # Tạo instance Redis bất đồng bộ sử dụng URL
            self.redis = aioredis.from_url(
                settings.get_redis_url,
                decode_responses=True,  # Tự động decode bytes thành string
                socket_timeout=5.0
            )
            # Ping thử kết nối để đảm bảo hoạt động
            await self.redis.ping()
            logger.info("Kết nối tới Redis thành công!")
        except Exception:
            # Connection exceptions may contain a credential-bearing Redis URL.
            logger.error("Redis connection failed; check REDIS_URL and service availability.")
            self.redis = None
            raise

    async def close(self) -> None:
        """
        Đóng kết nối Redis an toàn khi ứng dụng shutdown.
        """
        if self.redis:
            try:
                await self.redis.aclose()
                logger.info("Đóng kết nối Redis thành công!")
            except Exception:
                logger.error("Redis connection cleanup failed.")
            finally:
                self.redis = None

# Một instance duy nhất dùng chung toàn app
redis_client = RedisClient()

async def get_redis() -> aioredis.Redis:
    """
    Dependency helper cho FastAPI Endpoints.
    """
    if redis_client.redis is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis is unavailable. Please try again later.",
        )
    return redis_client.redis
