"""Unit tests for BR10 shop trust label logic in watchlist_service._to_summary_response."""

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import watchlist_service as service_module


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_product(
    *,
    shop_rating=None,
    shop_review_count=None,
    product_rating=Decimal("4.5"),
    review_count=100,
):
    """Build a minimal product SimpleNamespace for _to_summary_response."""
    return SimpleNamespace(
        id=1,
        name="Test product",
        url="https://amazon.com/dp/B00TEST",
        image_url="https://img.example.com/test.jpg",
        marketplace="amazon",
        brand="TestBrand",
        shop_name="TestShop",
        shop_rating=shop_rating,
        shop_review_count=shop_review_count,
        product_rating=product_rating,
        review_count=review_count,
        current_price=Decimal("99.00"),
        original_price=None,
        currency="USD",
        in_stock=True,
        price_low=Decimal("99.00"),
        price_high=Decimal("99.00"),
        top_reviews=[],
    )


def _call_summary(product, *, target_price=None, buy_when_good=False, distinct_days=0, median_price=None):
    """Synchronously invoke _to_summary_response."""
    svc = service_module.watchlist_service
    return svc._to_summary_response(
        product=product,
        target_price=target_price,
        buy_when_good=buy_when_good,
        distinct_days=distinct_days,
        median_price=median_price,
    )


# ─── BR10 Trust label tests ───────────────────────────────────────────────────

class TestShopTrustLabel:
    """Tests for BR10: shop trust label classification."""

    # -- Trusted ---------------------------------------------------------------

    def test_trusted_at_exact_thresholds(self):
        """Shops with >= 4.7star AND >= 500 ratings -> Trusted."""
        product = _make_product(shop_rating=Decimal("4.7"), shop_review_count=500)
        result = _call_summary(product)
        assert result.shop_trust_label == "Trusted"

    def test_trusted_with_high_rating_and_many_reviews(self):
        """Shops with 4.9star and 1200 ratings (BR10 example) -> Trusted."""
        product = _make_product(shop_rating=Decimal("4.9"), shop_review_count=1200)
        result = _call_summary(product)
        assert result.shop_trust_label == "Trusted"

    def test_trusted_with_five_star_and_exactly_500_reviews(self):
        """Boundary: exactly 500 reviews with 5.0star -> Trusted."""
        product = _make_product(shop_rating=Decimal("5.0"), shop_review_count=500)
        result = _call_summary(product)
        assert result.shop_trust_label == "Trusted"

    # -- Risky: few ratings ---------------------------------------------------

    def test_risky_high_rating_but_very_few_reviews(self):
        """Shops with 4.9star but only 12 reviews (BR10 example) -> Risky: few ratings."""
        product = _make_product(shop_rating=Decimal("4.9"), shop_review_count=12)
        result = _call_summary(product)
        assert result.shop_trust_label == "Risky: few ratings"

    def test_risky_exactly_at_low_count_boundary(self):
        """Boundary: exactly 49 reviews (< 50) -> Risky: few ratings."""
        product = _make_product(shop_rating=Decimal("4.8"), shop_review_count=49)
        result = _call_summary(product)
        assert result.shop_trust_label == "Risky: few ratings"

    def test_risky_zero_reviews(self):
        """Zero reviews -> Risky: few ratings."""
        product = _make_product(shop_rating=Decimal("4.5"), shop_review_count=0)
        result = _call_summary(product)
        assert result.shop_trust_label == "Risky: few ratings"

    def test_risky_low_rating_any_count(self):
        """Rating < 4.3 with many reviews -> Risky: few ratings."""
        product = _make_product(shop_rating=Decimal("4.2"), shop_review_count=5000)
        result = _call_summary(product)
        assert result.shop_trust_label == "Risky: few ratings"

    def test_risky_exactly_at_low_rating_boundary(self):
        """Exactly 4.29star (< 4.3) with 1000 reviews -> Risky: few ratings."""
        product = _make_product(shop_rating=Decimal("4.29"), shop_review_count=1000)
        result = _call_summary(product)
        assert result.shop_trust_label == "Risky: few ratings"

    # -- Needs caution --------------------------------------------------------

    def test_needs_caution_medium_rating_medium_count(self):
        """Shops with 4.5star and ~800 ratings (BR10 example) -> Needs caution."""
        product = _make_product(shop_rating=Decimal("4.5"), shop_review_count=800)
        result = _call_summary(product)
        assert result.shop_trust_label == "Needs caution"

    def test_needs_caution_just_above_risky_count(self):
        """Boundary: exactly 50 reviews, rating 4.3 -> Needs caution."""
        product = _make_product(shop_rating=Decimal("4.3"), shop_review_count=50)
        result = _call_summary(product)
        assert result.shop_trust_label == "Needs caution"

    def test_needs_caution_high_count_below_trusted_rating(self):
        """499 reviews, rating 4.69 (just below Trusted threshold) -> Needs caution."""
        product = _make_product(shop_rating=Decimal("4.69"), shop_review_count=499)
        result = _call_summary(product)
        assert result.shop_trust_label == "Needs caution"

    # -- No label (missing data) ----------------------------------------------

    def test_no_label_when_all_rating_data_none(self):
        """Both shop_rating and product_rating are None -> no trust label."""
        product = _make_product(
            shop_rating=None, shop_review_count=None,
            product_rating=None, review_count=0,
        )
        result = _call_summary(product)
        assert result.shop_trust_label is None

    # -- top_reviews ----------------------------------------------------------

    def test_top_reviews_capped_at_five(self):
        """Only the first 5 reviews are included in the response."""
        reviews = [{"id": i, "text": f"Review {i}", "rating": 5} for i in range(8)]
        product = _make_product(shop_rating=Decimal("4.8"), shop_review_count=600)
        product.top_reviews = reviews
        result = _call_summary(product)
        assert len(result.top_reviews) == 5

    def test_top_reviews_empty_when_no_reviews(self):
        """Empty top_reviews list is returned when the product has none."""
        product = _make_product()
        product.top_reviews = []
        result = _call_summary(product)
        assert result.top_reviews == []

    # -- Response fields ------------------------------------------------------

    def test_response_includes_shop_name_and_brand(self):
        """Response includes shop_name and brand fields."""
        product = _make_product(shop_rating=Decimal("4.8"), shop_review_count=600)
        result = _call_summary(product)
        assert result.shop_name == "TestShop"
        assert result.brand == "TestBrand"

    def test_response_includes_product_rating_and_review_count(self):
        """Response includes product_rating and review_count."""
        product = _make_product(product_rating=Decimal("4.3"), review_count=250)
        result = _call_summary(product)
        assert result.product_rating == Decimal("4.3")
        assert result.review_count == 250
