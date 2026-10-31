"""Script 1: Tạo demo 10 sản phẩm và gán theo dõi cho các email đang tồn tại trong CSDL.

Chạy từ thư mục gốc repository:
    python backend/seed/seed_products.py

Hoặc chạy trong backend container:
    docker compose exec backend python seed/seed_products.py
"""

import asyncio
from decimal import Decimal
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, func, select

from seed.common import DEMO_PRODUCTS
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.crud import notification_settings_crud
from app.models.product_model import Product, TrackedProduct
from app.models.user_model import User


async def get_or_create_fallback_user(db) -> User:
    """Tạo người dùng dự phòng nếu CSDL chưa có bất kỳ tài khoản nào."""
    email = "demo.user@example.com"
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            nickname="Trakora Demo User",
            password_hashed=await hash_password("SeedUser123!"),
            auth_provider="email",
            is_developer=True,
            is_activate=True,
        )
        db.add(user)
        await db.flush()
        print(f" -> Đã tạo tài khoản demo mẫu dự phòng: {email} / SeedUser123!")
    return user


async def seed_demo_products() -> list[Product]:
    """Tạo hoặc cập nhật 10 sản phẩm demo và gán theo dõi cho các email hiện có."""
    async with AsyncSessionLocal() as db:
        try:
            print("\n[Bước 1/3] Bắt đầu khởi tạo 10 sản phẩm demo công nghệ cao cấp...")

            # 1. Dọn dẹp các sản phẩm demo cũ (SEED- hoặc ASIN trần chưa có tiền tố DEMO-)
            old_raw_asins = [item["external_id"].replace("DEMO-", "") for item in DEMO_PRODUCTS] + [
                "B09BS26B8B", "B09TQXZM1D", "B0CFW5V1C3"
            ]
            await db.execute(delete(Product).where(Product.external_id.in_(old_raw_asins)))
            await db.flush()

            # 2. Khởi tạo / Cập nhật 10 sản phẩm demo vào CSDL
            db_products: list[Product] = []
            for item in DEMO_PRODUCTS:
                existing = await db.scalar(
                    select(Product).where(
                        Product.marketplace == item["marketplace"],
                        Product.external_id == item["external_id"],
                    )
                )
                if existing is None:
                    prod = Product(**item, tracked_by_count=0, untracked_since=None)
                    db.add(prod)
                    db_products.append(prod)
                else:
                    for field, value in item.items():
                        setattr(existing, field, value)
                    existing.untracked_since = None
                    db_products.append(existing)

            await db.flush()
            print(f" -> Đã lưu thành công {len(db_products)} sản phẩm demo vào bảng 'products'.")

            # 2. Truy vấn danh sách người dùng thực tế đang tồn tại trong CSDL
            users = (await db.scalars(select(User).order_by(User.id))).all()
            if not users:
                print(" -> Chưa có tài khoản nào trong CSDL. Tự động khởi tạo 1 tài khoản demo...")
                fallback_user = await get_or_create_fallback_user(db)
                users = [fallback_user]

            user_emails = [u.email for u in users]
            print(f" -> Tìm thấy {len(users)} người dùng trong CSDL: {', '.join(user_emails)}")

            # 3. Gán theo dõi 10 sản phẩm cho từng người dùng
            demo_product_ids = [p.id for p in db_products]
            user_ids = [u.id for u in users]

            # Xóa các tracking demo cũ của các user này để ghi nhận mới nhất và sạch sẽ
            await db.execute(
                delete(TrackedProduct).where(
                    TrackedProduct.user_id.in_(user_ids),
                    TrackedProduct.product_id.in_(demo_product_ids),
                )
            )

            tracked_count = 0
            for user in users:
                # Bật tùy chọn email để kiểm tra được cả tính năng xếp hàng email thông báo
                pref = await notification_settings_crud.get_or_create(db, user.id)
                pref.email_enabled = True
                db.add(pref)

                for idx, product in enumerate(db_products):
                    # Thiết lập mức giá mục tiêu thấp hơn khoảng 10% so với giá hiện tại
                    target_price = (
                        Decimal(product.current_price) * Decimal("0.90")
                    ).quantize(Decimal("1"))

                    # Luân phiên bật tính năng buy_when_good để người dùng test đủ 2 loại thông báo
                    buy_when_good = True

                    db.add(
                        TrackedProduct(
                            user_id=user.id,
                            product_id=product.id,
                            target_price=target_price,
                            buy_when_good=buy_when_good,
                            good_price_notified=False,
                            target_price_notified=False,
                        )
                    )
                    tracked_count += 1

            await db.flush()
            print(f" -> Đã thiết lập {tracked_count} lượt theo dõi cho {len(users)} người dùng.")

            # 4. Cập nhật lại chính xác tracked_by_count cho từng sản phẩm
            for product in db_products:
                count_query = select(func.count()).select_from(TrackedProduct).where(
                    TrackedProduct.product_id == product.id
                )
                actual_count = await db.scalar(count_query) or 0
                product.tracked_by_count = actual_count

            await db.commit()
            print(" -> Hoàn tất gán 10 sản phẩm vào Watchlist của toàn bộ người dùng!")

            print("\nDanh sách 10 sản phẩm đã tạo & đang được theo dõi:")
            for p in db_products:
                print(f"  [{p.id:02d}] {p.name[:55]:<55} | Giá: ${p.current_price} | Người theo dõi: {p.tracked_by_count}")

            return db_products
        except Exception as e:
            await db.rollback()
            print(f"Lỗi khi seed sản phẩm: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_demo_products())
