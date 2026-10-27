"""Script: Khởi tạo 1 sản phẩm demo riêng lẻ kèm lịch sử giá 30 ngày.

Chạy từ thư mục gốc repository:
    python backend/seed/seed_single_product.py
    python backend/seed/seed_single_product.py --no-track   # Chỉ tạo sản phẩm để tự dán link trên web
    python backend/seed/seed_single_product.py --email user@example.com

Hoặc chạy qua CLI điều phối seed.py:
    python backend/seed.py --single

Hoặc chạy trong backend container:
    docker compose exec backend python seed/seed_single_product.py
"""

import argparse
import asyncio
from decimal import Decimal
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, func, select

from seed.common import STANDALONE_DEMO_PRODUCT, format_display_price
from seed.seed_history import generate_price_curve
from seed.seed_products import get_or_create_fallback_user
from app.core.database import AsyncSessionLocal
from app.models.product_model import PriceHistory, Product, TrackedProduct
from app.models.user_model import User


async def seed_single_demo_product(user_email: str | None = None, auto_track: bool = True) -> Product:
    """Khởi tạo 1 sản phẩm demo riêng lẻ kèm toàn bộ lịch sử biến động giá 30 ngày."""
    async with AsyncSessionLocal() as db:
        try:
            item = STANDALONE_DEMO_PRODUCT
            print("=" * 70)
            print("       TRAKORA - KHỞI TẠO 1 SẢN PHẨM DEMO RIÊNG LẺ (STANDALONE)")
            print("=" * 70)
            print(f"📦 Đang xử lý sản phẩm: {item['name']}")

            # 1. Tìm hoặc tạo sản phẩm trong bảng 'products'
            existing = await db.scalar(
                select(Product).where(
                    Product.marketplace == item["marketplace"],
                    Product.external_id == item["external_id"],
                )
            )

            if existing is None:
                prod = Product(**item, tracked_by_count=0, untracked_since=None)
                db.add(prod)
                await db.flush()
                product = prod
                print(f" -> Đã tạo mới sản phẩm ID: {product.id}")
            else:
                for field, value in item.items():
                    setattr(existing, field, value)
                existing.untracked_since = None
                await db.flush()
                product = existing
                print(f" -> Đã cập nhật sản phẩm có sẵn ID: {product.id}")

            # 2. Xóa và tạo mới toàn bộ lịch sử giá 30 ngày cho sản phẩm này
            await db.execute(delete(PriceHistory).where(PriceHistory.product_id == product.id))
            await db.flush()

            price_points = await generate_price_curve(product.current_price, total_days=30)
            all_prices = [p[1] for p in price_points]
            min_p = min(all_prices)
            max_p = max(all_prices)

            # Cập nhật mốc giá đáy và đỉnh lịch sử cho sản phẩm
            product.price_low = min_p
            product.price_high = max_p

            BATCH_SIZE = 1000
            for i in range(0, len(price_points), BATCH_SIZE):
                batch = [
                    PriceHistory(product_id=product.id, price=price, recorded_at=ts)
                    for ts, price in price_points[i : i + BATCH_SIZE]
                ]
                db.add_all(batch)
                await db.flush()

            print(f" -> Đã lưu {len(price_points)} điểm lịch sử giá liên tục (31 ngày).")
            print(f"    Thấp nhất: ${min_p:.2f} | Cao nhất: ${max_p:.2f} | Hiện tại: ${product.current_price:.2f}")

            # 3. Gán theo dõi vào tài khoản người dùng nếu auto_track=True
            if auto_track:
                target_user = None
                if user_email:
                    target_user = await db.scalar(select(User).where(User.email == user_email))

                if target_user is None:
                    # Lấy user đầu tiên trong CSDL hoặc tạo user dự phòng
                    target_user = await db.scalar(select(User).order_by(User.id))
                    if target_user is None:
                        target_user = await get_or_create_fallback_user(db)

                print(f" -> Gán sản phẩm vào Watchlist của người dùng: {target_user.email}")

                # Xóa tracking cũ nếu có
                await db.execute(
                    delete(TrackedProduct).where(
                        TrackedProduct.user_id == target_user.id,
                        TrackedProduct.product_id == product.id,
                    )
                )

                target_price = (Decimal(str(product.current_price)) * Decimal("0.90")).quantize(Decimal("0.01"))
                db.add(
                    TrackedProduct(
                        user_id=target_user.id,
                        product_id=product.id,
                        target_price=target_price,
                        buy_when_good=True,
                        good_price_notified=False,
                        target_price_notified=False,
                    )
                )
                await db.flush()

                # Cập nhật tracked_by_count
                count_query = select(func.count()).select_from(TrackedProduct).where(
                    TrackedProduct.product_id == product.id
                )
                product.tracked_by_count = await db.scalar(count_query) or 0
                print(f" -> Đặt giá mục tiêu gợi ý: ${target_price:.2f} (thấp hơn 10% so với giá hiện tại).")
            else:
                print(" -> Chế độ --no-track: Không gán sẵn vào Watchlist.")
                print(f"    Bạn có thể dán link sau trên web để thử nghiệm thêm mới: {product.url}")

            await db.commit()

            print("\n" + "=" * 70)
            print("🎉 KHỞI TẠO SẢN PHẨM RIÊNG LẺ THÀNH CÔNG!")
            print(f" • Tên sản phẩm:  {product.name}")
            print(f" • Mã ASIN:       {product.external_id}")
            print(f" • Link Amazon:   {product.url}")
            print(f" • Giá hiện tại:  {format_display_price(product.current_price, product.currency)}")
            print(f" • Lịch sử giá:   {len(price_points)} điểm (đầy đủ mốc nét đứt trên biểu đồ)")
            print("=" * 70)

            return product
        except Exception as e:
            await db.rollback()
            print(f"❌ Lỗi khi seed sản phẩm riêng lẻ: {e}")
            raise


def main():
    parser = argparse.ArgumentParser(description="Trakora - Khởi tạo 1 sản phẩm demo riêng lẻ")
    parser.add_argument("--email", type=str, help="Email người dùng nhận theo dõi sản phẩm này")
    parser.add_argument(
        "--no-track",
        action="store_true",
        help="Chỉ nạp sản phẩm và lịch sử giá vào CSDL mà không gán theo dõi (để tự paste link trên web)",
    )
    args = parser.parse_args()

    asyncio.run(seed_single_demo_product(user_email=args.email, auto_track=not args.no_track))


if __name__ == "__main__":
    main()

