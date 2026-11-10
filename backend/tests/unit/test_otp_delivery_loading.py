import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import CustomAppException, ErrorDetail
from app.helper import otp as email_module
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
