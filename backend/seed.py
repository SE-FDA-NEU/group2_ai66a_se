"""CLI điều phối hệ thống Seed dữ liệu cho Trakora.

Chạy từ thư mục gốc repository:
    python backend/seed.py
    python backend/seed.py --products
    python backend/seed.py --history
    python backend/seed.py --simulate

Hoặc chạy trong backend container:
    docker compose exec backend python seed.py
    docker compose exec backend python seed.py --products
    docker compose exec backend python seed.py --history
    docker compose exec backend python seed.py --simulate
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Đảm bảo import được app và seed
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from seed.seed_products import seed_demo_products
from seed.seed_history import seed_price_history
from seed.seed_simulate_update import simulate_price_updates
from seed.seed_single_product import seed_single_demo_product


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Trakora Seed Tools - Khởi tạo dữ liệu mẫu và giả lập thông báo giá",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--products",
        action="store_true",
        help="Chỉ tạo 10 sản phẩm demo và gán theo dõi cho các email hiện có trong CSDL (Bước 1)",
    )
    parser.add_argument(
        "--history",
        action="store_true",
        help="Chỉ tạo lịch sử giá biến động 30 ngày cho toàn bộ sản phẩm (Bước 2)",
    )
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="Chỉ giả lập cập nhật giá ngẫu nhiên để kích hoạt thông báo (Bước 3)",
    )
    parser.add_argument(
        "--init",
        action="store_true",
        help="Chỉ chạy Bước 1 và Bước 2 (Khởi tạo sản phẩm và lịch sử giá ban đầu)",
    )
    parser.add_argument(
        "--single",
        action="store_true",
        help="Khởi tạo 1 sản phẩm demo riêng lẻ kèm 30 ngày lịch sử giá (cho phép dán link trên web hoặc gán thẳng)",
    )
    parser.add_argument(
        "--no-track",
        action="store_true",
        help="Khi dùng kèm --single: Không gán trước vào Watchlist để người dùng tự dán link URL trên giao diện",
    )
    parser.add_argument(
        "--email",
        type=str,
        default=None,
        help="Khi dùng kèm --single: Chỉ định email tài khoản nhận sản phẩm theo dõi",
    )

    args = parser.parse_args()

    print("=" * 70)
    print("           TRAKORA DATABASE SEED & SIMULATION TOOL")
    print("=" * 70)

    # Chế độ khởi tạo riêng 1 sản phẩm độc lập
    if args.single:
        await seed_single_demo_product(user_email=args.email, auto_track=not args.no_track)
        return

    # Nếu không truyền cờ nào, mặc định chạy toàn bộ chu trình 1 -> 2 -> 3
    run_all = not (args.products or args.history or args.simulate or args.init)

    if args.products or run_all or args.init:
        await seed_demo_products()

    if args.history or run_all or args.init:
        await seed_price_history()

    if args.simulate or run_all:
        await simulate_price_updates()

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ TÁC VỤ SEED ĐÃ HOÀN TẤT THÀNH CÔNG!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
