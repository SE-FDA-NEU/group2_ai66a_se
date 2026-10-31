from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.models.product_model import UserNotification


@pytest.mark.asyncio
async def test_list_unseen_and_mark_seen_notifications():
    db = AsyncMock()
    user = User(id=42, email="van@example.com", nickname="Van")
    unseen = UserNotification(
        id=7,
        user_id=42,
        product_id=101,
        kind="good_price",
        title="Giá tốt rồi!",
        message="Sản phẩm đang có giá tốt.",
        created_at=datetime.now(timezone.utc),
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch("app.api.v1.endpoints.notification_router.notification_crud") as crud:
            crud.list_unseen = AsyncMock(return_value=[unseen])
            crud.mark_seen = AsyncMock(return_value=1)
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                listed = await client.get("/api/v1/notifications")
                assert listed.status_code == 200
                notifications = listed.json()["data"]["notifications"]
                assert len(notifications) == 1
                assert notifications[0]["id"] == 7
                crud.list_unseen.assert_awaited_once_with(db, 42)

                marked = await client.post("/api/v1/notifications/seen", json={"ids": [7]})
                assert marked.status_code == 200
                assert marked.json()["data"]["count"] == 1
                crud.mark_seen.assert_awaited_once_with(db, 42, [7])
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_mark_seen_rejects_empty_ids():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: User(id=42, email="van@example.com", nickname="Van")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/notifications/seen", json={"ids": []})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
