"""Tạo dữ liệu mẫu cố định cho môi trường phát triển.

Chạy từ thư mục gốc repository:

    python backend/seed.py

Hoặc chạy trong backend container:

    docker compose exec backend python seed.py
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.product_model import PriceHistory, Product, TrackedProduct
from app.models.user_model import User


SEED_USER_EMAILS = tuple(f"seed.user{i}@example.com" for i in range(1, 6))
SEED_PRODUCT_IDS = tuple(f"SEED-{i:02d}" for i in range(1, 16))

PRODUCT_NAMES = (
    "Tai nghe chống ồn không dây",
    "Bàn phím cơ chơi game",
    "Củ sạc nhanh USB-C GaN",
    "Loa Bluetooth di động",
    "Đồng hồ thông minh theo dõi sức khỏe",
    "Webcam streaming 4K",
    "Chuột không dây công thái học",
    "Robot hút bụi",
    "Bình nước inox",
    "Ổ cứng SSD di động 1TB",
    "Đèn bàn LED",
    "Nồi chiên không dầu 5.5L",
    "Máy đọc sách 6 inch",
    "Máy xay cà phê nhỏ gọn",
    "Giá đỡ laptop gấp gọn",
)


def _product_payload(index: int) -> dict:
    base_price = Decimal("29.99") + Decimal(index * 11)
    current_price = (base_price - Decimal("2.50") * (index % 4)).quantize(
        Decimal("0.01")
    )
    original_price = (base_price + Decimal("15.00")).quantize(Decimal("0.01"))

    return {
        "marketplace": "amazon",
        "external_id": f"SEED-{index:02d}",
        "url": f"https://www.amazon.com/dp/SEED-{index:02d}",
        "name": PRODUCT_NAMES[index - 1],
        "image_url": f"https://images.example.com/seed-product-{index:02d}.jpg",
        "brand": "Trakora mẫu",
        "shop_name": "Cửa hàng mẫu Trakora",
        "product_rating": Decimal("4.00") + Decimal(index % 10) / Decimal("10"),
        "review_count": 100 + index * 37,
        "current_price": current_price,
        "original_price": original_price,
        "currency": "USD",
        "in_stock": True,
        "price_low": (base_price - Decimal("12.00")).quantize(Decimal("0.01")),
        "price_high": (base_price + Decimal("8.00")).quantize(Decimal("0.01")),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Sản phẩm mẫu tốt",
                "text": "Đây là đánh giá được tạo bởi dữ liệu mẫu.",
            }
        ],
    }


def _tracked_product_ids(user_index: int) -> tuple[str, ...]:
    start = (user_index - 1) * 2
    count = 4 + (user_index % 4)
    return tuple(
        SEED_PRODUCT_IDS[(start + offset) % len(SEED_PRODUCT_IDS)]
        for offset in range(count)
    )


async def _get_or_create_user(
    db, *, email: str, nickname: str, password: str
) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, nickname=nickname)
        db.add(user)

    user.nickname = nickname
    user.password_hashed = await hash_password(password)
    user.auth_provider = "email"
    user.is_developer = False
    user.is_activate = True
    await db.flush()
    return user


async def _get_or_create_product(db, index: int) -> Product:
    external_id = f"SEED-{index:02d}"
    product = await db.scalar(
        select(Product).where(
            Product.marketplace == "amazon",
            Product.external_id == external_id,
        )
    )
    payload = _product_payload(index)

    if product is None:
        product = Product(**payload, tracked_by_count=0, untracked_since=None)
        db.add(product)
    else:
        for field, value in payload.items():
            setattr(product, field, value)
        product.untracked_since = None

    await db.flush()
    return product


async def _seed_price_history(db, product: Product, index: int) -> None:
    now = datetime.now(timezone.utc)
    base_price = Decimal("29.99") + Decimal(index * 11)

    for days_ago in range(14, 0, -1):
        recorded_at = (now - timedelta(days=days_ago)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        price = (
            base_price
            + Decimal((days_ago + index) % 5 - 2) * Decimal("2.50")
        ).quantize(Decimal("0.01"))

        history = await db.scalar(
            select(PriceHistory).where(
                PriceHistory.product_id == product.id,
                PriceHistory.recorded_at == recorded_at,
            )
        )
        if history is None:
            db.add(
                PriceHistory(
                    product_id=product.id,
                    price=price,
                    recorded_at=recorded_at,
                )
            )
        else:
            history.price = price


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        try:
            users = [
                await _get_or_create_user(
                    db,
                    email=email,
                    nickname=f"Người dùng mẫu {index}",
                    password=f"SeedUser{index}123!",
                )
                for index, email in enumerate(SEED_USER_EMAILS, start=1)
            ]

            products = [
                await _get_or_create_product(db, index)
                for index in range(1, len(SEED_PRODUCT_IDS) + 1)
            ]
            product_by_external_id = {
                product.external_id: product for product in products
            }

            for index, product in enumerate(products, start=1):
                await _seed_price_history(db, product, index)

            seed_user_ids = [user.id for user in users]
            await db.execute(
                delete(TrackedProduct).where(
                    TrackedProduct.user_id.in_(seed_user_ids)
                )
            )

            for user_index, user in enumerate(users, start=1):
                for offset, external_id in enumerate(
                    _tracked_product_ids(user_index)
                ):
                    product = product_by_external_id[external_id]
                    db.add(
                        TrackedProduct(
                            user_id=user.id,
                            product_id=product.id,
                            target_price=(
                                Decimal(product.current_price) - Decimal("5.00")
                            ).quantize(Decimal("0.01")),
                            buy_when_good=offset % 2 == 0,
                        )
                    )

            await db.flush()
            tracked_counts = {product.id: 0 for product in products}
            tracking_rows = await db.scalars(
                select(TrackedProduct).where(
                    TrackedProduct.product_id.in_(tracked_counts)
                )
            )
            for tracking in tracking_rows:
                tracked_counts[tracking.product_id] += 1
            for product in products:
                product.tracked_by_count = tracked_counts[product.id]

            await db.commit()
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed())
    print("Đã tạo dữ liệu mẫu thành công.")
