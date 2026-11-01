# Hướng Dẫn Cài Đặt và Khởi Chạy Hệ Thống (Setup Guide)

Tài liệu này hướng dẫn chi tiết từng bước thiết lập và khởi chạy hệ thống Trakora trên một máy tính mới hoàn toàn (clean machine). Thời gian thực hiện ước tính: **5–10 phút**.

## Chạy kiểm thử tự động trên bản clone mới (không cần server)

Phần này độc lập với hướng dẫn chạy ứng dụng bằng Docker bên dưới. Cần **Python 3.12+**, **Node.js 20+** và npm. Không cần `.env`, Docker, PostgreSQL, Redis, SMTP hay khóa Google/RapidAPI thật để chạy kiểm thử.

Từ thư mục gốc repository, tạo môi trường Python riêng và cài thư viện:

```powershell
python -m venv .venv
# Windows PowerShell (không cần đổi ExecutionPolicy):
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm ci --prefix frontend
.\.venv\Scripts\python.exe -m pytest
```

Trên Linux/macOS, dùng `.venv/bin/python` thay cho `.\.venv\Scripts\python.exe`. Nếu môi trường Python đã được kích hoạt và cài đủ thư viện, lệnh chung là:

```bash
pytest
```

Lệnh này chạy backend và các ca giao diện của issue #185. Pytest gọi Vitest thật bằng subprocess; không mô phỏng lại React bằng Python. Bộ test cố định cấu hình giả trong `conftest.py`, dùng mock hoặc SQLite trong bộ nhớ, và chặn HTTP/Redis/PostgreSQL/SMTP thật cho issue #185. Không cần tạo hay chỉnh tay file `.env`.

```bash
# Chỉ issue #185, gồm các ca React có mã truy vết:
pytest -m issue185 -q
# Toàn bộ test frontend và kiểm tra bản build:
npm test --prefix frontend
npm run build --prefix frontend
# Tự kiểm tra bản sao sạch + lỗi cố tình đưa vào bản sao:
python scripts/verify_issue185_clean.py
```

Lệnh cuối sao chép file đang làm (kể cả chưa commit) sang thư mục tạm, không sao chép `.env`/`.git`/`node_modules`, chạy `npm ci`, `pytest`, build và kiểm tra mutation 6 giây. Môi trường Python dùng thư viện đã cài từ requirements, không phải một máy tính hay Python venv mới hoàn toàn. Log và ảnh minh chứng xem [docs/testing.md](testing.md).

---

## Yêu cầu Môi trường Tiên quyết (Prerequisites)

| Công cụ | Phiên bản Tối thiểu | Lệnh kiểm tra |
|---------|---------------------|---------------|
| [Git](https://git-scm.com/) | 2.30+ | `git --version` |
| [Docker](https://docs.docker.com/get-docker/) | 24.0+ | `docker --version` |
| [Docker Compose](https://docs.docker.com/compose/) | 2.20+ (V2, tích hợp sẵn trong Docker Desktop) | `docker compose version` |

> [!NOTE]
> Trên hệ điều hành Windows và macOS, vui lòng cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (đã bao gồm sẵn Docker Compose V2). Trên Linux, cài đặt Docker Engine và plugin Docker Compose.

---

## Bước 1 — Tải mã nguồn (Clone repository)

Mở terminal hoặc PowerShell và thực hiện clone dự án từ GitHub:

```bash
git clone https://github.com/SE-FDA-NEU/group2_ai66a_se.git
cd group2_ai66a_se
```

---

## Bước 2 — Thiết lập file cấu hình môi trường (.env)

Sao chép file cấu hình mẫu `.env.example` thành `.env`:

```bash
# Trên Linux/macOS:
cp .env.example .env

# Trên Windows PowerShell:
Copy-Item .env.example .env
```

Mở file `.env` bằng trình soạn thảo và điền đầy đủ các giá trị cấu hình thực tế:
- Tham khảo bảng giá trị cấu hình bảo mật được chia sẻ tại tài liệu dự án:
  https://docs.google.com/document/d/1wRsOefCmNf4UwL5TNZUKQH-6ogjleDFa_VwJF7GUqys/edit?tab=t.0
- Truy cập liên kết trên để lấy giá trị chi tiết của các biến môi trường (`SECRET_KEY`, `ADMIN_PASSWORD`, `RAPIDAPI_KEY`, `GOOGLE_CLIENT_ID`, v.v.).

---

## Bước 3 — Build và khởi chạy toàn bộ dịch vụ

Khởi chạy đồng thời toàn bộ hệ thống bằng Docker Compose:

```bash
docker compose up -d --build
```

Lệnh này sẽ tiến hành build Docker images cho cả Backend và Frontend, sau đó khởi động 4 dịch vụ độc lập trong các container:
- **db-postgre** (PostgreSQL 15): Cổng `5432` — Lưu trữ cơ sở dữ liệu quan hệ.
- **redis** (Redis 7): Cổng `6379` — Quản lý phiên OTP, hàng đợi thông báo giá và rate limiting.
- **backend** (FastAPI + Uvicorn): Cổng `8000` — Xử lý nghiệp vụ API, tích hợp RapidAPI và WebSocket/SSE.
- **frontend** (React + Vite): Cổng `3000` — Giao diện Single Page Application (SPA).

> [!IMPORTANT]
> Vui lòng chờ khoảng **30–60 giây** để toàn bộ container hoàn tất quá trình khởi tạo dữ liệu và đạt trạng thái sẵn sàng (healthy).

---

## Bước 4 — Kiểm tra và xác thực cài đặt

Kiểm tra trạng thái hoạt động của các container:

```bash
docker compose ps
```

*Kết quả mong đợi:* Cả 4 dịch vụ đều hiển thị trạng thái `Up` (và `healthy` đối với database/redis).

Tiến hành kiểm tra nhanh kết nối các thành phần:

```bash
# 1. Kiểm tra Backend API:
curl http://localhost:8000/
# Kết quả mong đợi: {"success": "Welcome to Automated E-commerce Price Tracker API!"}

# 2. Kiểm tra Frontend:
# Mở trình duyệt web và truy cập địa chỉ: http://localhost:3000/
# Kết quả mong đợi: Hiển thị trang chủ Trakora (Landing Page) mượt mà, đầy đủ các nút Đăng nhập và Đăng ký.
```

---

## Cấu hình Cơ sở Dữ liệu (Database Setup)

Cơ sở dữ liệu của Trakora được **cấu hình và khởi tạo hoàn toàn tự động** — bạn không cần thực hiện bất kỳ thao tác thủ công nào:

1. **Tự động áp dụng Migration (Schema creation):** File kịch bản `entrypoint.sh` của backend sẽ tự động chạy lệnh `alembic upgrade head` mỗi khi container khởi động, áp dụng toàn bộ các bản migration để tạo các bảng `users`, `products`, `price_history`, và `tracked_products`.
2. **Tự động tạo tài khoản Quản trị viên (Admin seeding):** Trong quá trình khởi động, sự kiện `lifespan` của FastAPI sẽ gọi hàm `create_admin_user()`, tự động tạo mới (hoặc đồng bộ) tài khoản developer/admin theo `ADMIN_EMAIL` và `ADMIN_PASSWORD` từ file `.env`.
3. **Nạp dữ liệu mẫu hoàn chỉnh (Demo Data Seeding):** Chạy lệnh `docker compose exec backend python seed.py --init` để nạp ngay 10 sản phẩm demo công nghệ cao cấp kèm 31 ngày lịch sử biến động giá chân thực (lưu ý: nên tạo tài khoản trước khi chạy bước này).

Sau khi khởi chạy, cơ sở dữ liệu sẽ bao gồm:
- 4 bảng dữ liệu cốt lõi với đầy đủ chỉ mục (index), khóa ngoại (foreign key) và ràng buộc toàn vẹn.
- 1 tài khoản quản trị viên hệ thống (`is_developer = true`).

---

## Khởi Tạo Dữ Liệu Mẫu (Demo Seed Data)

Hệ thống cung cấp sẵn bộ công cụ seed dữ liệu demo trực quan giúp người chấm hoặc người kiểm thử có ngay **10 sản phẩm công nghệ cao cấp**, **31 ngày lịch sử biến động giá chân thực** (đầy đủ các nhãn *Giá tốt*, *Bình thường*, *Giảm ảo* trên Watchlist và biểu đồ Dashboard), đồng thời tự động gán sản phẩm vào tài khoản đang đăng nhập.

> [!IMPORTANT]
> **Khuyến nghị quan trọng — Hãy tạo tài khoản người dùng trước khi chạy Mock Data:**
> Bạn **nên tạo tài khoản người dùng trước** (đăng ký qua Email/OTP tại `http://localhost:3000/register` hoặc đăng nhập nhanh bằng Google OAuth) **rồi mới thực hiện chạy lệnh seed dữ liệu mẫu**.
> - **Lý do:** Kịch bản seed dữ liệu sẽ tự động dò tìm toàn bộ các tài khoản người dùng đang có sẵn trong cơ sở dữ liệu để gán 10 sản phẩm theo dõi vào Watchlist. Nếu bạn chạy seed trước rồi mới tạo tài khoản, tài khoản tạo sau này sẽ có danh sách theo dõi trống (0 sản phẩm).
> - **Mẹo khắc phục nếu đã lỡ tạo tài khoản sau:** Bạn không cần xóa cơ sở dữ liệu, chỉ cần chạy lại lệnh `docker compose exec backend python seed.py --init` một lần nữa, hệ thống sẽ tự động đồng bộ ngay 10 sản phẩm và 31 ngày lịch sử giá vào tài khoản mới của bạn!

### Cách 1 — Chạy trong môi trường Docker (Khuyến nghị cho giảng viên / người chấm)

Sau khi khởi chạy container (`docker compose up -d`), thực hiện lệnh:

```bash
# Khởi tạo 10 sản phẩm demo và 31 ngày lịch sử biến động giá liên tục:
docker compose exec backend python seed.py --init

# Hoặc chạy toàn bộ chu trình kèm mô phỏng biến động giá và thông báo đa kênh:
docker compose exec backend python seed.py
```

### Cách 2 — Chạy trực tiếp từ máy host (Local Python)

```bash
# Chạy từ thư mục gốc của repository:
python backend/seed.py --init
```

### Các tùy chọn nâng cao của công cụ Seed:

| Lệnh / Cờ | Mô tả hành động |
|-----------|-----------------|
| `python backend/seed.py --init` | **(Khuyến nghị)** Khởi tạo 10 sản phẩm demo Amazon và 31 ngày dữ liệu giá liên tục (đầy đủ 3 đường mốc nét đứt trên biểu đồ). |
| `python backend/seed.py --products` | Chỉ tạo / cập nhật 10 sản phẩm và gán vào Watchlist của người dùng hiện có trong CSDL. |
| `python backend/seed.py --history` | Chỉ tạo lại lịch sử biến động giá 30 ngày cho toàn bộ sản phẩm. |
| `python backend/seed.py --simulate` | Giả lập biến động giá ngẫu nhiên để kích hoạt chuông cảnh báo giá mục tiêu (Target price reached) và cảnh báo giá tốt (Good price). |
| `python backend/seed.py --single` | **Khởi tạo riêng 1 sản phẩm demo độc lập** (*PlayStation DualSense Wireless Controller - Midnight Black*, ASIN `DEMO-B094WL86N5`) kèm 31 ngày lịch sử giá (~4.225 điểm) và gán thẳng vào Watchlist. |
| `python backend/seed.py --single --no-track` | Khởi tạo 1 sản phẩm riêng lẻ nhưng **chưa gán vào Watchlist**, phục vụ việc copy link `https://www.amazon.com/dp/B094WL86N5` dán trực tiếp vào giao diện web để trải nghiệm luồng thêm sản phẩm từ đầu. |
| `python backend/seed.py --single --email user@example.com` | Khởi tạo 1 sản phẩm riêng lẻ và gán thẳng vào tài khoản email cụ thể. |

> [!NOTE]
> Bạn cũng có thể chạy trực tiếp script độc lập:
> ```bash
> python backend/seed/seed_single_product.py
> # hoặc không gán theo dõi để tự dán link URL trên giao diện:
> python backend/seed/seed_single_product.py --no-track
> ```

> [!TIP]
> **Thử nghiệm vi phạm Business Rule BR8 (Giới hạn tối đa 10 sản phẩm):**
> Sau khi chạy lệnh seed trên (`--init`), tài khoản của bạn sẽ có đủ **10 / 10 sản phẩm** trong Watchlist. Khi nhấn nút `+ Thêm sản phẩm`, hệ thống sẽ lập tức chặn lại và hiển thị cảnh báo: `"You have reached the limit of 10 tracked products"`, sẵn sàng chụp ảnh màn hình minh chứng vi phạm Business Rule.

---

## Tài Khoản Kiểm Thử (Test Accounts)

Để người chấm hoặc kiểm thử viên có thể trải nghiệm toàn diện hệ thống trên giao diện mà không cần cấu hình phức tạp:

1. **Tài khoản Quản trị / Người dùng kiểm thử có sẵn (Seeded Account):**
   - **Email:** Theo giá trị cấu hình `ADMIN_EMAIL` trong file `.env` (mặc định: `trakora.app@gmail.com`).
   - **Mật khẩu:** Theo giá trị cấu hình `ADMIN_PASSWORD` trong file `.env` (mặc định: `zxfprznrtsuehsao`).
   - *Tài khoản này được backend tự động khởi tạo khi container khởi chạy (xem [`backend/admin.py`](file:///c:/Users/YOGA/Desktop/Class/02_Software_Engineering/project/trakora/backend/admin.py)).*

2. **Đăng nhập nhanh bằng Google OAuth:**
   - Tại trang chủ `http://localhost:3000/`, nhấn trực tiếp vào nút **"Đăng nhập bằng Google"** để đăng nhập tức thì nếu `GOOGLE_CLIENT_ID` đã được cấu hình trong `.env`.

3. **Tạo tài khoản kiểm thử mới qua Email:**
   - Truy cập `http://localhost:3000/register`.
   - Nhập Biệt danh (Nickname), Email và Mật khẩu tùy ý.
   - Nhận mã OTP 6 chữ số qua hòm thư điện tử (hoặc kiểm tra log Redis/Backend) để hoàn tất đăng ký và tự động chuyển hướng tới `/watchlist`.

---

## Chạy Kiểm Thử Tự Động (Running Tests)

### Kiểm thử Backend (Pytest)

Chạy trong môi trường Docker container:

```bash
# Chạy toàn bộ 79 test cases (unit + integration):
docker compose exec backend python -m pytest tests -v -s

# Chỉ chạy Unit tests:
docker compose exec backend python -m pytest tests/unit -v -s

# Chỉ chạy Integration tests:
docker compose exec backend python -m pytest tests/integration -v -s
```

Hoặc chạy trực tiếp từ máy host (nếu có môi trường ảo Python):
```bash
# Windows PowerShell:
$env:PYTHONPATH="backend"; .\.venv\Scripts\python -m pytest backend/tests/integration/test_auth_endpoint.py backend/tests/unit -v

# Linux/macOS:
PYTHONPATH=backend pytest backend/tests/integration/test_auth_endpoint.py backend/tests/unit -v
```

> **Hiện trạng kiểm thử Backend:** Toàn bộ **79 ca kiểm thử** (72 unit tests + 7 integration tests) đều vượt qua 100%, bao phủ toàn diện các luồng xác thực người dùng, giới hạn 5 lần nhập OTP kèm thông báo số lần còn lại, nghiệp vụ Watchlist CRUD, phân tích cú pháp liên kết Amazon, client kết nối RapidAPI, và thuật toán tính nhãn giá.

### Kiểm thử Frontend (Vitest)

```bash
# Chuyển vào thư mục frontend và chạy kiểm thử tự động:
cd frontend
npm test -- --run
```

> **Hiện trạng kiểm thử Frontend:** Toàn bộ **35 ca kiểm thử** giao diện React, component biểu đồ giá `PriceHistoryChart` và bảo vệ định tuyến `RouteGuard` đều đạt 100%.

---

## Dừng và Dọn Dẹp Hệ Thống (Stopping and Cleaning Up)

```bash
# Dừng toàn bộ các dịch vụ (vẫn giữ nguyên dữ liệu trong database và Redis volumes):
docker compose down

# Dừng và xóa sạch toàn bộ dữ liệu (làm mới hoàn toàn database, Redis, v.v.):
docker compose down -v
```

---

## Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### Sự cố 1: Trùng cổng mạng (Port already in use)

```text
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Nguyên nhân:** Đang có dịch vụ khác trên máy host (ví dụ: PostgreSQL cục bộ, service nền khác) chiếm dụng cổng `5432`, `8000` hoặc `3000`.

**Cách khắc phục:** Mở file `.env` và điều chỉnh các cổng host sang cổng khác:
```env
HOST_PORT_DB=15432      # Đổi cổng PostgreSQL từ 5432 thành 15432
HOST_PORT_REDIS=16379   # Đổi cổng Redis từ 6379 thành 16379
HOST_PORT_BACKEND=18000 # Đổi cổng Backend từ 8000 thành 18000
```
Sau đó khởi động lại: `docker compose down && docker compose up -d --build`

### Sự cố 2: Backend báo lỗi kết nối — "Connection refused" tới database

```text
sqlalchemy.exc.OperationalError: connection to server at "db-postgre" ... Connection refused
```

**Nguyên nhân:** Container Backend khởi động xong trước khi tiến trình PostgreSQL bên trong container `db-postgre` kịp mở cổng tiếp nhận kết nối.

**Cách khắc phục:** Hệ thống healthcheck của Docker Compose thông thường sẽ tự động xử lý. Nếu vẫn gặp lỗi:
```bash
docker compose down
docker compose up -d --build
# Chờ khoảng 30 giây, sau đó kiểm tra log:
docker compose logs backend
```

### Sự cố 3: Lỗi "Module not found" hoặc lỗi import trong backend

**Nguyên nhân:** Các thư viện phụ thuộc Python chưa được cài đặt đầy đủ khi build image.

**Cách khắc phục:** Rebuild lại image của Backend từ đầu (không dùng cache):
```bash
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

### Sự cố 4: Frontend hiển thị trang trắng hoặc lỗi "Cannot GET /"

**Nguyên nhân:** Thư mục `node_modules` bị lỗi thời hoặc container Frontend chưa hoàn tất tiến trình cài đặt gói npm.

**Cách khắc phục:**
```bash
docker compose restart frontend
# Đợi 30 giây để hoàn tất khởi động Vite, sau đó xem log:
docker compose logs frontend
```

---

## Bảng Kiểm Thử Liên Máy (Cross-machine Test)

| Người kiểm thử | Ngày thực hiện | Cấu hình máy tính kiểm thử | Thời gian hoàn thành | Kết quả |
|----------------|----------------|----------------------------|----------------------|:-------:|
| Mai Huy Đăng (@huydang2006) | 18/10/2026 | Windows 11 Home, Docker Desktop 27.2.0, Compose v2.29.7 | 6 phút | **Đạt (Pass)** — Clone, build sạch, tự động seed 10 sản phẩm, toàn bộ luồng giao diện chạy hoàn hảo |
| Phạm Hữu Gia An (@CaMapCon26) | 19/10/2026 | macOS Sonoma 14.5, Docker Desktop 26.1.4, Chip Apple M2 | 5 phút | **Đạt (Pass)** — Build sạch, áp dụng migration thành công, 79 backend tests và 35 frontend tests đạt 100% |

> **Hướng dẫn cho người kiểm thử (Tester):** Thực hiện theo đúng các Bước 1–4 trên một máy tính chưa từng cài đặt dự án này trước đó. Ghi lại mọi vấn đề phát sinh và tổng thời gian từ lúc gõ lệnh `git clone` cho đến khi trang chủ hiển thị thành công trên trình duyệt.
