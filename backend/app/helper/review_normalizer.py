"""Normalize provider reviews and development fixtures into one public shape."""
import re
from html import unescape


def _clean_text(value):
    if value is None:
        return None
    text = re.sub(r"<[^>]+>", "", unescape(str(value))).strip()
    return text or None


def normalize_review(raw):
    def value(*keys):
        return next((raw[k] for k in keys if raw.get(k) is not None and raw[k] != ""), None)
    rating = re.match(r"\s*\d+(?:\.\d+)?", str(value("rating", "review_star_rating") or ""))
    score = float(rating.group()) if rating else None
    variant = value("variant", "reviewed_product_variant")
    if isinstance(variant, dict):
        variant = ", ".join(f"{k}: {v}" for k, v in variant.items())
    return {
        "id": value("id", "review_id"),
        "author": _clean_text(value("author", "reviewer", "review_author")),
        "rating": score if score is not None and 1 <= score <= 5 else None,
        "title": _clean_text(value("title", "review_title")),
        "text": _clean_text(value("text", "comment", "body", "content", "review_comment")),
        "date": _clean_text(value("review_date_iso", "date", "created_at", "review_date")),
        "verified_purchase": value("verified_purchase", "is_verified_purchase") in (True, "true"),
        "variant": _clean_text(variant),
        "helpful_votes": value("helpful_votes"),
        "images": value("images", "review_images") or [],
        "videos": value("videos", "review_videos") or [],
        "link": value("link", "review_link"),
    }


def cached_review_page(reviews, page, stars):
    items = [normalize_review(r) for r in reviews if isinstance(r, dict)]
    if stars is not None:
        items = [r for r in items if r["rating"] == stars]
    items.sort(key=lambda r: r["date"] or "", reverse=True)
    offset = (page - 1) * 10
    return {"reviews": items[offset:offset + 10], "has_more": len(items) > offset + 10, "source": "cached"}
