from enum import Enum
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.exceptions import ErrorDetail


class NotificationKind(str, Enum):
    """Các loại thông báo giá mà hệ thống gửi cho người dùng."""

    TARGET_PRICE_SET = "target_price_set"
    TARGET_PRICE_REACHED = "target_price_reached"
    PRICE_ABOVE_TARGET = "price_above_target"
    GOOD_PRICE = "good_price"
    SALE_ALERT = "sale_alert"


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
    sale_alert_enabled: bool | None = None
    quiet_start: time | None = None
    quiet_end: time | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_timezone(self):
        for field in ("email_enabled", "quiet_hours_enabled", "sale_alert_enabled", "timezone"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"Trường {field} không được để trống.")
        if self.timezone is not None:
            try:
                ZoneInfo(self.timezone)
            except (ZoneInfoNotFoundError, ValueError):
                raise ValueError("Múi giờ phải là múi giờ IANA hợp lệ.")
        return self


class NotificationPreferenceResponse(BaseModel):
    email_enabled: bool
    quiet_hours_enabled: bool
    sale_alert_enabled: bool = False
    quiet_start: time | None
    quiet_end: time | None
    timezone: str

    @field_validator("sale_alert_enabled", mode="before")
    @classmethod
    def _default_sale_alert(cls, value):
        return False if value is None else value

    model_config = ConfigDict(from_attributes=True)


def _normalize_utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class SaleEventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    start_at: datetime
    end_at: datetime | None = None
    description: str | None = None
    marketplace: str | None = Field(default=None, max_length=50)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Tên đợt giảm giá không được để trống.")
        return cleaned

    @model_validator(mode="after")
    def validate_dates(self):
        self.start_at = _normalize_utc_datetime(self.start_at)
        self.end_at = _normalize_utc_datetime(self.end_at)
        if self.end_at is not None and self.end_at <= self.start_at:
            raise ValueError("End date must be after the start date")
        return self


class SaleEventUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_at: datetime | None = None
    end_at: datetime | None = None
    description: str | None = None
    marketplace: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Tên đợt giảm giá không được để trống.")
        return cleaned

    @model_validator(mode="after")
    def validate_dates(self):
        for field in ("name", "start_at", "is_active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"Trường {field} không được để trống.")
        self.start_at = _normalize_utc_datetime(self.start_at)
        self.end_at = _normalize_utc_datetime(self.end_at)
        if self.start_at is not None and self.end_at is not None and self.end_at <= self.start_at:
            raise ValueError("End date must be after the start date")
        return self


class SaleEventResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    marketplace: str | None = None
    start_at: datetime
    end_at: datetime | None = None
    is_active: bool
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SaleEventListResponse(BaseModel):
    sales: list[SaleEventResponse]
