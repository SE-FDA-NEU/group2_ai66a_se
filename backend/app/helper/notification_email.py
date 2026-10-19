import html
from decimal import Decimal

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logger import logger
from app.schemas.notification_schema import NotificationErrors, NotificationKind

sender_email = settings.ADMIN_EMAIL
sender_password = settings.ADMIN_PASSWORD


def _format_price(price: Decimal | str, currency: str) -> str:
    return f"{price} {currency}"


def _get_notification_html_content(
    kind: NotificationKind,
    product_name: str,
    current_price: Decimal | str,
    currency: str,
    product_url: str,
    target_price: Decimal | str | None = None,
) -> tuple[str, str]:
    """Trả về (Tiêu đề email, Nội dung HTML email) cho một thông báo giá."""
    safe_name = html.escape(str(product_name))
    safe_url = html.escape(str(product_url), quote=True)
    safe_currency = html.escape(str(currency))
    current = html.escape(str(current_price))
    target = html.escape(str(target_price)) if target_price is not None else None

    if str(currency).upper() == "USD":
        try:
            vnd_current = round(Decimal(str(current_price)) * Decimal("26000"))
            price_text = f"{vnd_current:,.0f} ₫ ({current} USD)".replace(",", ".")
            if target_price is not None:
                vnd_target = round(Decimal(str(target_price)) * Decimal("26000"))
                target_text = f"{vnd_target:,.0f} ₫ ({target} USD)".replace(",", ".")
            else:
                target_text = None
        except Exception:
            price_text = f"{current} {safe_currency}"
            target_text = f"{target} {safe_currency}" if target is not None else None
    else:
        price_text = f"{current} {safe_currency}"
        target_text = f"{target} {safe_currency}" if target is not None else None

    if kind == NotificationKind.TARGET_PRICE_SET:
        accent_color = "#1d4ed8"
        badge_text = "Đã lưu giá mục tiêu"
        subject = f"Đã lưu giá mục tiêu cho {safe_name} - Trakora App"
        title = "Đã lưu giá mục tiêu của bạn"
        description = (
            f"Chúng tôi đã lưu giá mục tiêu cho sản phẩm "
            f"<strong>{safe_name}</strong> (giá hiện tại <strong>{price_text}</strong>) "
            f"là <strong>{target_text}</strong>."
        )
        highlight_label = "Giá mục tiêu"
        highlight_value = target_text
        meta_text = "Chúng tôi sẽ thông báo ngay khi giá sản phẩm chạm mục tiêu!"
    elif kind == NotificationKind.TARGET_PRICE_REACHED:
        accent_color = "#15803d"
        badge_text = "Giá mục tiêu đã đạt"
        subject = f"Giá mục tiêu đã đạt: {safe_name} - Trakora App"
        title = "Giá mục tiêu đã đạt!"
        description = (
            f"Giá sản phẩm <strong>{safe_name}</strong> đã giảm còn "
            f"<strong>{price_text}</strong>, đã chạm giá mục tiêu "
            f"<strong>{target_text}</strong> của bạn."
        )
        highlight_label = "Giá hiện tại"
        highlight_value = price_text
        meta_text = "Đây là thời điểm tốt để mua. Mở sản phẩm để đặt hàng ngay!"
    elif kind == NotificationKind.PRICE_ABOVE_TARGET:
        accent_color = "#b45309"
        badge_text = "Giá đã tăng trên mục tiêu"
        subject = f"Giá đã tăng trên mục tiêu: {safe_name} - Trakora App"
        title = "Giá đã tăng trên mục tiêu"
        description = (
            f"Giá sản phẩm <strong>{safe_name}</strong> đã tăng lên "
            f"<strong>{price_text}</strong>, cao hơn giá mục tiêu "
            f"<strong>{target_text}</strong> của bạn."
        )
        highlight_label = "Giá hiện tại"
        highlight_value = price_text
        meta_text = (
            "Chúng tôi sẽ thông báo lại khi giá quay về dưới mức mục tiêu."
        )
    else:  # NotificationKind.GOOD_PRICE
        accent_color = "#15803d"
        badge_text = "Đang có giá tốt"
        subject = f"Sản phẩm đang có giá tốt: {safe_name} - Trakora App"
        title = "Sản phẩm đang có giá tốt"
        description = (
            f"Sản phẩm <strong>{safe_name}</strong> hiện có giá "
            f"<strong>{price_text}</strong>, thấp hơn hoặc bằng ngưỡng giá tốt "
            "của chúng tôi."
        )
        highlight_label = "Giá hiện tại"
        highlight_value = price_text
        meta_text = "Đây có thể là thời điểm tốt để mua."

    html_content = f"""<!DOCTYPE html>
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
        .badge {{
            display: inline-block;
            margin-top: 12px;
            padding: 4px 14px;
            border-radius: 9999px;
            background-color: rgba(255, 255, 255, 0.18);
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
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
        .price-container {{
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
        }}
        .price-label {{
            font-size: 13px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 8px 0;
        }}
        .price-value {{
            font-size: 28px;
            font-weight: 700;
            color: {accent_color};
            margin: 0;
        }}
        .product-name {{
            font-size: 14px;
            color: #475569;
            margin: 12px 0 0 0;
            word-break: break-word;
        }}
        .cta-container {{
            text-align: center;
            margin: 30px 0 10px 0;
        }}
        .cta-button {{
            display: inline-block;
            padding: 12px 28px;
            background-color: {accent_color};
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
        }}
        .meta-info {{
            font-size: 13px;
            color: #64748b;
            text-align: center;
            margin-top: 20px;
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
                <div class="badge">{badge_text}</div>
            </div>
            <div class="content">
                <div class="greeting">Xin chào,</div>
                <div class="text">
                    {description}
                </div>
                <div class="price-container">
                    <p class="price-label">{highlight_label}</p>
                    <p class="price-value">{highlight_value}</p>
                    <p class="product-name">{safe_name}</p>
                </div>
                <div class="cta-container">
                    <a class="cta-button" href="{safe_url}" target="_blank">Xem sản phẩm</a>
                </div>
                <div class="meta-info">
                    {meta_text}
                </div>
                <div class="warning">
                    Nếu bạn không theo dõi sản phẩm này nữa, vui lòng bỏ qua email này.
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
    return subject, html_content


async def _send_email(to_email: str, subject: str, html_content: str) -> None:
    """Hàm gửi email bất đồng bộ qua SMTP."""
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"Trakora App <{sender_email}>"
    message["To"] = to_email

    part = MIMEText(html_content, "html", "utf-8")
    message.attach(part)

    try:
        server = aiosmtplib.SMTP(
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
        )
        await server.connect()
        await server.login(sender_email, sender_password)
        await server.send_message(message)
        await server.quit()
        logger.info(f"Gửi email thông báo đến {to_email} thành công.")
    except Exception as e:
        logger.error(f"Lỗi gửi email thông báo đến {to_email}: {e}", exc_info=True)
        raise NotificationErrors.EMAIL_SEND_FAILED.throw()


async def send_notification_email(
    email: str,
    kind: NotificationKind,
    product_name: str,
    current_price: Decimal | str,
    currency: str,
    product_url: str,
    target_price: Decimal | str | None = None,
) -> None:
    """Hàm gửi email thông báo giá cho người dùng bất đồng bộ."""
    subject, html_content = _get_notification_html_content(
        kind=kind,
        product_name=product_name,
        current_price=current_price,
        currency=currency,
        product_url=product_url,
        target_price=target_price,
    )
    await _send_email(email, subject, html_content)
