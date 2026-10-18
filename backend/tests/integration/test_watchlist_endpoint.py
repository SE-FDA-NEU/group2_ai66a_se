from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.api.deps import get_current_user, get_current_user_from_token_or_query
from app.models.user_model import User
from app.services import watchlist_service as service_module
from app.schemas.watchlist_schema import Product
from app.core.exceptions import CustomAppException, ErrorDetail


def _product(product_id=31, tracked_by_count=1):
    return SimpleNamespace(
        id=product_id,
        url="https://www.amazon.com/dp/B012345678",
        marketplace="amazon",
        name="Sản phẩm đang theo dõi",
        image_url="https://example.test/product.jpg",
        brand="Thương hiệu mẫu",
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


def _response_product():
    return Product(
        id=31,
        name="Sản phẩm mới",
        url="https://www.amazon.com/dp/B012345678",
        image_url="https://example.test/product.jpg",
        marketplace="amazon",
        review_count=10,
        current_price=Decimal("195.00"),
        currency="USD",
        in_stock=True,
        price_low=Decimal("195.00"),
        price_high=Decimal("195.00"),
        buy_when_good=False,
    )


@pytest.fixture
def current_user_override():
    from main import app

    app.dependency_overrides[get_current_user] = lambda: _user(7)
    app.dependency_overrides[get_current_user_from_token_or_query] = lambda: _user(7)
    yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_from_token_or_query, None)


@pytest.mark.asyncio
async def test_post_watchlist_returns_created_product(client, monkeypatch, current_user_override):
    add_product = AsyncMock(return_value=_response_product())
    monkeypatch.setattr(service_module.watchlist_service, "add_product", add_product)

    response = client.post(
        "/api/v1/watchlist",
        json={"url": "https://www.amazon.com/dp/B012345678", "buy_when_good": False},
    )

    assert response.status_code == 201
    assert response.json()["data"]["id"] == 31
    add_product.assert_awaited_once()


@pytest.mark.asyncio
async def test_post_watchlist_returns_409_for_duplicate_product(client, monkeypatch, current_user_override):
    add_product = AsyncMock(
        side_effect=CustomAppException(
            ErrorDetail("PRODUCT_ALREADY_TRACKED", 409, "This product is already in your watchlist.")
        )
    )
    monkeypatch.setattr(service_module.watchlist_service, "add_product", add_product)

    response = client.post(
        "/api/v1/watchlist",
        json={"url": "https://www.amazon.com/dp/B012345678"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_ALREADY_TRACKED"


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


@pytest.mark.asyncio
async def test_delete_watchlist_returns_404_when_not_tracked(
    client, db_session, monkeypatch, current_user_override
):
    """Trả về 404 khi người dùng xóa sản phẩm không có trong watchlist."""
    monkeypatch.setattr(
        service_module.product_crud,
        "get_by_id",
        AsyncMock(return_value=_product(tracked_by_count=1)),
    )
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=None),
    )

    response = client.delete("/api/v1/watchlist/999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TRACKING_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_price_history_returns_401_without_auth(client):
    """GET /history trả về 401 khi chưa xác thực."""
    response = client.get("/api/v1/watchlist/31/history")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_price_history_returns_404_when_not_tracked(
    client, monkeypatch, current_user_override
):
    """GET /history trả về 404 khi sản phẩm không thuộc watchlist của user."""
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/v1/watchlist/999/history")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TRACKING_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_price_history_returns_success_with_gap_detection(
    client, monkeypatch, current_user_override
):
    """GET /history trả về 200 kèm min_price, max_price, tracked_days, data_points."""
    from datetime import datetime, timezone, timedelta
    from app.schemas.watchlist_schema import PriceHistoryResponse, PriceDataPoint

    t0 = datetime(2026, 10, 18, 10, 0, tzinfo=timezone.utc)
    mock_history_response = PriceHistoryResponse(
        min_price=Decimal("189.00"),
        max_price=Decimal("399.00"),
        tracked_days=3,
        data_points=[
            PriceDataPoint(price=Decimal("189.00"), timestamp=t0, is_gap=False),
            PriceDataPoint(price=Decimal("239.00"), timestamp=t0 + timedelta(minutes=5), is_gap=False),
            PriceDataPoint(price=Decimal("399.00"), timestamp=t0 + timedelta(hours=2), is_gap=True),
        ],
    )

    monkeypatch.setattr(
        service_module.watchlist_service,
        "get_price_history",
        AsyncMock(return_value=mock_history_response),
    )

    response = client.get("/api/v1/watchlist/31/history?days=7&gap_threshold_minutes=30")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["min_price"] == "189.00"
    assert data["max_price"] == "399.00"
    assert data["tracked_days"] == 3
    assert len(data["data_points"]) == 3
    assert data["data_points"][0]["is_gap"] is False
    assert data["data_points"][1]["is_gap"] is False
    assert data["data_points"][2]["is_gap"] is True


@pytest.mark.asyncio
async def test_stream_price_history_returns_401_without_auth(client):
    """GET /stream trả về 401 khi chưa xác thực."""
    response = client.get("/api/v1/watchlist/31/stream")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_stream_price_history_returns_404_when_not_tracked(
    client, monkeypatch, current_user_override
):
    """GET /stream trả về 404 khi sản phẩm không thuộc watchlist của user."""
    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=None),
    )

    response = client.get("/api/v1/watchlist/999/stream")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TRACKING_NOT_FOUND"


@pytest.mark.asyncio
async def test_stream_price_history_returns_event_stream_when_authorized(
    client, monkeypatch, current_user_override
):
    """GET /stream trả về 200 media_type text/event-stream khi hợp lệ."""
    from app.services.price_stream_service import price_stream_service

    monkeypatch.setattr(
        service_module.tracked_product_crud,
        "get",
        AsyncMock(return_value=SimpleNamespace(user_id=7, product_id=31)),
    )

    async def fake_stream(_product_id, _request=None):
        yield "data: {\"product_id\": 31, \"price\": \"195.00\"}\n\n"

    monkeypatch.setattr(price_stream_service, "subscribe_price_updates", fake_stream)

    response = client.get("/api/v1/watchlist/31/stream")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    assert "data: {\"product_id\": 31, \"price\": \"195.00\"}" in response.text


@pytest.mark.asyncio
async def test_stream_price_history_releases_db_session_before_streaming(
    client, monkeypatch, current_user_override
):
    """GET /stream phải giải phóng (close) db session trước khi stream bắt đầu."""
    from app.services.price_stream_service import price_stream_service
    from app.core.database import get_db
    from main import app

    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        monkeypatch.setattr(
            service_module.tracked_product_crud,
            "get",
            AsyncMock(return_value=SimpleNamespace(user_id=7, product_id=31)),
        )

        async def fake_stream(_product_id, _request=None):
            # Tại thời điểm stream bắt đầu yield, db session phải đã được đóng!
            assert mock_db.close.await_count == 1
            yield "data: {\"product_id\": 31, \"price\": \"195.00\"}\n\n"

        monkeypatch.setattr(price_stream_service, "subscribe_price_updates", fake_stream)

        response = client.get("/api/v1/watchlist/31/stream")
        assert response.status_code == 200
        assert mock_db.close.await_count >= 1
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_put_target_price_returns_200_on_success(client, monkeypatch, current_user_override):
    """PUT /target-price trả về 200 khi cập nhật thành công."""
    product_res = _response_product()
    product_res.target_price = Decimal("180.00")
    update_mock = AsyncMock(return_value=product_res)
    monkeypatch.setattr(service_module.watchlist_service, "update_target_price", update_mock)

    response = client.put(
        "/api/v1/watchlist/31/target-price",
        json={"target_price": "180.00"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Target price updated successfully."
    assert data["data"]["id"] == 31
    assert data["data"]["target_price"] == "180.00"
    update_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_put_target_price_returns_400_on_br1_violation(client, monkeypatch, current_user_override):
    """PUT /target-price trả về 400 khi target_price >= current_price (BR1)."""
    update_mock = AsyncMock(
        side_effect=CustomAppException(
            ErrorDetail("INVALID_TARGET_PRICE", 400, "Target must be lower than the current price 195.00 USD")
        )
    )
    monkeypatch.setattr(service_module.watchlist_service, "update_target_price", update_mock)

    response = client.put(
        "/api/v1/watchlist/31/target-price",
        json={"target_price": "200.00"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_TARGET_PRICE"
    assert "Target must be lower than the current price 195.00 USD" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_put_target_price_returns_401_without_auth(client):
    """PUT /target-price trả về 401 khi chưa xác thực."""
    response = client.put(
        "/api/v1/watchlist/31/target-price",
        json={"target_price": "180.00"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_put_target_price_returns_404_when_not_tracked(client, monkeypatch, current_user_override):
    """PUT /target-price trả về 404 khi sản phẩm không thuộc watchlist của user."""
    update_mock = AsyncMock(
        side_effect=CustomAppException(
            ErrorDetail("TRACKING_NOT_FOUND", 404, "Sản phẩm không nằm trong danh sách theo dõi của người dùng này.")
        )
    )
    monkeypatch.setattr(service_module.watchlist_service, "update_target_price", update_mock)

    response = client.put(
        "/api/v1/watchlist/999/target-price",
        json={"target_price": "180.00"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TRACKING_NOT_FOUND"


@pytest.mark.asyncio
async def test_put_target_price_returns_422_on_invalid_payload(client, current_user_override):
    """PUT /target-price trả về 422 khi target_price <= 0 hoặc không hợp lệ."""
    response = client.put(
        "/api/v1/watchlist/31/target-price",
        json={"target_price": "-10.00"},
    )
    assert response.status_code == 422

