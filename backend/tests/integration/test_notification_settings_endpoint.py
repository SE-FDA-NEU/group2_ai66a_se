from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user_model import User
from app.models.product_model import NotificationPreference, SaleEvent


@pytest.mark.asyncio
async def test_notification_settings_can_be_read_and_updated():
    db = AsyncMock()
    user = User(id=42, email="van@example.com", nickname="Van")
    settings = NotificationPreference(
        user_id=42,
        email_enabled=True,
        quiet_hours_enabled=False,
        sale_alert_enabled=False,
        quiet_start=None,
        quiet_end=None,
        timezone="Asia/Ho_Chi_Minh",
    )
    updated_settings = NotificationPreference(
        user_id=42,
        email_enabled=True,
        quiet_hours_enabled=True,
        sale_alert_enabled=True,
        quiet_start="23:00",
        quiet_end="07:00",
        timezone="Asia/Ho_Chi_Minh",
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch("app.api.v1.endpoints.notification_router.notification_settings_crud") as crud:
            crud.get_or_create = AsyncMock(return_value=settings)
            crud.update = AsyncMock(return_value=updated_settings)
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                read = await client.get("/api/v1/notifications/settings")
                assert read.status_code == 200
                assert read.json()["data"]["timezone"] == "Asia/Ho_Chi_Minh"
                assert read.json()["data"]["sale_alert_enabled"] is False

                updated = await client.patch("/api/v1/notifications/settings", json={
                    "email_enabled": True,
                    "quiet_hours_enabled": True,
                    "sale_alert_enabled": True,
                    "quiet_start": "23:00:00",
                    "quiet_end": "07:00:00",
                    "timezone": "Asia/Ho_Chi_Minh",
                })
                assert updated.status_code == 200
                assert updated.json()["data"]["sale_alert_enabled"] is True
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


@pytest.mark.asyncio
async def test_admin_sale_calendar_crud_and_trigger():
    db = AsyncMock()
    admin = User(id=1, email="admin@example.com", nickname="Admin", is_developer=True)
    now = datetime(2026, 11, 10, 0, 0, tzinfo=timezone.utc)
    sale = SaleEvent(
        id=1,
        name="11.11 Mega Sale",
        description="Big sale",
        marketplace="shopee",
        start_at=now + timedelta(days=1),
        end_at=now + timedelta(days=2),
        is_active=True,
        created_by=1,
        created_at=now,
        updated_at=None,
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: admin
    try:
        with patch("app.api.v1.endpoints.sale_router.sale_event_crud") as crud, patch(
            "app.api.v1.endpoints.sale_router.process_due_sale_alerts",
            new=AsyncMock(return_value=3),
        ) as trigger_mock:
            crud.list_all = AsyncMock(return_value=[sale])
            crud.create = AsyncMock(return_value=sale)
            crud.get = AsyncMock(return_value=sale)
            crud.update = AsyncMock(return_value=sale)
            crud.delete = AsyncMock(return_value=None)

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                listed = await client.get("/api/v1/admin/sales")
                assert listed.status_code == 200
                assert listed.json()["data"]["sales"][0]["name"] == "11.11 Mega Sale"

                listed_public = await client.get("/api/v1/sales")
                assert listed_public.status_code == 200

                created = await client.post(
                    "/api/v1/admin/sales",
                    json={
                        "name": "11.11 Mega Sale",
                        "description": "Big sale",
                        "marketplace": "shopee",
                        "start_at": (now + timedelta(days=1)).isoformat(),
                        "end_at": (now + timedelta(days=2)).isoformat(),
                        "is_active": True,
                    },
                )
                assert created.status_code == 201
                assert created.json()["data"]["id"] == 1
                crud.create.assert_awaited_once()

                updated = await client.patch(
                    "/api/v1/admin/sales/1",
                    json={"name": "11.11 Super Sale"},
                )
                assert updated.status_code == 200
                crud.update.assert_awaited_once()

                triggered = await client.post("/api/v1/admin/sales/trigger-alerts")
                assert triggered.status_code == 200
                assert triggered.json()["data"]["notified_count"] == 3
                assert trigger_mock.await_count >= 1

                deleted = await client.delete("/api/v1/admin/sales/1")
                assert deleted.status_code == 200
                assert deleted.json()["data"]["id"] == 1
                crud.delete.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_sale_rejects_end_date_before_start_date():
    db = AsyncMock()
    admin = User(id=1, email="admin@example.com", nickname="Admin", is_developer=True)
    now = datetime(2026, 11, 10, 0, 0, tzinfo=timezone.utc)
    sale = SaleEvent(
        id=1,
        name="11.11 Mega Sale",
        start_at=now + timedelta(days=2),
        end_at=now + timedelta(days=3),
        is_active=True,
        created_at=now,
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            invalid_create = await client.post(
                "/api/v1/admin/sales",
                json={
                    "name": "Invalid Sale",
                    "start_at": (now + timedelta(days=2)).isoformat(),
                    "end_at": (now + timedelta(days=1)).isoformat(),
                },
            )
            assert invalid_create.status_code == 422
            assert "End date must be after the start date" in str(invalid_create.json())

            with patch("app.api.v1.endpoints.sale_router.sale_event_crud") as crud:
                crud.get = AsyncMock(return_value=sale)
                crud.update = AsyncMock(side_effect=ValueError("End date must be after the start date"))
                invalid_update = await client.put(
                    "/api/v1/admin/sales/1",
                    json={"end_at": (now + timedelta(days=1)).isoformat()},
                )
                assert invalid_update.status_code == 422
                assert "End date must be after the start date" in str(invalid_update.json())
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method,path,body",
    [
        ("POST", "/api/v1/admin/sales", {"name": "11.11", "start_at": "2026-11-11T00:00:00Z"}),
        ("PUT", "/api/v1/admin/sales/1", {"name": "11.11"}),
        ("PATCH", "/api/v1/admin/sales/1", {"name": "11.11"}),
        ("DELETE", "/api/v1/admin/sales/1", None),
        ("POST", "/api/v1/admin/sales/trigger-alerts", None),
    ],
)
async def test_regular_user_is_forbidden_from_managing_sales(method, path, body):
    db = AsyncMock()
    regular_user = User(id=42, email="van@example.com", nickname="Van", is_developer=False)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: regular_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.request(method, path, json=body)
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_unauthenticated_sale_endpoints_return_401():
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            get_resp = await client.get("/api/v1/sales")
            post_resp = await client.post(
                "/api/v1/admin/sales",
                json={"name": "11.11", "start_at": "2026-11-11T00:00:00Z"},
            )
        assert get_resp.status_code == 401
        assert post_resp.status_code == 401
    finally:
        app.dependency_overrides.clear()
