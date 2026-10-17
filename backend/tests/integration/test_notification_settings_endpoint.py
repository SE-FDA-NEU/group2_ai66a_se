from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.models.product_model import NotificationPreference


@pytest.mark.asyncio
async def test_notification_settings_can_be_read_and_updated():
    db = AsyncMock()
    user = User(id=42, email="van@example.com", nickname="Van")
    settings = NotificationPreference(
        user_id=42,
        email_enabled=True,
        quiet_hours_enabled=False,
        quiet_start=None,
        quiet_end=None,
        timezone="Asia/Ho_Chi_Minh",
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch("app.api.v1.endpoints.notification_router.notification_settings_crud") as crud:
            crud.get_or_create = AsyncMock(return_value=settings)
            crud.update = AsyncMock(return_value=settings)
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                read = await client.get("/api/v1/notifications/settings")
                assert read.status_code == 200
                assert read.json()["data"]["timezone"] == "Asia/Ho_Chi_Minh"

                updated = await client.patch("/api/v1/notifications/settings", json={
                    "email_enabled": True,
                    "quiet_hours_enabled": True,
                    "quiet_start": "23:00:00",
                    "quiet_end": "07:00:00",
                    "timezone": "Asia/Ho_Chi_Minh",
                })
                assert updated.status_code == 200
                crud.update.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_notification_settings_reject_invalid_timezone():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: User(id=42, email="van@example.com", nickname="Van")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.patch("/api/v1/notifications/settings", json={"timezone": "Mars/Olympus"})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
