import pytest

from app.core.exceptions import CustomAppException
from app.services.amazon_link_parser import parse_amazon_link


def test_parses_asin_from_amazon_product_url():
    result = parse_amazon_link("https://www.amazon.com/dp/B012345678?tag=example")

    assert result.url == "https://www.amazon.com/dp/B012345678?tag=example"
    assert result.asin == "B012345678"


def test_extracts_link_from_pasted_text():
    result = parse_amazon_link("Please check this item: amazon.com/gp/product/B012345678.")

    assert result.url == "amazon.com/gp/product/B012345678"
    assert result.asin == "B012345678"


def test_accepts_amazon_short_link_without_asin():
    result = parse_amazon_link("https://amzn.to/3Example")

    assert result.url == "https://amzn.to/3Example"
    assert result.asin is None


def test_rejects_two_links():
    with pytest.raises(CustomAppException) as exc_info:
        parse_amazon_link("https://amazon.com/dp/B012345678 https://amzn.to/3Example")

    assert exc_info.value.detail == "Paste one link at a time"
    assert exc_info.value.code == "MULTIPLE_LINKS"


def test_rejects_non_amazon_domain():
    with pytest.raises(CustomAppException) as exc_info:
        parse_amazon_link("https://shopee.vn/product/123")

    assert exc_info.value.detail == "Amazon only"
    assert exc_info.value.code == "AMAZON_ONLY"


def test_rejects_text_without_a_link():
    with pytest.raises(CustomAppException) as exc_info:
        parse_amazon_link("This text does not contain a link")

    assert exc_info.value.detail == "A valid Amazon product link is required"
    assert exc_info.value.code == "INVALID_AMAZON_LINK"
