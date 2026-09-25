import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from redis.asyncio import Redis

from app.core.config import settings
from app.core.logger import logger
from app.schemas.otp_schema import OTPErrors

sender_email = settings.ADMIN_EMAIL
sender_password = settings.ADMIN_PASSWORD

async def verify_action_token(email: str, reason: str, token: str, redis: Redis) -> None:
    """Hàm kiểm tra OTP đã được xác thực hay chưa"""
    token_key = f"verified-token:{reason}:{email}"

    saved_token = await redis.get(token_key)

    if not saved_token or saved_token.decode("utf-8") != token:
        raise OTPErrors.OTP_EXPIRED.throw()

    await redis.delete(token_key)

def _get_otp_html_content(otp: str) -> tuple[str, str]:
    """Trả về (Tiêu đề email, Nội dung HTML email) cho xác minh tài khoản"""
    subject = "Xác thực tài khoản - Trakora App"
    title = "Xác thực tài khoản của bạn"
    description = "Cảm ơn bạn đã sử dụng dịch vụ tại <strong>Trakora App</strong>. Vui lòng sử dụng mã OTP bên dưới để hoàn tất việc xác thực tài khoản của bạn:"

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #334155;
            line-height: 1.6;
        }}
        .wrapper {{
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding: 40px 0;
        }}
        .container {{
            max-width: 540px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            color: #ffffff;
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #0f172a;
        }}
        .text {{
            font-size: 15px;
            color: #475569;
            margin-bottom: 30px;
        }}
        .otp-container {{
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 30px;
            border: 1px dashed #cbd5e1;
        }}
        .otp-code {{
            font-family: "Courier New", Courier, monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 6px;
            color: #1d4ed8;
            margin: 0;
            display: inline-block;
        }}
        .meta-info {{
            font-size: 13px;
            color: #64748b;
            text-align: center;
            margin-bottom: 20px;
        }}
        .warning {{
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            margin-top: 20px;
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Trakora App</h1>
            </div>
            <div class="content">
                <div class="greeting">Xin chào,</div>
                <div class="text">
                    {description}
                </div>
                <div class="otp-container">
                    <div class="otp-code">{otp}</div>
                </div>
                <div class="meta-info">
                    Mã xác thực này có hiệu lực trong vòng <strong>5 phút</strong>.
                </div>
                <div class="warning">
                    Nếu bạn không yêu cầu thực hiện hành động này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ nếu nghi ngờ tài khoản bị xâm nhập.
                </div>
            </div>
            <div class="footer">
                &copy; 2026 Trakora App. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
"""
    return subject, html

def _send_email_sync(to_email: str, subject: str, html_content: str) -> None:
    """Hàm gửi email đồng bộ chạy trong thread pool"""
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"Trakora Security <{sender_email}>"
    message["To"] = to_email

    part = MIMEText(html_content, "html", "utf-8")
    message.attach(part)

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(message)
        server.quit()
        logger.info(f"Gửi mã OTP qua email đến {to_email} thành công.")
    except Exception as e:
        logger.error(f"Lỗi gửi email đến {to_email}: {e}", exc_info=True)
        raise OTPErrors.EMAIL_SEND_FAILED.throw()

async def send_email(email: str, otp: str) -> None:
    """Hàm gửi mã OTP cho người dùng bất đồng bộ"""
    subject, html_content = _get_otp_html_content(otp)
    await asyncio.to_thread(_send_email_sync, email, subject, html_content)