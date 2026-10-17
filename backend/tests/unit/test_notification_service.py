from datetime import datetime, time

from app.services.notification_service import is_quiet_now


def test_quiet_hours_support_overnight_interval():
    assert is_quiet_now(datetime.fromisoformat("2026-10-17T02:00:00+07:00"), start=time(23), end=time(7))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T07:00:00+07:00"), start=time(23), end=time(7))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T12:00:00+07:00"), start=time(23), end=time(7))


def test_quiet_hours_support_same_day_interval():
    assert is_quiet_now(datetime.fromisoformat("2026-10-17T12:30:00+07:00"), start=time(12), end=time(13))
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T13:00:00+07:00"), start=time(12), end=time(13))


def test_equal_quiet_hour_bounds_mean_no_quiet_period():
    assert not is_quiet_now(datetime.fromisoformat("2026-10-17T02:00:00+07:00"), start=time(7), end=time(7))
