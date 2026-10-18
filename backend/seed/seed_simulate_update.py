"""Script 3: Giả lập cập nhật một mức giá ngẫu nhiên cho từng sản phẩm để kiểm tra tính năng thông báo.

Chạy từ thư mục gốc repository:
    python backend/seed/seed_simulate_update.py

Hoặc chạy trong backend container:
    docker compose exec backend python seed/seed_simulate_update.py
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import random
import sys

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from seed.common import format_display_price
from app.core.database import AsyncSessionLocal
from app.crud import notification_crud, product_crud, tracked_product_crud
from app.models.product_model import PriceHistory, Product, TrackedProduct
from app.models.user_model import User
from app.services.notification_service import enqueue_price_email
from app.services.price_monitor_service import price_monitor_service
from app.services.price_stream_service import price_stream_service


async def simulate_price_updates() -> None:
    """Giả lập cập nhật giá ngẫu nhiên và kích hoạt hệ thống thông báo đa kênh."""
    async with AsyncSessionLocal() as db:
        try:
            print("\n[Bước 3/3] Giả lập cập nhật giá ngẫu nhiên và kiểm tra tính năng thông báo...")

            # 1. Lấy danh sách toàn bộ sản phẩm đang có trong CSDL
            products = (await db.scalars(select(Product).order_by(Product.id))).all()
            if not products:
                print(" -> Không tìm thấy sản phẩm nào trong CSDL để giả lập giá.")
                return

            # Tạo map tra cứu email người dùng
            users = (await db.scalars(select(User))).all()
            user_map = {u.id: u.email for u in users}

            now = datetime.now(timezone.utc)
            total_notifications = 0

            print(f" -> Đang quét {len(products)} sản phẩm để tạo biến động giá...\n")

            for idx, product in enumerate(products):
                old_price = Decimal(str(product.current_price))
                trackers = (
                    await db.scalars(
                        select(TrackedProduct).where(TrackedProduct.product_id == product.id)
                    )
                ).all()

                # Chọn chiến lược biến động giá để đảm bảo kích hoạt đủ các loại thông báo:
                # Món 0, 3, 6,...: Giảm sốc chạm đáy -> kích hoạt Good Price + Target Price Reached
                # Món 1, 4, 7,...: Giảm vừa dưới Target Price -> kích hoạt Target Price Reached
                # Món 2, 5, 8,...: Tăng giá lên trên Target Price -> kích hoạt Price Above Target
                scenario = idx % 3

                sample_target = trackers[0].target_price if trackers and trackers[0].target_price else old_price * Decimal("0.9")
                lowest_price = Decimal(str(product.price_low))

                if scenario == 0:
                    # Kịch bản A: Giảm sâu dưới cả target_price và price_low
                    deal_target = min(Decimal(str(sample_target)), lowest_price)
                    new_price = (deal_target * Decimal(str(random.uniform(0.92, 0.96)))).quantize(Decimal("0.01"))
                    scenario_desc = "Giảm sốc chạm đáy (Kích hoạt Good Price & Target Price)"
                elif scenario == 1:
                    # Kịch bản B: Giảm chạm hoặc dưới target_price
                    new_price = (Decimal(str(sample_target)) * Decimal(str(random.uniform(0.95, 0.99)))).quantize(Decimal("0.01"))
                    scenario_desc = "Giảm chạm mục tiêu (Kích hoạt Target Price Reached)"
                else:
                    # Kịch bản C: Tăng giá cao hơn mục tiêu
                    new_price = (Decimal(str(sample_target)) * Decimal(str(random.uniform(1.08, 1.15)))).quantize(Decimal("0.01"))
                    scenario_desc = "Tăng giá trên mục tiêu (Kích hoạt Price Above Target)"

                # 2. Ghi nhận snapshot lịch sử giá mới
                db.add(PriceHistory(product_id=product.id, price=new_price, recorded_at=now))

                # 3. Cập nhật thông tin giá sản phẩm
                product.current_price = new_price
                product.price_low = min(Decimal(str(product.price_low)), new_price)
                product.price_high = max(Decimal(str(product.price_high)), new_price)
                product.last_refreshed_at = now
                await db.flush()

                print(f"📦 [{product.id:02d}] {product.name[:45]}")
                print(f"   Giá cũ: ${old_price:.2f} ──> Giá mới: ${new_price:.2f} ({scenario_desc})")

                # Chuẩn bị chuỗi hiển thị giá cho thông báo
                current_disp = format_display_price(new_price, product.currency)

                # 4. Kiểm tra điều kiện thông báo GIÁ TỐT (good_price)
                has_enough_history = await price_monitor_service._has_enough_history(db, product.id)
                if has_enough_history and price_monitor_service.is_good_price(new_price, Decimal(str(product.price_low))):
                    good_trackers = await tracked_product_crud.list_pending_good_price_trackers(
                        db, product.id, for_update=True
                    )
                    for tr in good_trackers:
                        notif = await notification_crud.create(
                            db,
                            user_id=tr.user_id,
                            product_id=product.id,
                            kind="good_price",
                            title="Sản phẩm đang có giá tốt",
                            message=(
                                f"{product.name} hiện có giá {current_disp}, "
                                f"thấp hơn hoặc bằng ngưỡng giá tốt."
                            ),
                        )
                        await tracked_product_crud.mark_good_price_notified(db, tr)
                        total_notifications += 1
                        u_email = user_map.get(tr.user_id, f"User#{tr.user_id}")
                        print(f"   🔔 [Thông báo Giá Tốt] -> {u_email}: {notif.title}")

                # 5. Kiểm tra điều kiện thông báo ĐẠT GIÁ MỤC TIÊU (target_price_reached)
                target_trackers = await tracked_product_crud.list_pending_target_price_trackers(
                    db, product.id, new_price, for_update=True
                )
                for tr in target_trackers:
                    target_disp = format_display_price(tr.target_price, product.currency)
                    notif = await notification_crud.create(
                        db,
                        user_id=tr.user_id,
                        product_id=product.id,
                        kind="target_price_reached",
                        title="Giá mục tiêu đã đạt",
                        message=(
                            f"Sản phẩm {product.name} hiện có giá {current_disp}, "
                            f"đã chạm mức giá mục tiêu {target_disp} của bạn. Xem tại: {product.url}"
                        ),
                    )
                    await tracked_product_crud.mark_target_price_notified(db, tr)
                    await enqueue_price_email(
                        db,
                        user_id=tr.user_id,
                        kind="target_price_reached",
                        product_name=product.name,
                        current_price=product.current_price,
                        currency=product.currency,
                        product_url=product.url,
                        target_price=tr.target_price,
                    )
                    total_notifications += 1
                    u_email = user_map.get(tr.user_id, f"User#{tr.user_id}")
                    print(f"   🎯 [Đạt Giá Mục Tiêu] -> {u_email}: {notif.title}")

                # 6. Kiểm tra điều kiện thông báo GIÁ TĂNG VƯỢT MỤC TIÊU (price_above_target)
                above_trackers = await tracked_product_crud.list_above_target_price_trackers(
                    db, product.id, new_price, for_update=True
                )
                for tr in above_trackers:
                    target_disp = format_display_price(tr.target_price, product.currency)
                    notif = await notification_crud.create(
                        db,
                        user_id=tr.user_id,
                        product_id=product.id,
                        kind="price_above_target",
                        title="Giá đã tăng trên mục tiêu",
                        message=(
                            f"Sản phẩm {product.name} hiện có giá {current_disp}, "
                            f"đã vượt trên mức giá mục tiêu {target_disp} của bạn."
                        ),
                    )
                    await tracked_product_crud.reset_target_price_notified(db, tr)
                    await enqueue_price_email(
                        db,
                        user_id=tr.user_id,
                        kind="price_above_target",
                        product_name=product.name,
                        current_price=product.current_price,
                        currency=product.currency,
                        product_url=product.url,
                        target_price=tr.target_price,
                    )
                    total_notifications += 1
                    u_email = user_map.get(tr.user_id, f"User#{tr.user_id}")
                    print(f"   📈 [Giá Tăng Trên Mục Tiêu] -> {u_email}: {notif.title}")

                # 7. Bắn sự kiện thời gian thực Server-Sent Events (SSE) qua Redis Pub/Sub
                try:
                    sse_published = await price_stream_service.publish_price_update(
                        product_id=product.id,
                        price=new_price,
                        currency=product.currency,
                        timestamp=now,
                        price_low=Decimal(str(product.price_low)),
                        price_high=Decimal(str(product.price_high)),
                    )
                    if sse_published:
                        print("   ⚡ [Redis SSE] Đã publish event cập nhật giá thời gian thực.")
                except Exception as sse_err:
                    print(f"   ⚠️ [Redis SSE] Không thể publish (Redis offline?): {sse_err}")

                print()

            await db.commit()
            print("=" * 70)
            print(f"✅ Hoàn tất giả lập cập nhật giá! Tổng cộng đã tạo {total_notifications} thông báo mới.")
            print("👉 Bạn hãy mở trình duyệt (Frontend) đã đăng nhập để thấy Toast thông báo bật lên!")
            print("=" * 70)
        except Exception as e:
            await db.rollback()
            print(f"Lỗi khi giả lập cập nhật giá: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(simulate_price_updates())
