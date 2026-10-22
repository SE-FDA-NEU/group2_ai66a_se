# Trakora - Automated E-commerce Price Tracker

An automated system that tracks and visualizes e-commerce price history over time, sending alerts whenever a product drops below a user-defined price threshold.

**Team:** 2 · **Members:** @huydang2006 @Dai-Nguyen1506 @CaMapCon26 @maimanhbel @happyhusky3303  
**Product Owner (fixed for the entire semester):** @Dai-Nguyen1506  
**Scrum Master (rotates each sprint):** @huydang2006 (Sprint 4)  
**Board:** https://github.com/orgs/SE-FDA-NEU/projects/19/views/1  
**Setup Guide:** [docs/SETUP.md](docs/SETUP.md)  
**UI & Usability Specification:** [docs/ui.md](docs/ui.md)  

---

## Product Owner (PO) Stories & Starting Points

| Story ID | Story Description | Starting Point / Screen | Route | Status |
| :---: | :--- | :--- | :--- | :---: |
| **US01** | Dán link sản phẩm và xem giá tức thì | Trang chính (Watchlist), bấm `+ Thêm sản phẩm` | `/watchlist` | **works** |
| **US02** | Đặt giá mục tiêu và nhận thông báo cảnh báo | Trang chi tiết sản phẩm, bấm icon bánh răng Cài đặt | `/detail/:id` | **works** |
| **US03** | Xem biểu đồ lịch sử giá đầy đủ và phát hiện Gap | Trang chi tiết sản phẩm, chọn mốc thời gian / `Tất cả` | `/detail/:id` | **works** |
| **US04** | Đăng ký & Đăng nhập (Google OAuth, Email/OTP, Quên MK) | Trang chủ hoặc Đăng nhập/Đăng ký | `/`, `/login`, `/register` | **works** |
| **US05** | Xem danh sách sản phẩm theo dõi tóm tắt kèm nhãn giá | Trang chính sau khi đăng nhập | `/watchlist` | **works** |
| **US06** | Cảnh báo giảm giá ảo (Fake discount warning) | Thẻ sản phẩm trên Watchlist hoặc Chi tiết | `/watchlist`, `/detail/:id` | **works** |
| **US07** | Nhãn đánh giá giá & Mua khi giá tốt | Thẻ sản phẩm trên Watchlist hoặc Chi tiết | `/watchlist`, `/detail/:id` | **works** |
| **US08** | Sắp xếp danh sách sản phẩm theo giá hiện tại | Dropdown sắp xếp trên trang Watchlist | `/watchlist` | **works** |
| **US09** | Xem thông tin shop, thương hiệu, đánh giá & nhận xét | Trang chi tiết sản phẩm | `/detail/:id` | **partly works** |
| **US10** | Cấu hình kênh thông báo & Khung giờ yên tĩnh | Modal Cài đặt trên trang chi tiết sản phẩm | `/detail/:id` | **partly works** |
| **US11** | Cảnh báo trước đợt sale lớn (48 giờ) | Cài đặt thông báo | `/notifications` | **not started** |
| **US12** | Quản lý lịch sự kiện sale dành cho Admin | Quản trị sự kiện sale | `/admin/sales` | **not started** |

> **Ghi chú đăng nhập & kiểm thử:** Để đăng nhập và kiểm thử toàn bộ hệ thống qua giao diện, vui lòng xem tài khoản kiểm thử được cung cấp trong [docs/SETUP.md](docs/SETUP.md#test-accounts-tài-khoản-kiểm-thử).

---

## Getting Started

```bash
git clone https://github.com/SE-FDA-NEU/group2_ai66a_se.git
cd group2_ai66a_se
cp .env.example .env
# Điền các biến môi trường vào .env (xem chi tiết tại docs/SETUP.md)
docker compose up -d --build
```

Ứng dụng sẽ khả dụng tại:
- **Frontend (Giao diện người dùng):** http://localhost:3000
- **Backend (Tài liệu API Swagger):** http://localhost:8000/docs