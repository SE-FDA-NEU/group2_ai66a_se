"""Script 2: Tạo dữ liệu lịch sử giá biến động chân thực trong 30 ngày cho toàn bộ sản phẩm.

Chạy từ thư mục gốc repository:
    python backend/seed/seed_history.py

Hoặc chạy trong backend container:
    docker compose exec backend python seed/seed_history.py
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import math
from pathlib import Path
import random
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import Date, delete, func, select

from app.core.database import AsyncSessionLocal
from app.models.product_model import PriceHistory, Product


async def generate_price_curve(base_price: Decimal, total_days: int = 30) -> list[tuple[datetime, Decimal]]:
    """Tạo chuỗi quan sát giá liên tục cách đều 5 phút (không bị khoảng trống Gap > 30 phút)."""
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    points: list[tuple[datetime, Decimal]] = []
    float_base = float(base_price)

    # Hệ số ngẫu nhiên cho từng sản phẩm để mỗi sản phẩm có dáng đồ thị riêng biệt
    volatility = random.uniform(0.015, 0.035)
    cycle_speed = random.uniform(0.12, 0.25)

    # 1. Tạo các mốc thời gian: 7 ngày gần nhất cách nhau đúng 5 phút; ngày 8-30 cách nhau 15 phút (< 30 phút)
    timestamps: list[datetime] = []
    current_time = now - timedelta(days=total_days)

    while current_time <= now:
        timestamps.append(current_time)
        days_from_now = (now - current_time).total_seconds() / 86400.0
        # 7 ngày gần nhất: bước nhảy đúng 5 phút
        if days_from_now <= 7.0:
            current_time += timedelta(minutes=5)
        # Các ngày trước đó: bước nhảy 15 phút (vẫn < 30 phút nên hoàn toàn liên tục, không có gap)
        else:
            current_time += timedelta(minutes=15)

    if not timestamps or timestamps[-1] < now:
        timestamps.append(now)

    # 2. Sinh đường giá mô phỏng: giữ giá ổn định theo từng phiên vài tiếng rồi mới đổi giá
    session_length_steps = random.randint(30, 60)
    current_price_val = float_base
    step_count = 0

    for ts in timestamps:
        days_ago = (now - ts).total_seconds() / 86400.0

        if step_count % session_length_steps == 0:
            sine_wave = math.sin(days_ago * cycle_speed) * 0.06
            noise = random.uniform(-volatility, volatility)
            multiplier = 1.0 + sine_wave + noise

            # Đợt Flash Sale cách đây 10 đến 14 ngày (giảm sâu để tạo đáy)
            if 10.0 <= days_ago <= 14.0:
                multiplier *= random.uniform(0.84, 0.88)
            # Đợt tăng giá cách đây 20 đến 24 ngày (tạo đỉnh)
            elif 20.0 <= days_ago <= 24.0:
                multiplier *= random.uniform(1.06, 1.10)

            current_price_val = max(float_base * 0.6, float_base * multiplier)
            session_length_steps = random.randint(24, 72)  # Phiên kéo dài 2h - 6h

        step_count += 1

        # Điểm cuối cùng (hiện tại) chốt đúng giá gốc của sản phẩm
        if ts == now or days_ago < 0.001:
            point_price = Decimal(str(round(float_base, 2)))
        else:
            # Nhiễu cực nhỏ trong phiên để đường giá tự nhiên
            micro_jitter = random.uniform(-0.001, 0.001) * float_base
            point_price = Decimal(str(round(current_price_val + micro_jitter, 2)))

        points.append((ts, point_price))

    return points


async def seed_price_history(days: int = 30) -> None:
    """Tạo lịch sử giá biến động cho toàn bộ sản phẩm hiện có trong CSDL."""
    async with AsyncSessionLocal() as db:
        try:
            print(f"\n[Bước 2/3] Khởi tạo lịch sử biến động giá trong {days} ngày cho toàn bộ sản phẩm...")

            products = (await db.scalars(select(Product).order_by(Product.id))).all()
            if not products:
                print(" -> Không tìm thấy sản phẩm nào trong CSDL để tạo lịch sử giá.")
                return

            print(f" -> Tìm thấy {len(products)} sản phẩm. Bắt đầu tạo dữ liệu lịch sử giá...")

            for product in products:
                # Xóa dữ liệu lịch sử giá cũ của sản phẩm này để tạo lại biểu đồ chuẩn xác
                await db.execute(delete(PriceHistory).where(PriceHistory.product_id == product.id))

                curve = await generate_price_curve(
                    base_price=Decimal(product.current_price),
                    total_days=days,
                )

                history_rows = [
                    PriceHistory(
                        product_id=product.id,
                        price=price,
                        recorded_at=ts,
                    )
                    for ts, price in curve
                ]
                db.add_all(history_rows)
                await db.flush()

                # Tính toán lại min_price và max_price thực tế từ toàn bộ lịch sử vừa tạo
                prices = [p for _, p in curve]
                min_price = min(prices)
                max_price = max(prices)
                latest_price = curve[-1][1]

                product.price_low = min_price
                product.price_high = max_price
                product.current_price = latest_price
                product.last_refreshed_at = curve[-1][0]

                # Đếm số ngày riêng biệt trong lịch sử
                distinct_days = await db.scalar(
                    select(func.count(func.distinct(func.cast(PriceHistory.recorded_at, Date))))
                    .where(PriceHistory.product_id == product.id)
                ) or 0

                print(
                    f"  ✓ [{product.id:02d}] {product.name[:45]:<45} | "
                    f"{len(curve)} điểm | {distinct_days} ngày | "
                    f"Min: ${min_price:.2f} | Max: ${max_price:.2f} | Hiện tại: ${latest_price:.2f}"
                )

            await db.commit()
            print(f"\n -> Đã tạo thành công lịch sử giá biến động cho toàn bộ {len(products)} sản phẩm!")
            print(" -> Dữ liệu đảm bảo >= 7 ngày riêng biệt, sẵn sàng hiển thị đầy đủ nhãn giá và biểu đồ trên UI.")
        except Exception as e:
            await db.rollback()
            print(f"Lỗi khi seed lịch sử giá: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_price_history())
