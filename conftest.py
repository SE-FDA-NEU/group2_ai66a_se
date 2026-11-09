"""Deterministic test-only configuration; never requires a private .env file."""
import os

# Set before importing app modules. Values are intentionally fake and local.
os.environ.update({
    "PROJECT_NAME": "Trakora Test", "API_V1_STR": "/api/v1",
    "ADMIN_USERNAME": "test-admin", "ADMIN_EMAIL": "admin@example.com",
    "ADMIN_PASSWORD": "test-password-only", "SECRET_KEY": "test-only-secret-not-for-production",
    "ALGORITHM": "HS256", "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
    "POSTGRES_USER": "test", "POSTGRES_PASSWORD": "test", "POSTGRES_DB": "test",
    "HOST_PORT_DB": "5432", "HOST_PORT_REDIS": "6379",
    "DATABASE_URL": "postgresql+asyncpg://test:test@127.0.0.1:1/test",
    "REDIS_URL": "redis://127.0.0.1:1/0", "REDIS_PASSWORD": "",
    "GOOGLE_CLIENT_ID": "test-client-id", "RAPIDAPI_KEY": "test-key",
})


def pytest_collection_modifyitems(items):
    import pytest
    modules = {"test_target_price_service.py", "test_price_monitor_service.py",
               "test_notification_history.py", "test_notification_service.py",
               "test_notification_email.py", "test_notification_seen_endpoint.py",
               "test_notification_settings_endpoint.py", "test_issue185_repository.py",
               "test_issue185_interface.py"}
    for item in items:
        if item.path.name in modules:
            item.add_marker(pytest.mark.issue185)


# This is a manual Google OAuth demo, not an automated assertion test.
collect_ignore = ["backend/tests/unit/test_google-auth.py"]

import pytest


@pytest.fixture(autouse=True)
def notification_tests_are_offline(request, monkeypatch):
    if not request.node.get_closest_marker("issue185"):
        yield
        return
    import httpx
    import asyncpg
    import aiosmtplib
    from redis.asyncio import Redis
    attempts = []

    def blocked(*args, **kwargs):
        attempts.append("external I/O")
        raise AssertionError("Issue 185 tests must use fakes or temporary SQLite, never real services")

    async def blocked_async(*args, **kwargs):
        blocked(*args, **kwargs)

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", blocked)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", blocked_async)
    monkeypatch.setattr(asyncpg, "connect", blocked_async)
    monkeypatch.setattr(Redis, "execute_command", blocked_async)
    monkeypatch.setattr(aiosmtplib.SMTP, "connect", blocked_async)
    yield
    assert not attempts, "Test attempted external I/O, even if the application swallowed the error"
