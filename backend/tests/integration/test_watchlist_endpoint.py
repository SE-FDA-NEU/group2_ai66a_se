from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.api.deps import get_current_user
from app.models.user_model import User
from app.services import watchlist_service as service_module


def _product(product_id=31, tracked_by_count=1):
    return SimpleNamespace(
        id=product_id,
        name="Sản phẩm đang theo dõi",
        image_url="https://example.test/product.jpg",
        shop_name="Cửa hàng mẫu",
        product_rating=Decimal("4.50"),
        review_count=10,
        current_price=Decimal("195.00"),
        original_price=Decimal("239.00"),
        currency="USD",
        in_stock=True,
        price_low=Decimal("189.00"),
        price_high=Decimal("300.00"),
        tracked_by_count=tracked_by_count,
        untracked_since=None,
    )


def _user(user_id):
    return User(
        id=user_id,
        email=f"user{user_id}@example.com",
        nickname=f"Người dùng {user_id}",
        password_hashed="hashed-password",
    )


@pytest.fixture
def current_user_override():
    from main import app

    app.dependency_overrides[get_current_user] = lambda: _user(7)
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_get_watchlist_returns_only_products_of_current_user(
    client, db_session, monkeypatch, current_user_override
):
    """GET watchlist chỉ trả về sản phẩm của người dùng hiện tại."""
    # Arrange
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "list_with_product_statistics",
        AsyncMock(
            side_effect=lambda _db, user_id: [
                (
                    _product(product_id=31),
                    Decimal("180.00"),
                    False,
                    7,
                    Decimal("195.00"),
                )
            ]
            if user_id == 7
            else []
        ),
    )

    # Act
    response = client.get("/api/v1/watchlist")

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["total"] == 1
    assert [item["id"] for item in response.json()["data"]["products"]] == [31]
    print("Danh sách watchlist của người dùng hiện tại:", response.json()["data"])


@pytest.mark.asyncio
async def test_delete_watchlist_keeps_product_tracked_when_other_tracker_remains(
    client, db_session, monkeypatch, current_user_override
):
    """Xóa một tracker nhưng vẫn giữ sản phẩm khi còn tracker khác."""
    # Arrange
    db_session.add = Mock()
    product = _product(tracked_by_count=2)
    monkeypatch.setattr(
        service_module.product_crud, "get_by_id", AsyncMock(return_value=product)
    )
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=SimpleNamespace()),
    )

    # Act
    response = client.delete("/api/v1/watchlist/31")

    # Assert
    assert response.status_code == 204
    assert product.tracked_by_count == 1
    assert product.untracked_since is None
    print(
        "Xóa một trong hai tracker:",
        {"tracked_by_count": product.tracked_by_count},
    )


@pytest.mark.asyncio
async def test_delete_last_watchlist_tracker_sets_untracked_timestamp_without_price_history_change(
    client, db_session, monkeypatch, current_user_override
):
    """Xóa tracker cuối cùng không thêm hoặc xóa bản ghi price history."""
    # Arrange
    db_session.add = Mock()
    product = _product(tracked_by_count=1)
    price_history = [
        {"price": Decimal("195.00")},
        {"price": Decimal("200.00")},
    ]
    initial_history_count = len(price_history)
    monkeypatch.setattr(
        service_module.product_crud, "get_by_id", AsyncMock(return_value=product)
    )
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=SimpleNamespace()),
    )

    # Act
    response = client.delete("/api/v1/watchlist/31")

    # Assert
    assert response.status_code == 204
    assert product.tracked_by_count == 0
    assert product.untracked_since is not None
    assert len(price_history) == initial_history_count
    print(
        "Xóa tracker cuối cùng:",
        {
            "tracked_by_count": product.tracked_by_count,
            "untracked_since": product.untracked_since,
            "price_history_count": len(price_history),
        },
    )
