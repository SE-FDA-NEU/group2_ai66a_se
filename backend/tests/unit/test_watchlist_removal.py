import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import app.services.watchlist_service as service_module
from app.core.exceptions import CustomAppException


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    async def delete(self, _value):
        return None

    async def flush(self):
        return None

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1

    def add(self, _value):
        return None


def _product(tracked_by_count):
    return SimpleNamespace(tracked_by_count=tracked_by_count, untracked_since=None)


def test_remove_product_marks_last_tracker_time(monkeypatch):
    async def scenario():
        product = _product(1)
        monkeypatch.setattr(
            service_module.tracked_product_crud, "get", AsyncMock(return_value=SimpleNamespace())
        )
        monkeypatch.setattr(
            service_module.product_crud, "get_by_id", AsyncMock(return_value=product)
        )
        db = FakeSession()

        await service_module.watchlist_service.remove_product(db, SimpleNamespace(id=7), 31)

        assert product.tracked_by_count == 0
        assert product.untracked_since is not None
        assert db.commits == 1

    asyncio.run(scenario())


def test_remove_product_keeps_untracked_since_null_when_other_trackers_remain(monkeypatch):
    async def scenario():
        product = _product(2)
        monkeypatch.setattr(
            service_module.tracked_product_crud, "get", AsyncMock(return_value=SimpleNamespace())
        )
        monkeypatch.setattr(
            service_module.product_crud, "get_by_id", AsyncMock(return_value=product)
        )

        await service_module.watchlist_service.remove_product(
            FakeSession(), SimpleNamespace(id=7), 31
        )

        assert product.tracked_by_count == 1
        assert product.untracked_since is None

    asyncio.run(scenario())


def test_remove_product_returns_not_found_for_missing_tracking(monkeypatch):
    async def scenario():
        monkeypatch.setattr(
            service_module.tracked_product_crud, "get", AsyncMock(return_value=None)
        )
        db = FakeSession()

        with pytest.raises(CustomAppException) as error:
            await service_module.watchlist_service.remove_product(
                db, SimpleNamespace(id=7), 31
            )

        assert error.value.status_code == 404
        assert db.rollbacks == 1

    asyncio.run(scenario())
