import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints.watchlist_router import get_product_reviews
from app.core.config import settings
from app.core.exceptions import CustomAppException
from app.crud import product_crud, tracked_product_crud
from app.helper.rapidapi_client import rapidapi_client


def test_review_endpoint_checks_ownership_before_provider(monkeypatch):
    monkeypatch.setattr(tracked_product_crud, "get", AsyncMock(return_value=None))
    provider = AsyncMock()
    monkeypatch.setattr(rapidapi_client, "fetch_reviews", provider)
    with pytest.raises(CustomAppException):
        asyncio.run(get_product_reviews(7, 1, None, None, SimpleNamespace(id=1)))
    provider.assert_not_awaited()


def test_demo_reviews_paginate_and_filter_without_external_calls(monkeypatch):
    monkeypatch.setattr(tracked_product_crud, "get", AsyncMock(return_value=object()))
    product = SimpleNamespace(external_id="DEMO-123", top_reviews=[{"id": i, "rating": 2} for i in range(25)])
    monkeypatch.setattr(product_crud, "get_by_id", AsyncMock(return_value=product))
    provider = AsyncMock()
    monkeypatch.setattr(rapidapi_client, "fetch_reviews", provider)
    result = asyncio.run(get_product_reviews(7, 2, 2, None, SimpleNamespace(id=1)))
    assert len(result.data["reviews"]) == 10
    assert result.data["reviews"][0]["id"] == 10
    assert result.data["has_more"] is True
    provider.assert_not_awaited()


def test_live_reviews_forward_page_and_filter(monkeypatch):
    monkeypatch.setattr(settings, "RAPIDAPI_KEY", "test-key")
    monkeypatch.setattr(tracked_product_crud, "get", AsyncMock(return_value=object()))
    monkeypatch.setattr(product_crud, "get_by_id", AsyncMock(return_value=SimpleNamespace(external_id="B012345678")))
    provider = AsyncMock(return_value={"reviews": [], "has_more": False, "source": "live"})
    monkeypatch.setattr(rapidapi_client, "fetch_reviews", provider)
    asyncio.run(get_product_reviews(7, 3, 4, None, SimpleNamespace(id=1)))
    provider.assert_awaited_once_with("B012345678", 3, 4)
