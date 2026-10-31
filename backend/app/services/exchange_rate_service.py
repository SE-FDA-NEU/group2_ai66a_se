from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.watchlist_schema import ProductMarketplace

logger = logging.getLogger(__name__)


class ExchangeRateService:
    """Manages real-time exchange rates with caching and fallback support."""

    def __init__(self) -> None:
        self._cached_rate: Decimal | None = None
        self._expires_at: datetime | None = None

    async def get_rate(self, from_currency: str = "USD", to_currency: str = "VND") -> Decimal:
        src = from_currency.strip().upper()
        dst = to_currency.strip().upper()

        if src == dst:
            return Decimal("1.0")

        now = datetime.now(timezone.utc)
        if (
            self._cached_rate is not None
            and self._expires_at is not None
            and now < self._expires_at
        ):
            return self._cached_rate

        # Attempt to fetch live exchange rate from primary API
        rate = await self._fetch_live_rate()
        if rate is not None and rate > 0:
            self._cached_rate = rate
            self._expires_at = now + timedelta(seconds=settings.EXCHANGE_RATE_CACHE_TTL_SECONDS)
            logger.info("Updated live USD/VND exchange rate: %s", rate)
            return rate

        # If fetch fails, use previous cached rate or configured fallback default
        if self._cached_rate is not None:
            logger.warning("Failed to fetch live exchange rate, using existing cached rate %s", self._cached_rate)
            return self._cached_rate

        fallback = Decimal(settings.DEFAULT_USD_TO_VND_RATE)
        logger.warning("No cached rate available, falling back to default USD/VND rate %s", fallback)
        return fallback

    async def _fetch_live_rate(self) -> Decimal | None:
        endpoints = [
            settings.EXCHANGE_RATE_API_URL,
            settings.EXCHANGE_RATE_FALLBACK_URL,
        ]

        async with httpx.AsyncClient(timeout=5.0) as client:
            for url in endpoints:
                if not url:
                    continue
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        payload = response.json()
                        rates = payload.get("rates") or {}
                        vnd_val = rates.get("VND")
                        if vnd_val is not None:
                            return Decimal(str(vnd_val))
                except Exception as exc:
                    logger.debug("Exchange rate endpoint %s failed: %s", url, exc)

        return None

    async def convert_to_vnd(
        self, amount: Decimal | float | int | None, from_currency: str = "USD"
    ) -> Decimal | None:
        if amount is None:
            return None
        rate = await self.get_rate(from_currency=from_currency, to_currency="VND")
        dec_amount = Decimal(str(amount))
        # VND prices are integer amounts (no cents)
        return Decimal(str(round(dec_amount * rate)))

    async def convert_marketplace_product_to_vnd(
        self, item: ProductMarketplace
    ) -> ProductMarketplace:
        if str(item.currency).strip().upper() == "VND":
            return item

        rate = await self.get_rate(from_currency=item.currency, to_currency="VND")
        curr_vnd = round(Decimal(str(item.current_price)) * rate)
        orig_vnd = (
            round(Decimal(str(item.original_price)) * rate)
            if item.original_price is not None
            else None
        )

        return item.model_copy(
            update={
                "current_price": Decimal(str(curr_vnd)),
                "original_price": Decimal(str(orig_vnd)) if orig_vnd is not None else None,
                "currency": "VND",
            }
        )


exchange_rate_service = ExchangeRateService()

