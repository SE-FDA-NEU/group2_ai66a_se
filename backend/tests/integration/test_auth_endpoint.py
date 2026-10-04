import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from typing import Optional
from unittest.mock import patch, AsyncMock
import json

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
    async def get(self, key):
        return FAKE_REDIS_DB.get(key)
    async def set(self, key, value, ex=None):
        FAKE_REDIS_DB[key] = value
    async def delete(self, key):
        if key in FAKE_REDIS_DB:
            del FAKE_REDIS_DB[key]

# --- FIXTURES ---
@pytest_asyncio.fixture(autouse=True)
async def setup_fakes():
    # Clear fakes before each test
    FAKE_USERS_DB.clear()
    FAKE_REDIS_DB.clear()
    yield

@pytest_asyncio.fixture
async def client():
    async_mock_db = AsyncMock()
    fake_redis = FakeRedis()

    app.dependency_overrides[get_db] = lambda: async_mock_db
    app.dependency_overrides[get_redis] = lambda: fake_redis

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
async def test_full_email_registration_and_login_flow(client: AsyncClient):
    """Đăng ký qua email -> Xác nhận OTP -> Login"""
    email = "test1@test.com"
    password_test = "password123"

    # 1. Send OTP
    response = await client.post(f"/api/v1/otp/send?email={email}&reason={OTPReason.VERIFY_EMAIL.value}")
    assert response.status_code == 200, response.text
    
    # 2. Get OTP from fake redis
    otp_key = f"otp:{OTPReason.VERIFY_EMAIL}:{email}"
    otp_data = json.loads(FAKE_REDIS_DB[otp_key])
    code = otp_data["code"]

    # 3. Verify OTP
    response = await client.post(f"/api/v1/otp/verify?email={email}&otp={code}&reason={OTPReason.VERIFY_EMAIL.value}")
    assert response.status_code == 200
    verify_token = response.json()["data"]["verified_token"]

    # 4. Register User
    payload = {
        "email": email,
        "nickname": "TestUser",
        "password": password_test
    }
    response = await client.post(f"/api/v1/auth/register?verify_token={verify_token}", json=payload)
    assert response.status_code == 201
    
    # 5. Login
    login_data = {"username": email, "password": password_test}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_google_login_new_user(client: AsyncClient):
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
async def test_email_then_google_login(client: AsyncClient):
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
async def test_google_then_email_register(client: AsyncClient):
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
    response = await client.post(f"/api/v1/auth/register?verify_token=fake_verify_token", json=payload)
    assert response.status_code == 201

    assert FAKE_USERS_DB[0].auth_provider == "both"
    assert FAKE_USERS_DB[0].password_hashed is not None

@pytest.mark.asyncio
async def test_forgot_password_flow(client: AsyncClient):
    """Quên mật khẩu -> Gửi OTP -> Xác thực -> Đặt lại mật khẩu"""
    # Arrange: Create user
    fake_crud = FakeUserCRUD()
    from app.core.security import hash_password
    hashed_pwd = await hash_password("old_password")
    email = "forgot@test.com"
    await fake_crud.create(None, email, "Forgot User", hashed_pwd, "email")

    # 1. Send OTP for forgot password
    response = await client.post(f"/api/v1/otp/send?email={email}&reason={OTPReason.RESET_PASSWORD.value}")
    assert response.status_code == 200
    
    # 2. Get OTP from fake redis
    otp_key = f"otp:{OTPReason.RESET_PASSWORD}:{email}"
    otp_data = json.loads(FAKE_REDIS_DB[otp_key])
    code = otp_data["code"]

    # 3. Verify OTP
    response = await client.post(f"/api/v1/otp/verify?email={email}&otp={code}&reason={OTPReason.RESET_PASSWORD.value}")
    assert response.status_code == 200
    verify_token = response.json()["data"]["verified_token"]

    # 4. Reset Password
    new_password_test = "new_secure_password"
    response = await client.post(f"/api/v1/auth/reset-password?email={email}&new_password={new_password_test}&verify_token={verify_token}")
    assert response.status_code == 200

    # 5. Verify Login with new password
    login_data = {"username": email, "password": new_password_test}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_otp_invalid_and_limit_exceeded(client: AsyncClient):
    """Test nhập sai mã OTP nhiều lần"""
    email = "otp@test.com"
    # Send OTP
    await client.post(f"/api/v1/otp/send?email={email}&reason={OTPReason.VERIFY_EMAIL.value}")
    
    # Verify with wrong OTP 5 times
    for i in range(5):
        response = await client.post(f"/api/v1/otp/verify?email={email}&otp=000000&reason={OTPReason.VERIFY_EMAIL.value}")
        assert response.status_code == 400
        
    # The 6th time should return limit exceeded regardless of code (wait, it deletes the key on 5th attempt)
    # So 6th attempt will return OTP expired/not exist
    response = await client.post(f"/api/v1/otp/verify?email={email}&otp=000000&reason={OTPReason.VERIFY_EMAIL.value}")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OTP_LIMIT_EXCEEDED"

