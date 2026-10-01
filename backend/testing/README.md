# Chạy test backend bằng Docker

> **Chạy mọi lệnh từ thư mục gốc repo** — thư mục có `docker-compose.yml`.

Các test dưới đây kiểm tra phần triển khai issue 77 và issue 78. Không cần tạo Python `venv`.

## Chuẩn bị

- Mở Docker Desktop và đợi Docker Engine khởi động.
- Đảm bảo repo có file `.env` để Docker Compose đọc cấu hình. Không commit file này.

## Chạy toàn bộ test

Build image backend và khởi động backend cùng các service phụ thuộc:

```powershell
docker compose up -d --build backend
```

Khi backend đã chạy, thực thi test trong container:

```powershell
docker compose exec backend python -m pytest testing -q
```

Kết quả thành công hiện dạng:

```text
7 passed
```

Nếu các container đã chạy và image có pytest, chỉ cần chạy lệnh `docker compose exec`.

## Chạy test riêng theo issue

```powershell
# Issue 77: RapidAPI request, response mapping và timeout
docker compose exec backend python -m pytest testing/test_rapidapi_client.py -q

# Issue 78: thêm sản phẩm, cache/resume, giới hạn tracking và request lặp
docker compose exec backend python -m pytest testing/test_watchlist_service.py -q
```

## Test bao gồm những gì?

- `test_rapidapi_client.py`: kiểm tra gọi Product Details bằng ASIN, country và RapidAPI headers; ánh xạ trường trong `response["data"]`; xử lý timeout.
- `test_watchlist_service.py`: kiểm tra dùng cache, tạo sản phẩm mới, resume sản phẩm đã bỏ theo dõi, giới hạn 10 sản phẩm và thêm lặp idempotent.
- `conftest.py`: cung cấp cấu hình giả để test không phụ thuộc cấu hình Pydantic bắt buộc.

Đây là **unit test**. RapidAPI và thao tác CRUD/database được mock, nên test không cần key thật và không xác nhận kết nối end-to-end tới RapidAPI hay PostgreSQL.

## Nếu gặp lỗi `No module named pytest`

Build lại image backend để cài packages trong `backend/requirements.txt`, rồi chạy test lại:

```powershell
docker compose up -d --build backend
docker compose exec backend python -m pytest testing -q
```

## Gọi thử endpoint thật

Để kiểm tra toàn bộ endpoint `POST /api/v1/watchlist`, cần có database đã migrate, access token hợp lệ và RapidAPI key trong `.env`. Adapter hiện dùng Amazon Product Details; đây không phải kiểm thử cho Shopee/TikTok. Không ghi API key thật vào README, `.env.example` hoặc Git.
