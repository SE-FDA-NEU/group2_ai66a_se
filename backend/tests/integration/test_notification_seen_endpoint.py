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


@pytest.mark.asyncio
async def test_history_endpoint_includes_seen_items_and_uses_current_user():
    db = AsyncMock()
    user = User(id=42, email="van@example.com", nickname="Van")
    item = UserNotification(id=9, user_id=42, kind="good_price", title="Giá tốt",
                            message="Sản phẩm đang có giá tốt.", created_at=datetime.now(timezone.utc),
                            seen_at=datetime.now(timezone.utc))
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch("app.api.v1.endpoints.notification_router.notification_crud") as crud:
            crud.list_recent = AsyncMock(return_value=[item])
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/notifications/history?user_id=7&limit=100")
            assert response.status_code == 200
            assert response.json()["data"]["notifications"][0]["seen_at"] is not None
            crud.list_recent.assert_awaited_once_with(db, 42)
            crud.mark_seen.assert_not_called()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize("count,status", [(0, 422), (199, 200), (200, 200), (201, 422)],
                         ids=["empty", "below-200", "at-200", "above-200"])
async def test_N185_SEEN_02_request_boundaries(count, status):
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: User(id=42, email="van@example.com", nickname="Van")
    try:
        with patch("app.api.v1.endpoints.notification_router.notification_crud") as crud:
            crud.mark_seen = AsyncMock(return_value=count)
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/notifications/seen", json={"ids": list(range(1, count + 1))})
            assert response.status_code == status
            if status == 422:
                crud.mark_seen.assert_not_awaited()
                db.commit.assert_not_awaited()
            else:
                crud.mark_seen.assert_awaited_once_with(db, 42, list(range(1, count + 1)))
                db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize("path,method", [("/api/v1/notifications", "GET"),
                                         ("/api/v1/notifications/history", "GET"),
                                         ("/api/v1/notifications/seen", "POST")])
async def test_N185_HIST_02_unauthenticated_access_is_rejected(path, method):
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.request(method, path, json={"ids": [7]} if method == "POST" else None)
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
