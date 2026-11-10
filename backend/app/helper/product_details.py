"""Keep detailed marketplace content without coupling it to watchlist summaries."""
from html import unescape
from typing import Any


def clean_details(value: Any) -> Any:
    if isinstance(value, str):
        return unescape(value).strip()
    if isinstance(value, list):
        return [clean_details(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_details(item) for key, item in value.items()}
    return value


def merge_details(existing: dict, incoming: dict) -> dict:
    """A partial response must not erase previously available information."""
    result = dict(existing)
    for key, value in incoming.items():
        if value is None or value == "" or value == [] or value == {}:
            continue
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge_details(result[key], value)
        else:
            result[key] = value
    return result


def extract_details(payload: dict) -> dict:
    # Summary fields and customer reviews already have dedicated presentation.
    excluded = {
        "product_url", "product_title", "product_photo", "product_price",
        "product_original_price", "product_star_rating", "product_num_ratings",
        "top_reviews", "top_reviews_global", "customer_review_media",
    }
    return clean_details({key: value for key, value in payload.items() if key not in excluded})
