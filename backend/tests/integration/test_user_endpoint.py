from unittest.mock import AsyncMock

import pytest

from app.api.deps import get_current_user
from app.models.user_model import User
from app.services import user_service as service_module


def _user(password_hashed="hashed-password", auth_provider="email"):
    return User(
        id=7,
        email="user7@example.com",
        nickname="Người dùng 7",
        password_hashed=password_hashed,
        auth_provider=auth_provider,
    )


@pytest.fixture
def current_user_override():
    from main import app

    app.dependency_overrides[get_current_user] = lambda: _user()
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_delete_account_with_correct_password(client, monkeypatch, current_user_override):
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)
    monkeypatch.setattr(service_module, "verify_password", AsyncMock(return_value=True))

    response = client.request("DELETE", "/api/v1/user/me", json={"password": "matkhau123"})

    assert response.status_code == 200
    assert response.json()["message"] == "Xóa tài khoản thành công"
    remove.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_account_rejects_wrong_password(client, monkeypatch, current_user_override):
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)
    monkeypatch.setattr(service_module, "verify_password", AsyncMock(return_value=False))

    response = client.request("DELETE", "/api/v1/user/me", json={"password": "sai-mat-khau"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_OLD_PASSWORD"
    remove.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_account_requires_proof(client, monkeypatch, current_user_override):
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)

    response = client.request("DELETE", "/api/v1/user/me", json={})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VERIFY_REQUIRED"
    remove.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_account_with_valid_otp_token(client, monkeypatch, current_user_override, redis_client):
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)
    redis_client.get.side_effect = lambda key: "token-123" if str(key).startswith("verified-token:") else None

    response = client.request("DELETE", "/api/v1/user/me", json={"verified_token": "token-123"})

    assert response.status_code == 200
    remove.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_account_rejects_invalid_otp_token(client, monkeypatch, current_user_override, redis_client):
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)
    redis_client.get.return_value = None

    response = client.request("DELETE", "/api/v1/user/me", json={"verified_token": "token-sai"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OTP_EXPIRED"
    remove.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_google_account_rejects_password(client, monkeypatch):
    from main import app

    app.dependency_overrides[get_current_user] = lambda: _user(password_hashed=None, auth_provider="google")
    remove = AsyncMock()
    monkeypatch.setattr(service_module.user_crud, "remove", remove)
    monkeypatch.setattr(service_module, "verify_password", AsyncMock(return_value=True))
    try:
        response = client.request("DELETE", "/api/v1/user/me", json={"password": "matkhau123"})

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_OLD_PASSWORD"
        remove.assert_not_awaited()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_send_delete_account_otp_requires_existing_user(client, monkeypatch):
    from app.crud.user_crud import user_crud

    monkeypatch.setattr(user_crud, "get_by_email", AsyncMock(return_value=None))

    response = client.post(
        "/api/v1/otp/send",
        json={"email": "missing@example.com", "reason": "delete-account"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "USER_NOT_FOUND"
