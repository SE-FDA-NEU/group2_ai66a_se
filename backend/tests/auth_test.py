import asyncio
import json
import re
from unittest.mock import AsyncMock, patch

import pytest
import redis
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.user_model import User
from main import app


TEST_EMAIL = "pytest_register@example.com"
BR13_EMAIL = "pytest_br13@example.com"


def find_endpoint(suffix: str) -> str:
    """Find an endpoint by its unique path suffix."""
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.endswith(suffix):
            return path
    return f"{settings.API_V1_STR}{suffix}"


SEND_URL = find_endpoint("/otp/send")
VERIFY_URL = find_endpoint("/otp/verify")
REGISTER_URL = find_endpoint("/auth/register/email")


def get_redis_client():
    """Return a synchronous Redis client for test setup and cleanup."""
    try:
        client = redis.Redis.from_url(
            settings.get_redis_url,
            decode_responses=True,
        )
        client.ping()
        return client
    except redis.RedisError:
        return None
    return None


def delete_test_data() -> None:
    """Remove test users and OTP keys from PostgreSQL and Redis."""
    async def delete_users() -> None:
        engine = create_async_engine(settings.get_database_url, pool_pre_ping=True)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            await session.execute(
                delete(User).where(User.email.in_([TEST_EMAIL, BR13_EMAIL]))
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(delete_users())

    redis_client = get_redis_client()
    if redis_client:
        for email in (TEST_EMAIL, BR13_EMAIL):
            for key in redis_client.keys(f"*{email}*"):
                redis_client.delete(key)
        redis_client.close()


@pytest.fixture
def client():
    """Start the FastAPI lifespan so Redis is initialized for each test."""
    with TestClient(app) as test_client:
        yield test_client
    delete_test_data()


def configure_smtp_mock(mock_smtp):
    """Make the SMTP mock behave like the async SMTP client used by the app."""
    smtp = mock_smtp.return_value
    smtp.connect = AsyncMock()
    smtp.login = AsyncMock()
    smtp.send_message = AsyncMock()
    smtp.quit = AsyncMock()
    return smtp


def get_otp_code(email: str) -> str:
    redis_client = get_redis_client()
    assert redis_client is not None, "Redis is not available"

    try:
        keys = redis_client.keys(f"otp:*:{email}")
        assert keys, f"No OTP key found for {email}"
        payload = redis_client.get(keys[0])
        assert payload is not None
        return json.loads(payload)["code"]
    finally:
        redis_client.close()


def test_send_otp_invalid_email(client):
    response = client.post(SEND_URL, params={"email": "not-an-email"})

    assert response.status_code == 422, response.text


@patch("app.helper.otp.aiosmtplib.SMTP")
def test_full_registration_flow(mock_smtp, client):
    smtp = configure_smtp_mock(mock_smtp)

    send_response = client.post(SEND_URL, params={"email": TEST_EMAIL})
    assert send_response.status_code == 200, send_response.text
    smtp.send_message.assert_awaited_once()

    otp_code = get_otp_code(TEST_EMAIL)
    assert re.fullmatch(r"\d{6}", otp_code)

    verify_response = client.post(
        VERIFY_URL,
        params={"email": TEST_EMAIL, "otp": otp_code},
    )
    assert verify_response.status_code == 200, verify_response.text
    verified_token = verify_response.json()["data"]["verified_token"]
    assert verified_token

    register_response = client.post(
        REGISTER_URL,
        params={"verify_token": verified_token},
        json={
            "nickname": "pytest_user",
            "email": TEST_EMAIL,
            "password": "Password123!",
        },
    )
    assert register_response.status_code == 201, register_response.text


@patch("app.helper.otp.aiosmtplib.SMTP")
def test_verify_otp_exceed_max_attempts(mock_smtp, client):
    configure_smtp_mock(mock_smtp)

    send_response = client.post(SEND_URL, params={"email": BR13_EMAIL})
    assert send_response.status_code == 200, send_response.text

    for _ in range(5):
        response = client.post(
            VERIFY_URL,
            params={"email": BR13_EMAIL, "otp": "000000"},
        )
        assert response.status_code == 400, response.text

    locked_response = client.post(
        VERIFY_URL,
        params={"email": BR13_EMAIL, "otp": "000000"},
    )
    assert locked_response.status_code == 400, locked_response.text
