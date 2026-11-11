import re
from decimal import Decimal, InvalidOperation
from html import unescape
from typing import Any

import httpx
from pydantic import ValidationError

from app.helper.product_details import extract_details
from app.core.config import settings
from app.core.exceptions import ErrorDetail
from app.schemas.watchlist_schema import ProductMarketplace


MARKETPLACE_UNAVAILABLE = ErrorDetail(
    "MARKETPLACE_UNAVAILABLE", 503, "Dịch vụ tra cứu sàn thương mại điện tử chưa được cấu hình."
)
MARKETPLACE_UPSTREAM_ERROR = ErrorDetail(
    "MARKETPLACE_UPSTREAM_ERROR", 502, "Không thể lấy thông tin sản phẩm từ sàn thương mại điện tử."
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

    curr_price = _optional_price(payload.get("product_price"))
    orig_price = _optional_price(payload.get("product_original_price"))
    if curr_price is None:
        curr_price = orig_price
    if curr_price is None:
        raise ValueError(f"Sản phẩm {payload.get('asin')} không có thông tin giá từ sàn (hết hàng hoặc chưa chọn phiên bản).")

    return ProductMarketplace.model_validate(
        {
            "details": extract_details(payload),
            "external_id": payload.get("asin"),
            "url": payload.get("product_url"),
            "name": payload.get("product_title"),
            "image_url": payload.get("product_photo"),
            "brand": brand,
            "shop_name": _clean_text(buy_box.get("seller")),
            "product_rating": rating,
            "review_count": int(review_digits) if review_digits else 0,
            "current_price": curr_price,
            "original_price": orig_price,
            "currency": payload.get("currency") or "USD",
            "in_stock": in_stock,
            "top_reviews": _unescape_review(payload.get("top_reviews") or []),
        }
    )


def _find_demo_product(asin: str) -> ProductMarketplace | None:
    try:
        from seed.common import DEMO_PRODUCTS, STANDALONE_DEMO_PRODUCT
        all_demos = list(DEMO_PRODUCTS) + [STANDALONE_DEMO_PRODUCT]
        for item in all_demos:
            raw_id = item["external_id"].replace("DEMO-", "").replace("SEED-", "")
            if asin.upper() in (raw_id.upper(), item["external_id"].upper()):
                return ProductMarketplace.model_validate(
                    {
                        "details": item.get("details", {}),
                        "external_id": asin,
                        "url": item.get("url") or f"https://www.amazon.com/dp/{asin}",
                        "name": item["name"],
                        "image_url": item["image_url"],
                        "brand": item.get("brand"),
                        "shop_name": item.get("shop_name"),
                        "product_rating": item.get("product_rating"),
                        "review_count": item.get("review_count", 0),
                        "current_price": item["current_price"],
                        "original_price": item.get("original_price"),
                        "currency": item.get("currency", "USD"),
                        "in_stock": item.get("in_stock", True),
                        "top_reviews": item.get("top_reviews", []),
                    }
                )
    except Exception:
        pass
    return None


class RapidAPIClient:
    """Fetches a product by ASIN through the Real-Time Amazon Data API."""

    async def _request_product(self, asin: str, country: str) -> dict:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                settings.RAPIDAPI_PRODUCT_ENDPOINT or "https://real-time-amazon-data.p.rapidapi.com/product-details",
                params={"asin": asin, "country": country, "autoselect_variant": "true"},
                headers={"X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                         "X-RapidAPI-Host": settings.RAPIDAPI_HOST or "real-time-amazon-data.p.rapidapi.com"},
            )
            response.raise_for_status()
            payload = response.json()
            product = payload.get("data") if isinstance(payload, dict) else None
            if not isinstance(product, dict) or product.get("asin") != asin:
                raise ValueError("Marketplace returned an invalid or mismatched product.")
            return product

    async def fetch_details(self, asin: str, country: str = "US") -> dict:
        # Details can be available even when the product has no purchasable price.
        if not settings.RAPIDAPI_KEY:
            raise MARKETPLACE_UNAVAILABLE.throw()
        try:
            return extract_details(await self._request_product(asin, country))
        except (httpx.HTTPError, ValueError, ValidationError) as exc:
            raise MARKETPLACE_UPSTREAM_ERROR.throw() from exc

    async def fetch_reviews(self, asin: str, page: int, stars: int | None):
        from app.helper.review_normalizer import normalize_review
        if not settings.RAPIDAPI_KEY:
            raise MARKETPLACE_UNAVAILABLE.throw()
        params = {"asin": asin, "country": "US", "page": str(page), "sort_by": "MOST_RECENT"}
        if stars is not None:
            params["star_rating"] = f"{stars}_STARS"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    settings.RAPIDAPI_PRODUCT_ENDPOINT.rsplit("/", 1)[0] + "/product-reviews",
                    params=params,
                    headers={"X-RapidAPI-Key": settings.RAPIDAPI_KEY, "X-RapidAPI-Host": settings.RAPIDAPI_HOST},
                )
                response.raise_for_status()
                payload = response.json()
                data = payload.get("data")
                if payload.get("status") == "ERROR" or not isinstance(data, dict) or not isinstance(data.get("reviews"), list):
                    raise ValueError("Invalid reviews response")
                reviews = [normalize_review(r) for r in data["reviews"] if isinstance(r, dict)]
                return {"reviews": reviews, "has_more": len(reviews) >= 10, "source": "live"}
        except (httpx.HTTPError, ValueError) as exc:
            raise MARKETPLACE_UPSTREAM_ERROR.throw() from exc

    async def fetch_product(self, asin: str, country: str = "US") -> ProductMarketplace:
        demo = _find_demo_product(asin)

        if not settings.RAPIDAPI_KEY:
            if demo:
                return demo
            raise MARKETPLACE_UNAVAILABLE.throw()

        try:
            product = await self._request_product(asin, country)
            return _normalize_product(product)
        except (httpx.HTTPError, ValueError, ValidationError) as exc:
            if demo:
                return demo
            raise MARKETPLACE_UPSTREAM_ERROR.throw() from exc


rapidapi_client = RapidAPIClient()
