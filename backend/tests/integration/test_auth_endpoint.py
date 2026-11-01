import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from typing import Optional
from unittest.mock import patch, AsyncMock
import json
import time

from main import app
from app.core.database import get_db
from app.core.redis import get_redis
from app.models.user_model import User
from app.schemas.otp_schema import OTPReason

# --- FAKE STORAGE ---
FAKE_USERS_DB = []
FAKE_REDIS_DB = {}

class FakeUserCRUD:
    async def get_by_email(self, db, email: str) -> Optional[User]:
        for u in FAKE_USERS_DB:
            if u.email == email:
                return u
        return None

    async def create(self, db, email, nickname, hashed_password, auth_provider="email", google_sub=None):
        new_id = len(FAKE_USERS_DB) + 1
        new_user = User(
            id=new_id,
            email=email,
            nickname=nickname,
            password_hashed=hashed_password,
            auth_provider=auth_provider,
            google_sub=google_sub,
            is_activate=True,
            is_developer=False
        )
        FAKE_USERS_DB.append(new_user)
        return new_user

    async def update(self, db, db_obj: User, obj_in: dict):
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        return db_obj

class FakeRedis:
    def __init__(self):
        self.expirations = {}
        self.time_offset = 0

    def now(self):
        return time.monotonic() + self.time_offset

    def advance(self, seconds):
        self.time_offset += seconds

    def clear(self):
        FAKE_REDIS_DB.clear()
        self.expirations.clear()
        self.time_offset = 0

    async def get(self, key):
        expires_at = self.expirations.get(key)
        if expires_at is not None and self.now() >= expires_at:
            await self.delete(key)
            return None
        return FAKE_REDIS_DB.get(key)

    async def set(self, key, value, ex=None):
        FAKE_REDIS_DB[key] = value
        if ex is not None:
            self.expirations[key] = self.now() + ex
        else:
            self.expirations.pop(key, None)

    async def ttl(self, key):
        expires_at = self.expirations.get(key)
        if key not in FAKE_REDIS_DB or expires_at is None:
            return -1
        return max(0, int(expires_at - self.now()))

    async def delete(self, key):
        if key in FAKE_REDIS_DB:
            del FAKE_REDIS_DB[key]
        self.expirations.pop(key, None)


FAKE_REDIS = FakeRedis()

# --- FIXTURES ---
@pytest_asyncio.fixture(autouse=True)
async def setup_fakes():
    # Clear fakes before each test
    FAKE_USERS_DB.clear()
    FAKE_REDIS.clear()
    yield

@pytest_asyncio.fixture
async def client():
    async_mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: async_mock_db
    app.dependency_overrides[get_redis] = lambda: FAKE_REDIS

    # Patch user_crud and external services
    fake_crud = FakeUserCRUD()
    with patch("app.services.user_service.user_crud", fake_crud), \
         patch("app.services.auth_service.user_crud", fake_crud), \
         patch("app.services.auth_service.send_email") as mock_send_email, \
         patch("app.services.auth_service.verify_google_id_token") as mock_verify_google:
        
        # Make verify_google_id_token return a dynamic payload based on the token
        async def fake_verify(token):
            if token == "invalid":
                raise ValueError("Invalid token")
            return {
                "sub": f"g_sub_{token}",
                "email": f"{token}@gmail.com",
                "name": f"Google {token}"
            }
        mock_verify_google.side_effect = fake_verify

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
    
    app.dependency_overrides.clear()


# --- TESTS ---

@pytest.mark.asyncio
async def test_us04_tc_001_full_email_registration_and_login_flow(client: AsyncClient):
    """Đăng ký qua email -> Xác nhận OTP -> Login"""
    email = "test1@test.com"
    password_test = "password123"

    # 1. Send OTP
    response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 200, response.text
    
    # 2. Get OTP from fake redis
    otp_key = f"otp:{OTPReason.VERIFY_EMAIL}:{email}"
    otp_data = json.loads(FAKE_REDIS_DB[otp_key])
    code = otp_data["code"]

    # 3. Verify OTP
    response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": code, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 200
    verify_token = response.json()["data"]["verified_token"]

    # 4. Register User
    payload = {
        "email": email,
        "nickname": "TestUser",
        "password": password_test
    }
    response = await client.post("/api/v1/auth/register", json={**payload, "verify_token": verify_token})
    assert response.status_code == 201
    
    # 5. Login
    login_data = {"username": email, "password": password_test}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_us04_tc_002_google_login_new_user(client: AsyncClient):
    """Đăng nhập Google lần đầu -> Tự động đăng ký"""
    token = "newuser" # mapped to newuser@gmail.com in fake_verify
    response = await client.post("/api/v1/auth/google", json={"id_token": token})
    assert response.status_code == 200
    assert "access_token" in response.json()

    # Check db
    assert len(FAKE_USERS_DB) == 1
    assert FAKE_USERS_DB[0].email == "newuser@gmail.com"
    assert FAKE_USERS_DB[0].auth_provider == "google"

@pytest.mark.asyncio
async def test_us04_tc_005_email_then_google_login(client: AsyncClient):
    """Người dùng đã đăng ký bằng email, sau đó đăng nhập bằng Google"""
    # Register email manually for test
    fake_crud = FakeUserCRUD()
    from app.core.security import hash_password
    hashed_pwd = await hash_password("password123")
    user = await fake_crud.create(None, "email_first@gmail.com", "Email User", hashed_pwd, "email")
    
    # Login Google
    token = "email_first" 
    response = await client.post("/api/v1/auth/google", json={"id_token": token})
    assert response.status_code == 200

    # Verify updated user
    assert FAKE_USERS_DB[0].auth_provider == "both"
    assert FAKE_USERS_DB[0].google_sub == "g_sub_email_first"

@pytest.mark.asyncio
async def test_us04_tc_006_google_then_email_register(client: AsyncClient):
    """Người dùng đã đăng nhập Google, sau đó đăng ký/cập nhật mật khẩu bằng email"""
    fake_crud = FakeUserCRUD()
    user = await fake_crud.create(None, "google_first@gmail.com", "Google User", None, "google", "g_sub_google_first")
    
    email = "google_first@gmail.com"
    # Bypass OTP verify by injecting token
    FAKE_REDIS_DB[f"verified-token:{OTPReason.VERIFY_EMAIL}:{email}"] = "fake_verify_token"
    
    payload = {
        "email": email,
        "nickname": "Google User Updated",
        "password": "new_password_123"
    }
    response = await client.post("/api/v1/auth/register", json={**payload, "verify_token": "fake_verify_token"})
    assert response.status_code == 201

    assert FAKE_USERS_DB[0].auth_provider == "both"
    assert FAKE_USERS_DB[0].password_hashed is not None

@pytest.mark.asyncio
async def test_us04_tc_003_forgot_password_flow(client: AsyncClient):
    """Quên mật khẩu -> Gửi OTP -> Xác thực -> Đặt lại mật khẩu"""
    # Arrange: Create user
    fake_crud = FakeUserCRUD()
    from app.core.security import hash_password
    hashed_pwd = await hash_password("old_password")
    email = "forgot@test.com"
    await fake_crud.create(None, email, "Forgot User", hashed_pwd, "email")

    # 1. Send OTP for forgot password
    response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.RESET_PASSWORD.value})
    assert response.status_code == 200
    
    # 2. Get OTP from fake redis
    otp_key = f"otp:{OTPReason.RESET_PASSWORD}:{email}"
    otp_data = json.loads(FAKE_REDIS_DB[otp_key])
    code = otp_data["code"]

    # 3. Verify OTP
    response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": code, "reason": OTPReason.RESET_PASSWORD.value})
    assert response.status_code == 200
    verify_token = response.json()["data"]["verified_token"]

    # 4. Reset Password
    new_password_test = "new_secure_password"
    response = await client.post("/api/v1/auth/reset-password", json={"email": email, "new_password": new_password_test, "verify_token": verify_token})
    assert response.status_code == 200

    # 5. Verify Login with new password
    login_data = {"username": email, "password": new_password_test}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_us04_tc_004_otp_fifth_wrong_attempt_is_allowed_then_limit_exceeded(client: AsyncClient):
    """Test nhập sai mã OTP nhiều lần"""
    email = "otp@test.com"
    # Send OTP
    await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    
    # Verify with wrong OTP 5 times
    for i in range(5):
        response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": "000000", "reason": OTPReason.VERIFY_EMAIL.value})
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "OTP_INVALID"
        
    # The 6th attempt is blocked because the five failed attempts exhausted the limit.
    response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": "000000", "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OTP_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_us04_tc_010_otp_is_valid_just_before_five_minute_expiry(client: AsyncClient):
    """An OTP can still be verified one second before its five-minute TTL."""
    email = "otp-before-expiry@test.com"
    response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 200

    otp_key = f"otp:{OTPReason.VERIFY_EMAIL}:{email}"
    code = json.loads(FAKE_REDIS_DB[otp_key])["code"]
    FAKE_REDIS.advance(299)

    response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": code, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 200
    assert response.json()["data"]["verified_token"]


@pytest.mark.asyncio
async def test_us04_tc_011_otp_expires_at_five_minute_limit(client: AsyncClient):
    """An OTP is rejected once its five-minute TTL has elapsed."""
    email = "otp-at-expiry@test.com"
    response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 200

    otp_key = f"otp:{OTPReason.VERIFY_EMAIL}:{email}"
    code = json.loads(FAKE_REDIS_DB[otp_key])["code"]
    FAKE_REDIS.advance(300)

    response = await client.post("/api/v1/otp/verify", json={"email": email, "otp": code, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OTP_EXPIRED"


@pytest.mark.asyncio
async def test_us04_tc_007_google_only_password_reset_is_blocked(client: AsyncClient):
    """Test chặn yêu cầu gửi OTP reset password cho tài khoản đăng ký Google thuần túy"""
    google_email = "google_user@test.com"
    # Tạo user Google thuần túy (không có password_hashed)
    FAKE_USERS_DB.append(
        User(
            id=99,
            email=google_email,
            nickname="Google User",
            password_hashed=None,
            auth_provider="google",
            google_sub="google-sub-12345",
            is_activate=True,
            is_developer=False,
        )
    )

    response = await client.post(
        "/api/v1/otp/send",
        json={"email": google_email, "reason": OTPReason.RESET_PASSWORD.value},
    )
    assert response.status_code == 400
    res_json = response.json()
    assert res_json["error"]["code"] == "GOOGLE_ACCOUNT_NO_PASSWORD"


@pytest.mark.asyncio
async def test_us04_tc_008_otp_resend_inside_cooldown_is_blocked(client: AsyncClient):
    """Test cơ chế chặn gửi lại mã OTP trong vòng 60 giây (Cooldown)"""
    email = "cooldown@test.com"
    # Gửi OTP lần 1 -> Thành công (200)
    response1 = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response1.status_code == 200

    # Gửi lại ngay lập tức -> Bị chặn 429 OTP_COOLDOWN_ACTIVE
    response2 = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response2.status_code == 429
    res_json = response2.json()
    assert res_json["error"]["code"] == "OTP_COOLDOWN_ACTIVE"
    assert "Vui lòng đợi" in res_json["error"]["message"]


@pytest.mark.asyncio
async def test_us04_tc_009_otp_hourly_limit_fifth_allowed_sixth_blocked(client: AsyncClient):
    """Test cơ chế giới hạn tối đa 5 lần gửi OTP trong vòng 1 giờ"""
    email = "hourly@test.com"
    # Gửi thành công 5 lần (giả lập xóa cooldown giữa các lần để kiểm tra hạn ngạch 1 giờ)
    for _ in range(5):
        FAKE_REDIS_DB.pop(f"otp-cooldown:{email}", None)
        response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
        assert response.status_code == 200

    # Lần thứ 6 -> Bị chặn 429 OTP_MAX_REQUESTS_EXCEEDED
    FAKE_REDIS_DB.pop(f"otp-cooldown:{email}", None)
    response_blocked = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
    assert response_blocked.status_code == 429
    res_json = response_blocked.json()
    assert res_json["error"]["code"] == "OTP_MAX_REQUESTS_EXCEEDED"
    assert "quá 5 lần" in res_json["error"]["message"]


@pytest.mark.asyncio
async def test_otp_send_smtp_failure_rollback(client: AsyncClient):
    """Test rollback dữ liệu trong Redis khi gửi mail qua SMTP thất bại"""
    email = "smtp_fail@test.com"
    with patch("app.services.auth_service.send_email", side_effect=Exception("SMTP Connection Error")):
        response = await client.post("/api/v1/otp/send", json={"email": email, "reason": OTPReason.VERIFY_EMAIL.value})
        assert response.status_code == 500
        # Kiểm tra Redis: key OTP và cooldown không được lưu lại để người dùng không bị kẹt cooldown
        assert f"otp:{OTPReason.VERIFY_EMAIL.value}:{email}" not in FAKE_REDIS_DB
        assert f"otp-cooldown:{email}" not in FAKE_REDIS_DB


