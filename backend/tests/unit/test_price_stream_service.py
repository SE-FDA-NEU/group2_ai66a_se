import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.price_stream_service import PriceStreamService


@pytest.mark.asyncio
async def test_publish_price_update_success(monkeypatch):
    service = PriceStreamService()
    mock_redis = AsyncMock()
    monkeypatch.setattr("app.services.price_stream_service.redis_client.redis", mock_redis)

    now = datetime(2026, 10, 18, 12, 0, tzinfo=timezone.utc)
    success = await service.publish_price_update(
        product_id=31,
        price=Decimal("199.99"),
        currency="USD",
        timestamp=now,
        is_gap=False,
        price_low=Decimal("189.00"),
        price_high=Decimal("250.00"),
    )

    assert success is True
    mock_redis.publish.assert_awaited_once()
    channel, raw_payload = mock_redis.publish.await_args[0]
    assert channel == "product_price_updates:31"

    payload = json.loads(raw_payload)
    assert payload["product_id"] == 31
    assert payload["price"] == "199.99"
    assert payload["currency"] == "USD"
    assert payload["is_gap"] is False
    assert payload["price_low"] == "189.00"
    assert payload["price_high"] == "250.00"


@pytest.mark.asyncio
async def test_publish_price_update_handles_redis_none(monkeypatch):
    service = PriceStreamService()
    monkeypatch.setattr("app.services.price_stream_service.redis_client.redis", None)

    success = await service.publish_price_update(
        product_id=31,
        price=Decimal("199.99"),
        currency="USD",
        timestamp=datetime.now(timezone.utc),
    )
    assert success is False


@pytest.mark.asyncio
async def test_publish_price_update_handles_exception(monkeypatch):
    service = PriceStreamService()
    mock_redis = AsyncMock()
    mock_redis.publish.side_effect = RuntimeError("Redis connection broken")
    monkeypatch.setattr("app.services.price_stream_service.redis_client.redis", mock_redis)

    success = await service.publish_price_update(
        product_id=31,
        price=Decimal("199.99"),
        currency="USD",
        timestamp=datetime.now(timezone.utc),
    )
    assert success is False


@pytest.mark.asyncio
async def test_subscribe_price_updates_yields_message_and_disconnects(monkeypatch):
    service = PriceStreamService()
    mock_pubsub = AsyncMock()
    test_payload = json.dumps({"product_id": 31, "price": "199.99"})
    
    # Message sequence: 1st call returns message, 2nd call None (keepalive)
    mock_pubsub.get_message = AsyncMock(
        side_effect=[
            {"type": "message", "data": test_payload},
            None,
        ]
    )

    mock_redis = MagicMock()
    mock_redis.pubsub.return_value = mock_pubsub
    monkeypatch.setattr("app.services.price_stream_service.redis_client.redis", mock_redis)

    # Mock request is_disconnected: False on first 2 checks, True on 3rd check to break loop
    mock_request = AsyncMock()
    mock_request.is_disconnected = AsyncMock(side_effect=[False, True])

    items = []
    async for event in service.subscribe_price_updates(product_id=31, request=mock_request):
        items.append(event)

    assert len(items) == 1
    assert items[0] == f"data: {test_payload}\n\n"
    mock_pubsub.subscribe.assert_awaited_once_with("product_price_updates:31")
    mock_pubsub.unsubscribe.assert_awaited_once_with("product_price_updates:31")
    mock_pubsub.close.assert_awaited_once()