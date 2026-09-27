import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

app = FastAPI(title="Google Auth Sandbox")

# THAY CLIENT ID CỦA BẠN VÀO ĐÂY
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID

# =====================================================================
# 1. GIẢ LẬP DATABASE BẢNG USERS (Để bạn quan sát sự thay đổi trạng thái)
# =====================================================================
FAKE_USERS_DB = [
    {
        "id": 1,
        "email": f"{settings.ADMIN_EMAIL}",  # Giả sử điền email thật của bạn vào đây để test gộp tài khoản
        "nickname": "Admin",
        "password_hashed": "$2b$12$hashed_password_example",
        "auth_provider": "email",
        "google_sub": None,
        "is_activate": True,
    }
]


class GoogleTokenRequest(BaseModel):
    id_token: str


# =====================================================================
# 2. HÀM CỐT LÕI: XÁC THỰC TOKEN VỚI GOOGLE SERVER
# =====================================================================
def verify_google_token(token: str) -> dict:
    """
    Hàm này tải Public Key của Google về, kiểm tra chữ ký RS256,
    thời gian hết hạn (exp) và kiểm tra xem token có đúng là cấp cho
    GOOGLE_CLIENT_ID của bạn không.
    """
    try:
        payload = id_token.verify_oauth2_token(
            id_token=token,
            request=google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
        )
        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Token không hợp lệ: {str(e)}")


# =====================================================================
# 3. ENDPOINT XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ GOOGLE
# =====================================================================
@app.post("/auth/google")
def google_login(body: GoogleTokenRequest):
    # Bước 1: Giải mã id_token từ Google gửi lên
    google_payload = verify_google_token(body.id_token)

    print("\n================ DỮ LIỆU GOOGLE TRẢ VỀ ================")
    for k, v in google_payload.items():
        print(f"  {k}: {v}")
    print("=======================================================\n")

    # Lấy các trường quan trọng nhất từ Google Payload
    google_sub = google_payload["sub"]          # ID duy nhất của Google (không bao giờ đổi)
    email = google_payload["email"].lower()     # Email người dùng
    name = google_payload.get("name", email.split("@")[0])

    # Bước 2: Tìm theo google_sub trước (User đã từng đăng nhập Google)
    for user in FAKE_USERS_DB:
        if user["google_sub"] == google_sub:
            return {
                "case": "ĐÃ CÓ GOOGLE_SUB -> Đăng nhập thẳng",
                "google_payload_extracted": {"sub": google_sub, "email": email, "name": name},
                "user_in_db": user,
            }

    # Bước 3: Chưa có google_sub -> Tìm theo email (Xem đã đăng ký bằng OTP thường chưa)
    for user in FAKE_USERS_DB:
        if user["email"] == email:
            # Đã đăng ký thường -> Cập nhật thêm google_sub và chuyển thành 'both'
            user["google_sub"] = google_sub
            user["auth_provider"] = "both" if user["password_hashed"] else "google"
            return {
                "case": "ĐÃ CÓ EMAIL THƯỜNG -> Cập nhật google_sub và đổi auth_provider = 'both'",
                "google_payload_extracted": {"sub": google_sub, "email": email, "name": name},
                "user_in_db": user,
            }

    # Bước 4: Hoàn toàn mới -> Tạo user mới với auth_provider = 'google'
    new_user = {
        "id": len(FAKE_USERS_DB) + 1,
        "email": email,
        "nickname": name,
        "password_hashed": None,
        "auth_provider": "google",
        "google_sub": google_sub,
        "is_activate": True,
    }
    FAKE_USERS_DB.append(new_user)

    return {
        "case": "USER MỚI HOÀN TOÀN -> Tạo mới với auth_provider = 'google'",
        "google_payload_extracted": {"sub": google_sub, "email": email, "name": name},
        "user_in_db": new_user,
    }


# =====================================================================
# 4. GIAO DIỆN TEST TRỰC TIẾP TRÊN TRÌNH DUYỆT (http://localhost:8000)
# =====================================================================
@app.get("/", response_class=HTMLResponse)
def test_ui():
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Test Google Auth</title>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <style>
            body {{ font-family: sans-serif; max-width: 750px; margin: 40px auto; line-height: 1.5; }}
            pre {{ background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; }}
        </style>
    </head>
    <body>
        <h2>Demo luồng hoạt động của <code>google-auth</code></h2>
        <p>Bấm nút dưới đây để lấy <code>id_token</code> từ Google và gửi về <code>POST /auth/google</code>:</p>

        <!-- Nút đăng nhập chính chủ của Google -->
        <div id="g_id_onload"
             data-client_id="{GOOGLE_CLIENT_ID}"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin" data-type="standard" data-size="large"></div>

        <h3>Kết quả xử lý từ Backend:</h3>
        <pre id="output">Chưa đăng nhập...</pre>

        <script>
            async function handleCredentialResponse(response) {{
                // response.credential chính là chuỗi JWT id_token do Google ký
                console.log("Raw Google ID Token:", response.credential);

                const res = await fetch("/auth/google", {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json" }},
                    body: JSON.stringify({{ id_token: response.credential }})
                }});
                const data = await res.json();
                document.getElementById("output").textContent = JSON.stringify(data, null, 2);
            }}
        </script>
    </body>
    </html>
    """


if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)