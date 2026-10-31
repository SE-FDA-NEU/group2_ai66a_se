import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.core.config import settings
from app.schemas.watchlist_schema import ProductMarketplace
from app.services.exchange_rate_service import ExchangeRateService


def test_get_rate_same_currency():
    service = ExchangeRateService()
    rate = asyncio.run(service.get_rate("VND", "VND"))
    assert rate == Decimal("1.0")


def test_get_rate_cached():
    service = ExchangeRateService()
    service._cached_rate = Decimal("26000")
    service._expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    rate = asyncio.run(service.get_rate("USD", "VND"))
    assert rate == Decimal("26000")


def test_get_rate_fallback_when_offline(monkeypatch):
    service = ExchangeRateService()

    # Force _fetch_live_rate to return None
    monkeypatch.setattr(service, "_fetch_live_rate", AsyncMock(return_value=None))

    rate = asyncio.run(service.get_rate("USD", "VND"))
    assert rate == Decimal(settings.DEFAULT_USD_TO_VND_RATE)


def test_convert_to_vnd(monkeypatch):
    service = ExchangeRateService()
    monkeypatch.setattr(service, "get_rate", AsyncMock(return_value=Decimal("25800")))

    # 10.50 USD * 25800 = 270,900
    converted = asyncio.run(service.convert_to_vnd(Decimal("10.50"), "USD"))
    assert converted == Decimal("270900")


def test_convert_marketplace_product_to_vnd(monkeypatch):
    service = ExchangeRateService()
    monkeypatch.setattr(service, "get_rate", AsyncMock(return_value=Decimal("25000")))

    prod = ProductMarketplace(
        external_id="B012345678",
        url="https://amazon.com/dp/B012345678",
        name="Sample",
        image_url="https://example.com/img.jpg",
        current_price=Decimal("100.00"),
        original_price=Decimal("120.00"),
        currency="USD",
        review_count=10,
    )

    converted = asyncio.run(service.convert_marketplace_product_to_vnd(prod))
    assert converted.currency == "VND"
    assert converted.current_price == Decimal("2500000")
    assert converted.original_price == Decimal("3000000")


def test_convert_marketplace_product_already_vnd():
    service = ExchangeRateService()
    prod = ProductMarketplace(
        external_id="B012345678",
        url="https://amazon.com/dp/B012345678",
        name="Sample",
        image_url="https://example.com/img.jpg",
        current_price=Decimal("2500000"),
        currency="VND",
        review_count=10,
    )

    converted = asyncio.run(service.convert_marketplace_product_to_vnd(prod))
    assert converted.currency == "VND"
    assert converted.current_price == Decimal("2500000")

