import re
from decimal import Decimal, InvalidOperation
from html import unescape
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import ErrorDetail
from app.schemas.watchlist_schema import ProductMarketplace


MARKETPLACE_UNAVAILABLE = ErrorDetail(
    "MARKETPLACE_UNAVAILABLE", 503, "Marketplace lookup is not configured."
)
MARKETPLACE_UPSTREAM_ERROR = ErrorDetail(
    "MARKETPLACE_UPSTREAM_ERROR", 502, "Marketplace could not return product information."
)


def _optional_price(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    cleaned = re.sub(r"[^0-9.,-]", "", str(value)).replace(",", "")
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = unescape(str(value)).strip()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _unescape_review(value: Any) -> Any:
    if isinstance(value, str):
        return unescape(value)
    if isinstance(value, list):
        return [_unescape_review(item) for item in value]
    if isinstance(value, dict):
        return {key: _unescape_review(item) for key, item in value.items()}
    return value


def _normalize_product(payload: dict[str, Any]) -> ProductMarketplace:
    """Map Real-Time Amazon Data's response.data fields to the app schema."""
    details = payload.get("product_details") or {}
    information = payload.get("product_information") or {}
    buy_box = payload.get("main_buy_box") or {}
    byline = _clean_text(payload.get("product_byline"))
    brand = _clean_text(details.get("Brand")) or _clean_text(information.get("Manufacturer")) or byline

    availability = (_clean_text(payload.get("product_availability")) or "in stock").lower()
    in_stock = "in stock" in availability or (
        "available" in availability and "unavailable" not in availability
    )

    rating_value = payload.get("product_star_rating")
    rating = _optional_price(rating_value)
    raw_review_count = payload.get("product_num_ratings", 0)
    review_digits = re.sub(r"\D", "", str(raw_review_count))

    return ProductMarketplace.model_validate(
        {
            "external_id": payload.get("asin"),
            "url": payload.get("product_url"),
            "name": payload.get("product_title"),
            "image_url": payload.get("product_photo"),
            "brand": brand,
            "shop_name": _clean_text(buy_box.get("seller")),
            "product_rating": rating,
            "review_count": int(review_digits) if review_digits else 0,
            "current_price": _optional_price(payload.get("product_price")),
            "original_price": _optional_price(payload.get("product_original_price")),
            "currency": payload.get("currency") or "USD",
            "in_stock": in_stock,
            "top_reviews": _unescape_review(payload.get("top_reviews") or []),
        }
    )


class RapidAPIClient:
    """Fetches a product by ASIN through the Real-Time Amazon Data API."""

    async def fetch_product(self, asin: str, country: str = "US") -> ProductMarketplace:
        if not settings.RAPIDAPI_KEY:
            raise MARKETPLACE_UNAVAILABLE.throw()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    settings.RAPIDAPI_PRODUCT_ENDPOINT or "https://real-time-amazon-data.p.rapidapi.com/product-details",
                    params={"asin": asin, "country": country, "autoselect_variant": "true"},
                    headers={
                        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                        "X-RapidAPI-Host": settings.RAPIDAPI_HOST or "real-time-amazon-data.p.rapidapi.com",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                product = payload.get("data") if isinstance(payload, dict) else None
                if not isinstance(product, dict):
                    raise ValueError("RapidAPI response must contain a product object in 'data'.")
                normalized = _normalize_product(product)
                if normalized.external_id != asin:
                    raise ValueError("RapidAPI returned a different ASIN than requested.")
                return normalized
        except (httpx.HTTPError, ValueError, ValidationError) as exc:
            raise MARKETPLACE_UPSTREAM_ERROR.throw() from exc


rapidapi_client = RapidAPIClient()
