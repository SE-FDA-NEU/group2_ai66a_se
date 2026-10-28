from enum import Enum
from datetime import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


class NotificationSeenRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=200)


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: bool | None = None
    quiet_hours_enabled: bool | None = None
    quiet_start: time | None = None
    quiet_end: time | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_timezone(self):
        for field in ("email_enabled", "quiet_hours_enabled", "timezone"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null.")
        if self.timezone is not None:
            try:
                ZoneInfo(self.timezone)
            except (ZoneInfoNotFoundError, ValueError):
                raise ValueError("timezone must be a valid IANA timezone.")
        return self


class NotificationPreferenceResponse(BaseModel):
    email_enabled: bool
    quiet_hours_enabled: bool
    quiet_start: time | None
    quiet_end: time | None
    timezone: str

    model_config = ConfigDict(from_attributes=True)
