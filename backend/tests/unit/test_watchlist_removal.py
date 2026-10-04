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


@pytest.mark.asyncio
async def test_remove_product_sets_untracked_since_when_last_tracker_is_removed(monkeypatch):
    # Arrange
    product = _product(1)
    tracking = SimpleNamespace()
    product_get = AsyncMock(return_value=product)
    tracking_get = AsyncMock(return_value=tracking)
    monkeypatch.setattr(service_module.tracked_product_crud, "get", tracking_get)
    monkeypatch.setattr(service_module.product_crud, "get_by_id", product_get)
    db = FakeSession()

    # Act
    await service_module.watchlist_service.remove_product(db, SimpleNamespace(id=7), 31)

    # Assert
    assert product.tracked_by_count == 0
    assert product.untracked_since is not None
    assert db.commits == 1
    product_get.assert_awaited_once_with(db, 31, for_update=True)
    tracking_get.assert_awaited_once_with(db, 7, 31, for_update=True)
    print(
        "Last tracker removed:",
        {"tracked_by_count": product.tracked_by_count, "untracked_since": product.untracked_since},
    )


@pytest.mark.asyncio
async def test_remove_product_keeps_untracked_since_null_when_other_trackers_remain(monkeypatch):
    # Arrange
    product = _product(2)
    monkeypatch.setattr(
        service_module.tracked_product_crud, "get", AsyncMock(return_value=SimpleNamespace())
    )
    monkeypatch.setattr(service_module.product_crud, "get_by_id", AsyncMock(return_value=product))
    db = FakeSession()

    # Act
    await service_module.watchlist_service.remove_product(db, SimpleNamespace(id=7), 31)

    # Assert
    assert product.tracked_by_count == 1
    assert product.untracked_since is None
    assert db.commits == 1
    print("Tracker remains:", {"tracked_by_count": product.tracked_by_count})


@pytest.mark.asyncio
async def test_remove_product_returns_not_found_when_tracking_does_not_exist(monkeypatch):
    # Arrange
    product_get = AsyncMock(return_value=_product(1))
    tracking_get = AsyncMock(return_value=None)
    monkeypatch.setattr(service_module.product_crud, "get_by_id", product_get)
    monkeypatch.setattr(service_module.tracked_product_crud, "get", tracking_get)
    db = FakeSession()

    # Act and assert
    with pytest.raises(CustomAppException) as error:
        await service_module.watchlist_service.remove_product(
            db, SimpleNamespace(id=7), 31
        )

    assert error.value.status_code == 404
    assert db.rollbacks == 1
    product_get.assert_awaited_once_with(db, 31, for_update=True)
    tracking_get.assert_awaited_once_with(db, 7, 31, for_update=True)
    print("Missing tracking response:", {"status_code": error.value.status_code})
