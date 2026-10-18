from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

import app.services.price_monitor_service as monitor_module
from app.crud.product_crud import CRUDProduct, product_crud
from app.services.price_monitor_service import PriceMonitorService


class FakeDBSession:
    def __init__(self, scalar_return=None):
        self._scalar_return = scalar_return or []
        self.execute_calls = []
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def scalars(self, _statement):
        return self._scalar_return

    async def execute(self, statement):
        self.execute_calls.append(statement)
        return MagicMock(rowcount=len(self._scalar_return))

    async def commit(self):
        self.committed = True


@pytest.mark.asyncio
async def test_cleanup_expired_products_calls_crud_with_seven_day_cutoff(monkeypatch):
    """Xác nhận cleanup_expired_products tính toán cutoff 7 ngày và gọi product_crud."""
    mock_delete = AsyncMock(return_value=[12, 34])
    monkeypatch.setattr(monitor_module.product_crud, "delete_expired_untracked", mock_delete)
    fake_session = FakeDBSession()
    monkeypatch.setattr(monitor_module, "AsyncSessionLocal", lambda: fake_session)

    service = PriceMonitorService()
    deleted = await service.cleanup_expired_products(retention_days=7)

    assert deleted == [12, 34]
    mock_delete.assert_awaited_once()
    _, kwargs = mock_delete.await_args
    cutoff = kwargs["cutoff"]
    now = datetime.now(timezone.utc)
    expected_cutoff = now - timedelta(days=7)
    # Check that cutoff is within 2 seconds of expected
    assert abs((cutoff - expected_cutoff).total_seconds()) < 2


@pytest.mark.asyncio
async def test_cleanup_expired_products_returns_empty_when_no_expired(monkeypatch):
    """Khi không có sản phẩm nào hết hạn thì trả về danh sách rỗng."""
    mock_delete = AsyncMock(return_value=[])
    monkeypatch.setattr(monitor_module.product_crud, "delete_expired_untracked", mock_delete)
    fake_session = FakeDBSession()
    monkeypatch.setattr(monitor_module, "AsyncSessionLocal", lambda: fake_session)

    service = PriceMonitorService()
    deleted = await service.cleanup_expired_products(retention_days=7)

    assert deleted == []
    mock_delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_crud_delete_expired_untracked_executes_delete_when_found():
    """CRUD delete_expired_untracked thực hiện delete khi tìm thấy expired IDs."""
    db = FakeDBSession(scalar_return=[101, 102])
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    crud = CRUDProduct()
    result = await crud.delete_expired_untracked(db, cutoff=cutoff)

    assert result == [101, 102]
    assert len(db.execute_calls) == 1
    assert db.committed is True


@pytest.mark.asyncio
async def test_crud_delete_expired_untracked_skips_delete_when_none_found():
    """CRUD delete_expired_untracked không gọi delete khi không có SP hết hạn."""
    db = FakeDBSession(scalar_return=[])
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    crud = CRUDProduct()
    result = await crud.delete_expired_untracked(db, cutoff=cutoff)

    assert result == []
    assert len(db.execute_calls) == 0
    assert db.committed is False


@pytest.mark.asyncio
async def test_crud_delete_by_id():
    """CRUD delete_by_id xóa sản phẩm theo ID."""
    db = FakeDBSession()
    crud = CRUDProduct()
    success = await crud.delete_by_id(db, product_id=99)

    assert len(db.execute_calls) == 1
    assert db.committed is True

