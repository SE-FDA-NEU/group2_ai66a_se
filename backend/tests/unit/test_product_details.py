import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import CustomAppException
from app.crud.product_crud import CRUDProduct
from app.helper.product_details import merge_details
from app.helper.rapidapi_client import MARKETPLACE_UPSTREAM_ERROR, RapidAPIClient, _normalize_product
from app.schemas.watchlist_schema import ProductDetail, ProductMarketplace
from app.services import watchlist_service as module


def marketplace():
    return ProductMarketplace(external_id="B012345678", url="https://www.amazon.com/dp/B012345678", name="Headphones", image_url="https://example.test/a.jpg", current_price=Decimal("100"), currency="USD", details={"product_description": "Description", "product_details": {"Color": "Blue"}})


def product():
    return SimpleNamespace(id=1, external_id="B012345678", marketplace="amazon", url="https://www.amazon.com/dp/B012345678", name="Headphones", image_url="https://example.test/a.jpg", brand="Brand", shop_name="Shop", product_rating=4.5, review_count=12, current_price=100, original_price=None, currency="USD", in_stock=True, price_low=90, price_high=120, top_reviews=[], details={}, details_updated_at=None)


def test_normalization_preserves_nested_content_and_unknown_fields():
    payload = {"asin": "B012345678", "product_url": "https://example.test", "product_title": "Headphones", "product_photo": "https://example.test/a.jpg", "product_price": "100", "product_description": "<p>Sound &amp; comfort</p>", "about_product": ["USB-C"], "product_information": {"Weight": "250 g"}, "product_variations": {"color": ["Blue", "Black"]}, "new_provider_field": {"value": False}}
    result = _normalize_product(payload)
    assert result.details["product_description"] == "<p>Sound & comfort</p>"
    assert result.details["product_information"] == {"Weight": "250 g"}
    assert result.details["new_provider_field"] == {"value": False}
    assert "product_price" not in result.details


def test_partial_merge_retains_details_and_accepts_false_and_zero():
    original = {"product_description": "Saved", "specs": {"Weight": "250 g", "Color": "Blue"}, "is_prime": True}
    merged = merge_details(original, {"product_description": None, "specs": {"Color": "Black", "Weight": ""}, "is_prime": False, "count": 0, "images": []})
    assert merged == {"product_description": "Saved", "specs": {"Weight": "250 g", "Color": "Black"}, "is_prime": False, "count": 0}
    assert original["specs"]["Color"] == "Blue"


@pytest.mark.parametrize("method", ["refresh_untracked", "record_price_snapshot"])
def test_refresh_paths_persist_details(method):
    async def run():
        saved = product()
        saved.details = {"product_information": {"Weight": "250 g"}}
        db = SimpleNamespace(add=lambda _: None, flush=AsyncMock())
        await getattr(CRUDProduct(), method)(db, saved, marketplace())
        assert saved.details["product_description"] == "Description"
        assert saved.details["product_information"]["Weight"] == "250 g"
        assert saved.details_updated_at is not None
    asyncio.run(run())


def test_creation_persists_details():
    async def run():
        added = []
        db = SimpleNamespace(add=added.append, flush=AsyncMock())
        saved = await CRUDProduct().create_with_first_price(db, "amazon", marketplace())
        assert saved.details["product_description"] == "Description"
        assert saved.details_updated_at is not None
    asyncio.run(run())


def setup_service(monkeypatch, saved):
    monkeypatch.setattr(module.tracked_product_crud, "get_with_product_statistics", AsyncMock(return_value=(saved, None, False, 1, None)))
    provider = AsyncMock(return_value={"product_description": "New description"})
    monkeypatch.setattr(module.rapidapi_client, "fetch_details", provider)
    return provider, SimpleNamespace(flush=AsyncMock(), commit=AsyncMock())


def test_old_product_hydrates_and_summary_stays_lightweight(monkeypatch):
    async def run():
        saved = product()
        provider, db = setup_service(monkeypatch, saved)
        detail = await module.WatchlistService().get_product(db, SimpleNamespace(id=7), 1)
        assert isinstance(detail, ProductDetail)
        assert detail.details["product_description"] == "New description"
        db.commit.assert_awaited_once()
        provider.assert_awaited_once_with(saved.external_id, country="US")
        summary = module.WatchlistService._to_summary_response(saved, None, False, 1, None)
        assert "details" not in summary.model_dump()
    asyncio.run(run())


def test_fresh_cache_does_not_call_provider(monkeypatch):
    async def run():
        saved = product()
        saved.details = {"product_description": "Saved"}
        saved.details_updated_at = datetime.now(timezone.utc)
        provider, db = setup_service(monkeypatch, saved)
        detail = await module.WatchlistService().get_product(db, SimpleNamespace(id=7), 1)
        assert detail.details["product_description"] == "Saved"
        provider.assert_not_awaited()
    asyncio.run(run())


def test_refresh_failure_keeps_cache(monkeypatch):
    async def run():
        saved = product()
        saved.details = {"product_description": "Saved"}
        provider, db = setup_service(monkeypatch, saved)
        provider.side_effect = MARKETPLACE_UPSTREAM_ERROR.throw()
        detail = await module.WatchlistService().get_product(db, SimpleNamespace(id=7), 1, refresh=True)
        assert detail.details["product_description"] == "Saved"
        assert detail.details_refresh_failed is True
        db.commit.assert_not_awaited()
    asyncio.run(run())


def test_details_are_protected_by_ownership(monkeypatch):
    async def run():
        provider, db = setup_service(monkeypatch, product())
        monkeypatch.setattr(module.tracked_product_crud, "get_with_product_statistics", AsyncMock(return_value=None))
        with pytest.raises(CustomAppException):
            await module.WatchlistService().get_product(db, SimpleNamespace(id=7), 1)
        provider.assert_not_awaited()
    asyncio.run(run())


def test_detail_fetch_does_not_require_price(monkeypatch):
    async def run():
        client = RapidAPIClient()
        monkeypatch.setattr(client, "_request_product", AsyncMock(return_value={"asin": "B012345678", "product_description": "Out of stock but documented", "product_availability": "Currently unavailable"}))
        details = await client.fetch_details("B012345678")
        assert details["product_description"] == "Out of stock but documented"
    asyncio.run(run())


def test_demo_detail_is_hydrated_without_provider(monkeypatch):
    async def run():
        saved = product()
        saved.external_id = "DEMO-B09XS7JWHH"
        provider, db = setup_service(monkeypatch, saved)
        detail = await module.WatchlistService().get_product(db, SimpleNamespace(id=7), 1)
        assert detail.is_demo is True
        assert detail.details.get("product_description")
        provider.assert_not_awaited()
    asyncio.run(run())


def test_http_detail_response_preserves_payload_and_accepts_refresh(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.deps import get_current_user
    from app.api.v1.endpoints.watchlist_router import router
    from app.core.database import get_db
    app = FastAPI()
    app.include_router(router, prefix="/watchlist")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=7)
    saved = product()
    provider, db = setup_service(monkeypatch, saved)
    app.dependency_overrides[get_db] = lambda: db
    provider.return_value = {"product_description": "Full description", "product_information": {"Weight": "250 g"}, "custom_field": [1, False]}
    with TestClient(app) as client:
        response = client.get("/watchlist/1?refresh=true")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["details"]["custom_field"] == [1, False]
    assert data["details"]["product_information"]["Weight"] == "250 g"
    assert data["details_updated_at"]
    provider.assert_awaited_once()
