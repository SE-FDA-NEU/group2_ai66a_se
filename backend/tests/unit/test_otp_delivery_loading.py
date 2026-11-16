import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.exceptions import CustomAppException, ErrorDetail
from app.helper import otp as email_module
from app.schemas.otp_schema import OTPReason
from app.services import auth_service as auth_module


def test_smtp_has_bounded_operations_and_always_closes(monkeypatch):
    instances = []
    class SMTP:
        def __init__(self, **kwargs):
            assert kwargs["timeout"] == 5
            self.closed = False
            self.connect = AsyncMock()
            self.login = AsyncMock()
            self.send_message = AsyncMock()
            instances.append(self)
        def close(self): self.closed = True
    monkeypatch.setattr(email_module.aiosmtplib, "SMTP", SMTP)
    asyncio.run(email_module._send_email("test@example.test", "Test", "<p>Test</p>"))
    instances[0].send_message.assert_awaited_once()
    assert instances[0].closed


def test_smtp_timeout_is_reported_as_uncertain_and_closes(monkeypatch):
    smtp = SimpleNamespace(connect=AsyncMock(side_effect=asyncio.TimeoutError()), login=AsyncMock(), send_message=AsyncMock(), close=lambda: closed.append(True))
    closed = []
    monkeypatch.setattr(email_module.aiosmtplib, "SMTP", lambda **_: smtp)
    with pytest.raises(CustomAppException) as exc:
        asyncio.run(email_module._send_email("test@example.test", "Test", "Test"))
    assert exc.value.code == "OTP_DELIVERY_UNCERTAIN"
    assert closed == [True]


@pytest.mark.parametrize("uncertain", [True, False])
def test_delivery_uncertainty_preserves_code_but_definite_failure_rolls_back(monkeypatch, uncertain):
    class Redis:
        def __init__(self): self.values = {}
        async def get(self, key): return self.values.get(key)
        async def set(self, key, value, **kwargs): self.values[key] = value
        async def delete(self, key): self.values.pop(key, None)
    redis = Redis()
    monkeypatch.setattr(auth_module.user_crud, "get_by_email", AsyncMock(return_value=None))
    code = "OTP_DELIVERY_UNCERTAIN" if uncertain else "EMAIL_SEND_FAILED"
    monkeypatch.setattr(auth_module, "send_email", AsyncMock(side_effect=ErrorDetail(code, 504, "Test error").throw()))
    with pytest.raises(CustomAppException):
        asyncio.run(auth_module.auth_service.send_otp_email("test@example.test", "verify-email", SimpleNamespace(), redis))
    assert ("otp:verify-email:test@example.test" in redis.values) == uncertain
    assert any("cooldown" in key for key in redis.values) == uncertain


def test_brevo_api_sends_otp_when_brevo_api_key_is_set(monkeypatch):
    calls = []

    class FakeAsyncClient:
        def __init__(self, **kwargs):
            calls.append(("init", kwargs))

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, headers=None, json=None):
            calls.append(("post", url, headers, json))
            return SimpleNamespace(status_code=201, text='{"messageId":"<msg-1>"}')

    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", "xkeysib-test-key")
    monkeypatch.setattr(email_module.settings, "BREVO_SENDER_EMAIL", "sender@example.test")
    monkeypatch.setattr(email_module.settings, "BREVO_SENDER_NAME", "Trakora Security")
    monkeypatch.setattr(email_module.settings, "BREVO_API_URL", "https://api.brevo.com/v3/smtp/email")
    monkeypatch.setattr(email_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(
        email_module.aiosmtplib,
        "SMTP",
        lambda **_: (_ for _ in ()).throw(AssertionError("SMTP should not be called when BREVO_API_KEY is set")),
    )

    asyncio.run(email_module._send_email("user@example.test", "OTP Subject", "<p>123456</p>"))

    assert calls[0] == ("init", {"timeout": 15.0})
    post_call = calls[1]
    assert post_call[0] == "post"
    assert post_call[1] == "https://api.brevo.com/v3/smtp/email"
    assert post_call[2]["api-key"] == "xkeysib-test-key"
    assert post_call[3]["sender"] == {"name": "Trakora Security", "email": "sender@example.test"}
    assert post_call[3]["to"] == [{"email": "user@example.test"}]
    assert post_call[3]["subject"] == "OTP Subject"
    assert post_call[3]["htmlContent"] == "<p>123456</p>"


def test_brevo_timeout_is_reported_as_uncertain(monkeypatch):
    class TimeoutAsyncClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, headers=None, json=None):
            raise httpx.ReadTimeout("Brevo timed out")

    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", "xkeysib-test-key")
    monkeypatch.setattr(email_module.httpx, "AsyncClient", TimeoutAsyncClient)

    with pytest.raises(CustomAppException) as exc:
        asyncio.run(email_module._send_email("user@example.test", "OTP Subject", "<p>123456</p>"))

    assert exc.value.code == "OTP_DELIVERY_UNCERTAIN"
    assert exc.value.status_code == 504


def test_brevo_http_error_raises_email_send_failed(monkeypatch):
    class ErrorAsyncClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, headers=None, json=None):
            return SimpleNamespace(status_code=401, text='{"message":"Key not found"}')

    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", "xkeysib-invalid-key")
    monkeypatch.setattr(email_module.httpx, "AsyncClient", ErrorAsyncClient)

    with pytest.raises(CustomAppException) as exc:
        asyncio.run(email_module._send_email("user@example.test", "OTP Subject", "<p>123456</p>"))

    assert exc.value.code == "EMAIL_SEND_FAILED"
    assert exc.value.status_code == 500


def test_send_otp_allows_new_reason_when_previous_reason_had_cooldown_or_was_verified(monkeypatch):
    class Redis:
        def __init__(self):
            self.values = {}

        async def get(self, key):
            return self.values.get(key)

        async def set(self, key, value, **kwargs):
            self.values[key] = value

        async def delete(self, key):
            self.values.pop(key, None)

    redis = Redis()
    send_mock = AsyncMock()
    monkeypatch.setattr(auth_module, "send_email", send_mock)
    monkeypatch.setattr(
        auth_module.user_crud,
        "get_by_email",
        AsyncMock(side_effect=[SimpleNamespace(id=1, email="user@example.test"), None, None]),
    )

    async def scenario():
        # 1. User requests and verifies delete-account OTP -> cooldown key is cleared
        await auth_module.auth_service.send_otp_email(
            "user@example.test", OTPReason.DELETE_ACCOUNT, SimpleNamespace(), redis
        )
        delete_otp = json.loads(redis.values[f"otp:{OTPReason.DELETE_ACCOUNT}:user@example.test"])["code"]
        assert "otp-cooldown:user@example.test" in redis.values
        await auth_module.auth_service.verify_otp_email(
            "user@example.test", OTPReason.DELETE_ACCOUNT, delete_otp, redis
        )
        assert "otp-cooldown:user@example.test" not in redis.values

        # 2. Even if an active cooldown key exists from another reason, a fresh verify-email OTP is still sent
        redis.values["otp-cooldown:user@example.test"] = "9999999999.0"
        await auth_module.auth_service.send_otp_email(
            "user@example.test", OTPReason.VERIFY_EMAIL, SimpleNamespace(), redis
        )
        assert send_mock.await_count == 2
        assert f"otp:{OTPReason.VERIFY_EMAIL}:user@example.test" in redis.values

        # 3. Sending a second verify-email OTP while the first is still active is blocked by cooldown
        with pytest.raises(CustomAppException) as exc:
            await auth_module.auth_service.send_otp_email(
                "user@example.test", OTPReason.VERIFY_EMAIL, SimpleNamespace(), redis
            )
        assert exc.value.code == "OTP_COOLDOWN_ACTIVE"

    asyncio.run(scenario())
