"""Cấu hình chung và dữ liệu 10 sản phẩm demo phục vụ các script seed."""

import sys
from decimal import Decimal
from pathlib import Path

# Đảm bảo thư mục 'backend' nằm trong sys.path để import 'app' trơn tru
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Danh sách 10 sản phẩm công nghệ cao cấp demo với thông tin chuẩn Amazon
DEMO_PRODUCTS = (
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B09XS7JWHH",
        "url": "https://www.amazon.com/dp/B09XS7JWHH",
        "name": "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones (Black)",
        "image_url": "https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg",
        "brand": "Sony",
        "shop_name": "Sony Store US",
        "product_rating": Decimal("4.60"),
        "review_count": 14250,
        "current_price": Decimal("348.00"),
        "original_price": Decimal("399.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("298.00"),
        "price_high": Decimal("399.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Chống ồn tuyệt hảo",
                "text": "Khả năng chống ồn chủ động xuất sắc nhất từng trải nghiệm, đeo cả ngày êm ái.",
            },
            {
                "rating": 4,
                "title": "Chất âm rất chi tiết",
                "text": "Bass sâu, dải mid rõ ràng, micro đàm thoại nâng cấp vượt bậc so với XM4.",
            },
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B0BDHWDR12",
        "url": "https://www.amazon.com/dp/B0BDHWDR12",
        "name": "Apple AirPods Pro (2nd Generation) Wireless Earbuds with MagSafe Case (USB-C)",
        "image_url": "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg",
        "brand": "Apple",
        "shop_name": "Apple Authorized Store",
        "product_rating": Decimal("4.70"),
        "review_count": 28940,
        "current_price": Decimal("189.99"),
        "original_price": Decimal("249.00"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("179.00"),
        "price_high": Decimal("249.00"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Cực kỳ tiện lợi cho hệ sinh thái Apple",
                "text": "Chuyển đổi thiết bị mượt mà, chống ồn tốt hơn bản gen 1 rõ rệt.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B09HM94VDS",
        "url": "https://www.amazon.com/dp/B09HM94VDS",
        "name": "Logitech MX Master 3S Wireless Performance Mouse, Quiet Clicks, 8K DPI",
        "image_url": "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
        "brand": "Logitech",
        "shop_name": "Logitech Store",
        "product_rating": Decimal("4.70"),
        "review_count": 8670,
        "current_price": Decimal("99.99"),
        "original_price": Decimal("119.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("89.99"),
        "price_high": Decimal("119.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Chuột làm việc số 1",
                "text": "Nút bấm êm ái, con lăn cuộn vô cực siêu nhanh, pin dùng cả tháng.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B07Y7G1R8F",
        "url": "https://www.amazon.com/dp/B07Y7G1R8F",
        "name": "Keychron K2 Wireless Bluetooth/USB Mechanical Keyboard with Gateron Brown Switches",
        "image_url": "https://m.media-amazon.com/images/I/713vU1Zg8kL._AC_SL1500_.jpg",
        "brand": "Keychron",
        "shop_name": "Keychron Official",
        "product_rating": Decimal("4.50"),
        "review_count": 4210,
        "current_price": Decimal("79.99"),
        "original_price": Decimal("99.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("69.99"),
        "price_high": Decimal("99.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Bàn phím cơ hoàn hảo cho Mac và Windows",
                "text": "Switch Brown gõ đầm tay, kết nối Bluetooth 3 thiết bị rất mượt.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B09VPHVT2Z",
        "url": "https://www.amazon.com/dp/B09VPHVT2Z",
        "name": "Anker 737 Power Bank (PowerCore 24K), 24,000mAh 3-Port Portable Charger with 140W Output",
        "image_url": "https://m.media-amazon.com/images/I/61r59FzWb0L._AC_SL1500_.jpg",
        "brand": "Anker",
        "shop_name": "Anker Direct",
        "product_rating": Decimal("4.60"),
        "review_count": 6320,
        "current_price": Decimal("109.99"),
        "original_price": Decimal("149.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("94.99"),
        "price_high": Decimal("149.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Sạc được cho cả MacBook Pro 16 inch",
                "text": "Màn hình OLED hiển thị công suất từng cổng cực kỳ trực quan và tiện dụng.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B08KTZ8249",
        "url": "https://www.amazon.com/dp/B08KTZ8249",
        "name": "Kindle Paperwhite (16 GB) – 6.8 inch display, adjustable warm light, waterproof",
        "image_url": "https://m.media-amazon.com/images/I/61jC+kH1QZL._AC_SL1000_.jpg",
        "brand": "Amazon",
        "shop_name": "Amazon",
        "product_rating": Decimal("4.70"),
        "review_count": 31500,
        "current_price": Decimal("139.99"),
        "original_price": Decimal("149.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("119.99"),
        "price_high": Decimal("149.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Màn hình ấm đọc sách ban đêm rất dễ chịu",
                "text": "Pin trâu hàng tuần, cổng sạc USB-C và chống nước đi bơi thoải mái.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B0874XN4D8",
        "url": "https://www.amazon.com/dp/B0874XN4D8",
        "name": "Samsung T7 Portable SSD 1TB - Up to 1050MB/s - USB 3.2 External Solid State Drive (Titan Gray)",
        "image_url": "https://m.media-amazon.com/images/I/91tUOH896sL._AC_SL1500_.jpg",
        "brand": "Samsung",
        "shop_name": "Samsung Store",
        "product_rating": Decimal("4.80"),
        "review_count": 28400,
        "current_price": Decimal("229.78"),
        "original_price": Decimal("249.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("199.99"),
        "price_high": Decimal("249.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Tốc độ đọc ghi cực nhanh",
                "text": "Sao chép video 4K vèo vèo, vỏ nhôm tản nhiệt tốt và rất nhỏ gọn.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B085TFF7M1",
        "url": "https://www.amazon.com/dp/B085TFF7M1",
        "name": "Logitech C920x HD Pro Webcam, Full HD 1080p/30fps Video Calling, Clear Stereo Audio",
        "image_url": "https://m.media-amazon.com/images/I/71iNwni9TsL._AC_SL1500_.jpg",
        "brand": "Logitech",
        "shop_name": "Logitech Store",
        "product_rating": Decimal("4.60"),
        "review_count": 14900,
        "current_price": Decimal("67.90"),
        "original_price": Decimal("79.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("59.99"),
        "price_high": Decimal("79.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Webcam hội họp học online số 1",
                "text": "Hình ảnh sáng rõ ngay cả trong phòng thiếu sáng, micro kép khử ồn tốt.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B0DGGNPHP8",
        "url": "https://www.amazon.com/dp/B0DGGNPHP8",
        "name": "KDD Headphone & Controller Stand with Wireless Charging - 9 Light Modes Desktop Accessories",
        "image_url": "https://m.media-amazon.com/images/I/61r59FzWb0L._AC_SL1500_.jpg",
        "brand": "KDD",
        "shop_name": "KDD Direct",
        "product_rating": Decimal("4.60"),
        "review_count": 1820,
        "current_price": Decimal("29.95"),
        "original_price": Decimal("39.99"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("24.99"),
        "price_high": Decimal("39.99"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Góc setup gaming cực kỳ thẩm mỹ",
                "text": "Đèn RGB đẹp mắt, sạc không dây cho điện thoại tiện lợi trên bàn.",
            }
        ],
    },
    {
        "marketplace": "amazon",
        "external_id": "DEMO-B0CHX6X33L",
        "url": "https://www.amazon.com/dp/B0CHX6X33L",
        "name": "Apple Watch SE (2nd Gen) [GPS 40mm] Smartwatch with Midnight Aluminum Case",
        "image_url": "https://m.media-amazon.com/images/I/71XMTLtZd5L._AC_SL1500_.jpg",
        "brand": "Apple",
        "shop_name": "Apple Authorized Store",
        "product_rating": Decimal("4.60"),
        "review_count": 19450,
        "current_price": Decimal("189.00"),
        "original_price": Decimal("249.00"),
        "currency": "USD",
        "in_stock": True,
        "price_low": Decimal("179.00"),
        "price_high": Decimal("249.00"),
        "top_reviews": [
            {
                "rating": 5,
                "title": "Đồng hồ thông minh đáng mua nhất trong tầm giá",
                "text": "Đo nhịp tim, theo dõi giấc ngủ và tập luyện thể thao chuẩn xác, nhận thông báo tiện lợi.",
            },
            {
                "rating": 4,
                "title": "Thời lượng pin đáp ứng tốt cả ngày",
                "text": "Thiết kế nhỏ gọn vừa cổ tay, dây đeo thể thao êm ái khi đeo cả ngày dài.",
            },
        ],
    },
)


def format_display_price(price: Decimal | float | str, currency: str = "USD") -> str:
    """Format giá kèm quy đổi VNĐ chuẩn UI."""
    dec_price = Decimal(str(price))
    if str(currency).upper() == "USD":
        vnd_price = round(dec_price * Decimal("26000"))
        return f"{vnd_price:,.0f} ₫ ({dec_price:.2f} USD)".replace(",", ".")
    return f"{dec_price:,.0f} {currency}".replace(",", ".")

