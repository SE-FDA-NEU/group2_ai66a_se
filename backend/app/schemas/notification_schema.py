from enum import Enum

from app.core.exceptions import ErrorDetail


class NotificationKind(str, Enum):
    """Các loại thông báo giá mà hệ thống gửi cho người dùng."""

    TARGET_PRICE_SET = "target_price_set"
    TARGET_PRICE_REACHED = "target_price_reached"
    PRICE_ABOVE_TARGET = "price_above_target"
    GOOD_PRICE = "good_price"


class NotificationErrors:
    EMAIL_SEND_FAILED = ErrorDetail(
        "NOTIFICATION_SEND_FAILED",
        500,
        "Không thể gửi email thông báo. Vui lòng thử lại sau.",
    )
