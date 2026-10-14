import asyncio
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.core.exceptions import CustomAppException
from app.helper.notification_email import (
    _get_notification_html_content,
    send_notification_email,
)
from app.schemas.notification_schema import NotificationKind


def _common_kwargs():
    return {
        "product_name": "Tai nghe Sony WH-1000XM5",
        "current_price": Decimal("189000"),
        "currency": "VND",
        "product_url": "https://www.amazon.com/dp/B09XS7JWHH",
        "target_price": Decimal("195000"),
    }


@pytest.mark.parametrize(
    "kind",
    [
        NotificationKind.TARGET_PRICE_SET,
        NotificationKind.TARGET_PRICE_REACHED,
        NotificationKind.PRICE_ABOVE_TARGET,
        NotificationKind.GOOD_PRICE,
    ],
)
def test_notification_template_contains_product_price_and_link(kind):
    subject, html_content = _get_notification_html_content(kind=kind, **_common_kwargs())

    assert "Tai nghe Sony WH-1000XM5" in html_content
    assert "189000" in html_content
    assert "https://www.amazon.com/dp/B09XS7JWHH" in html_content
    assert "Trakora App" in subject


def test_target_price_reached_template_shows_target_and_success_message():
    subject, html_content = _get_notification_html_content(
        kind=NotificationKind.TARGET_PRICE_REACHED, **_common_kwargs()
    )

    assert "Giá mục tiêu đã đạt" in subject
    assert "195000" in html_content
    assert "chạm giá mục tiêu" in html_content


def test_price_above_target_template_shows_warning_message():
    subject, html_content = _get_notification_html_content(
        kind=NotificationKind.PRICE_ABOVE_TARGET, **_common_kwargs()
    )

    assert "Giá đã tăng trên mục tiêu" in subject
    assert "cao hơn giá mục tiêu" in html_content


def test_target_price_set_template_works_without_current_price_highlight():
    subject, html_content = _get_notification_html_content(
        kind=NotificationKind.TARGET_PRICE_SET,
        product_name="Bàn phím Keychron K2",
        current_price="0",
        currency="VND",
        product_url="https://www.amazon.com/dp/B0A0000000",
        target_price=Decimal("1200000"),
    )

    assert "Đã lưu giá mục tiêu" in subject
    assert "Bàn phím Keychron K2" in html_content
    assert "1200000" in html_content


def test_notification_template_escapes_html_in_product_name():
    _, html_content = _get_notification_html_content(
        kind=NotificationKind.GOOD_PRICE,
        product_name="<script>alert(1)</script>",
        current_price="100",
        currency="VND",
        product_url="https://example.com/p?x=1&y=2",
    )

    assert "<script>" not in html_content
    assert "&lt;script&gt;" in html_content
    assert "https://example.com/p?x=1&amp;y=2" in html_content


def test_send_notification_email_builds_template_and_sends_email(monkeypatch):
    async def scenario():
        captured = {}

        async def fake_send_email(to_email, subject, html_content):
            captured["to_email"] = to_email
            captured["subject"] = subject
            captured["html_content"] = html_content

        with patch(
            "app.helper.notification_email._send_email", side_effect=fake_send_email
        ):
            await send_notification_email(
                email="ha@example.com",
                kind=NotificationKind.TARGET_PRICE_REACHED,
                **_common_kwargs(),
            )

        assert captured["to_email"] == "ha@example.com"
        assert "Tai nghe Sony WH-1000XM5" in captured["subject"]
        assert "189000" in captured["html_content"]
        assert "https://www.amazon.com/dp/B09XS7JWHH" in captured["html_content"]

    asyncio.run(scenario())


def test_send_notification_email_raises_when_smtp_fails(monkeypatch):
    async def scenario():
        with patch(
            "app.helper.notification_email.aiosmtplib.SMTP",
            side_effect=ConnectionError("smtp down"),
        ), patch("app.helper.notification_email.logger.error"):
            with pytest.raises(CustomAppException) as exc_info:
                await send_notification_email(
                    email="ha@example.com",
                    kind=NotificationKind.GOOD_PRICE,
                    **_common_kwargs(),
                )

        assert exc_info.value.code == "NOTIFICATION_SEND_FAILED"
        assert exc_info.value.status_code == 500

    asyncio.run(scenario())
