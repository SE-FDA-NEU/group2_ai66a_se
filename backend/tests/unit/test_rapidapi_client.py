"""Tests for issue 77's RapidAPI request and response mapping."""

import asyncio
from decimal import Decimal

import httpx
import pytest

from app.core.config import settings
from app.core.exceptions import CustomAppException
from app.helper import rapidapi_client as rapidapi_module


def test_product_details_request_and_data_mapping(monkeypatch):
    async def scenario():
        monkeypatch.setattr(settings, "RAPIDAPI_KEY", "test-key")
        monkeypatch.setattr(settings, "RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
        monkeypatch.setattr(
            settings,
            "RAPIDAPI_PRODUCT_ENDPOINT",
            "https://real-time-amazon-data.p.rapidapi.com/product-details",
        )

        class FakeResponse:
            def json(self):
                return {
                    "data": {
                        "asin": "B012345678",
                        "product_url": "https://www.amazon.com/dp/B012345678",
                        "product_title": "Sample product",
                        "product_photo": "https://example.test/product.jpg",
                        "product_price": "$1,234.50",
                        "product_original_price": "$1,499.00",
                        "currency": "USD",
                        "product_details": {"Brand": "Sample &amp; Brand"},
                        "product_information": {"Manufacturer": "Fallback brand"},
                        "main_buy_box": {"seller": "Sample seller"},
                        "product_star_rating": "4.7",
                        "product_num_ratings": "1,234 ratings",
                        "product_availability": "In Stock",
                        "top_reviews": [{"title": "Great &amp; useful", "comment": "Works &amp; lasts"}],
                    }
                }

            def raise_for_status(self):
                return None

        response = FakeResponse()
        clients = []

        class FakeAsyncClient:
            def __init__(self, timeout):
                assert timeout == 8.0
                clients.append(self)

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def get(self, url, *, params, headers):
                self.request = {"url": url, "params": params, "headers": headers}
                return response

        fake_client = FakeAsyncClient
        monkeypatch.setattr(rapidapi_module.httpx, "AsyncClient", fake_client)
        result = await rapidapi_module.RapidAPIClient().fetch_product("B012345678")

        assert result.external_id == "B012345678"
        assert result.brand == "Sample & Brand"
        assert result.shop_name == "Sample seller"
        assert result.current_price == Decimal("1234.50")
        assert result.original_price == Decimal("1499.00")
        assert result.product_rating == Decimal("4.7")
        assert result.review_count == 1234
        assert result.in_stock is True
        assert result.top_reviews[0]["title"] == "Great & useful"
        assert clients[0].request == {
            "url": "https://real-time-amazon-data.p.rapidapi.com/product-details",
            "params": {"asin": "B012345678", "country": "US", "autoselect_variant": "true"},
            "headers": {
                "X-RapidAPI-Key": "test-key",
                "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
            },
        }
        print("Mapped product:", result.model_dump(mode="json"))

    asyncio.run(scenario())


def test_product_details_http_timeout_is_reported_as_upstream_error(monkeypatch):
    async def scenario():
        monkeypatch.setattr(settings, "RAPIDAPI_KEY", "test-key")

        class FakeAsyncClient:
            def __init__(self, timeout):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def get(self, *_args, **_kwargs):
                raise httpx.ReadTimeout("request timed out")

        monkeypatch.setattr(rapidapi_module.httpx, "AsyncClient", FakeAsyncClient)

        with pytest.raises(CustomAppException) as error:
            await rapidapi_module.RapidAPIClient().fetch_product("B012345678")

        assert error.value.status_code == 502
        assert error.value.code == "MARKETPLACE_UPSTREAM_ERROR"
        print("Timeout handling:", {"status_code": error.value.status_code, "code": error.value.code})

    asyncio.run(scenario())


def test_product_details_http_error_is_reported_as_upstream_error(monkeypatch):
    async def scenario():
        monkeypatch.setattr(settings, "RAPIDAPI_KEY", "test-key")

        class FakeResponse:
            def raise_for_status(self):
                request = httpx.Request("GET", "https://example.test/product-details")
                response = httpx.Response(429, request=request)
                raise httpx.HTTPStatusError("rate limited", request=request, response=response)

        class FakeAsyncClient:
            def __init__(self, timeout):
                assert timeout == 8.0

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return None

            async def get(self, *_args, **_kwargs):
                return FakeResponse()

        monkeypatch.setattr(rapidapi_module.httpx, "AsyncClient", FakeAsyncClient)

        with pytest.raises(CustomAppException) as error:
            await rapidapi_module.RapidAPIClient().fetch_product("B012345678")

        assert error.value.status_code == 502
        assert error.value.code == "MARKETPLACE_UPSTREAM_ERROR"

    asyncio.run(scenario())
