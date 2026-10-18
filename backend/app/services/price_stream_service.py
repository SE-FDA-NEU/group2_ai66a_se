import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import json
from typing import AsyncGenerator

from fastapi import Request

from app.core.logger import logger
from app.core.redis import redis_client


class PriceStreamService:
    CHANNEL_PREFIX = "product_price_updates"

    def get_channel_name(self, product_id: int) -> str:
        return f"{self.CHANNEL_PREFIX}:{product_id}"

    async def publish_price_update(
        self,
        product_id: int,
        price: Decimal,
        currency: str,
        timestamp: datetime,
        *,
        is_gap: bool = False,
        price_low: Decimal | None = None,
        price_high: Decimal | None = None,
    ) -> bool:
        """
        Bắn event cập nhật giá mới qua Redis Pub/Sub channel của sản phẩm.
        """
        if redis_client.redis is None:
            logger.debug("Redis client chưa kết nối, bỏ qua publish price update.")
            return False

        payload = {
            "product_id": product_id,
            "price": str(price),
            "currency": currency,
            "timestamp": (
                timestamp.isoformat()
                if timestamp.tzinfo is not None
                else timestamp.replace(tzinfo=timezone.utc).isoformat()
            ),
            "is_gap": is_gap,
            "price_low": str(price_low) if price_low is not None else None,
            "price_high": str(price_high) if price_high is not None else None,
        }

        channel = self.get_channel_name(product_id)
        try:
            await redis_client.redis.publish(channel, json.dumps(payload))
            logger.info("Đã bắn event cập nhật giá vào Redis channel %s: %s", channel, payload)
            return True
        except Exception:
            logger.exception("Lỗi khi publish price update vào Redis channel %s", channel)
            return False

    async def subscribe_price_updates(
        self, product_id: int, request: Request | None = None
    ) -> AsyncGenerator[str, None]:
        """
        Lắng nghe Redis channel và yield SSE event stream format ('data: ...\\n\\n').
        Tự động gửi heartbeat keep-alive định kỳ và dọn dẹp kết nối khi client ngắt kết nối.
        """
        channel = self.get_channel_name(product_id)

        if redis_client.redis is None:
            logger.warning("Redis client chưa kết nối khi client mở SSE stream cho product %s", product_id)
            yield f"data: {json.dumps({'error': 'Redis unavailable', 'product_id': product_id})}\n\n"
            return

        pubsub = redis_client.redis.pubsub()
        await pubsub.subscribe(channel)
        logger.info("Client đã mở SSE stream lắng nghe channel %s", channel)

        try:
            while True:
                # Kiểm tra nếu client đã ngắt kết nối (đóng tab / chuyển trang)
                if request is not None and await request.is_disconnected():
                    logger.info("Client đã ngắt kết nối SSE stream channel %s", channel)
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message and message.get("type") == "message":
                    raw_data = message.get("data")
                    if isinstance(raw_data, bytes):
                        raw_data = raw_data.decode("utf-8")
                    yield f"data: {raw_data}\n\n"
                else:
                    # Gửi dòng heartbeat comment để giữ kết nối không bị proxy / nginx timeout
                    yield ": keep-alive\n\n"

                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("SSE stream bị hủy (cancelled) cho channel %s", channel)
            raise
        except Exception:
            logger.exception("Lỗi trong quá trình stream SSE channel %s", channel)
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
                logger.info("Đã đóng pubsub channel %s an toàn", channel)
            except Exception:
                logger.exception("Lỗi khi đóng pubsub channel %s", channel)


price_stream_service = PriceStreamService()

