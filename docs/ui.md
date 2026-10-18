# Milestone 3 - UI Document

```
Team:           Team 02 - Automated E-commerce Price Tracker
Topic:          A3
Members:        Nguyen Trong Dai (11247268), Mai Huy Dang (11247269)
                Pham Huu Gia An (11247254), Mai Tuan Manh (11247318),
                Le Ba Phong (11247339)
Product Owner:  @Dai-nguyen1506
Scrum Master:   @maimanhbel  (Sprint 3)

Repository:     https://github.com/SE-FDA-NEU/group2_ai66a_se.git;
Project board:  https://github.com/orgs/SE-FDA-NEU/projects/19/views/1;
Setup guide:    https://github.com/SE-FDA-NEU/group2_ai66a_se/blob/main/docs/SETUP.md
Pull Request:   https://github.com/SE-FDA-NEU/group2_ai66a_se/pull/160
Merge commit:   72634a7

Submitted by:   Nguyen Trong Dai
```

## Page 2 — Proof of Project Board

![Board start for Sprint 3](./images/sprint-03/start.png)

![Board end for Sprint 3](./images/sprint-03/end.png)

---

## Page 3 — Running App Screenshots (Visible Browser Address Bar)

### P0 Screen with Real Data (`/watchlist`)
![Running App - Real Data Screen with Address Bar](./images/ui/app-live-data.png)

### Error Message Shown to User (`/detail/:productId` - Vi phạm BR1)
![Running App - Error Screen with Address Bar](./images/ui/app-live-error.png)

---

## 1. P0 stories and status

| Story | Screen(s) | Route | Status | Issue |
| ----- | --------- | ----- | ------ | ----- |
| **US01** – Paste a link and see the current price | Watchlist, Product Detail | `/watchlist`, `/detail/:productId` | works | #78, #80 |
| **US02** – Set a target price and get notified | Product Detail | `/detail/:productId` | works | #133, #155, #156, #161 |
| **US03** – See the full price history | Product Detail | `/detail/:productId` | works | #150, #154 |
| **US04** – Register and sign in with Google or Email | Landing, Login, Register, Forgot Password | `/`, `/login`, `/register`, `/forgot-password` | works | #45, #70, #73, #74, #127 |
| **US05** – See tracked products as summary rows | Watchlist | `/watchlist` | works | #84, #132, #148 |

---

### Updated screen flow diagram

Main path: `/` → `/login` (or `/register`) → `/watchlist` → `/detail` → `/notifications`. A guest who opens `/watchlist`, `/detail`, `/notifications`, `/profile` or `/admin/sales` directly is redirected to `/login`.

**How each screen is reached:**

| Screen | Reached from | Access |
| ------ | ------------ | :----: |
| `/` | Web Introduction (starting point) | G |
| `/register` | `/` (create account); `/login` ("Chưa có tài khoản?") | G |
| `/login` | `/` (sign in); `/register` (đã có tài khoản) | G |
| `/forgot-password` | `/login` ("Quên mật khẩu?") | G |
| `/watchlist` | `/login` or `/register` (signed in); `/detail` (back) | U |
| `/detail/:productId` | `/watchlist` (bấm vào 1 sản phẩm); `/notifications` (back) | U |
| `/notifications` | `/detail` (cài đặt thông báo) | U |
| `/profile` | `/watchlist` (menu tài khoản); anywhere signed in | U |
| `/admin/sales` | `/login` (admin account) | A |

**Flow diagram:**

![Flow Diagram](./images/flow-diagram.png)

**Phân quyền truy cập màn hình:**
- **G (Guest - Khách vãng lai):** Chỉ có thể truy cập `/`, `/login`, `/register`, và `/forgot-password`. Nếu truy cập trực tiếp các route khác, hệ thống tự động redirect về `/login`.
- **U (Signed-in User - Người dùng đã xác thực):** Truy cập `/watchlist`, `/detail/:productId`, `/notifications`, `/profile`. Nếu đã đăng nhập mà vào `/` sẽ tự động chuyển hướng tới `/watchlist`.
- **A (Admin - Quản trị viên):** Truy cập thêm khu vực quản trị `/admin/sales` để quản lý sự kiện sale. Người dùng thường truy cập sẽ bị trả mã lỗi 403 (Forbidden).

---

## 2. Wireframes

Tất cả các màn hình phục vụ User Story mức P0 (US01 – US05) được mô tả chi tiết dưới đây. Riêng màn hình chính `/watchlist` được thiết kế đầy đủ **4 trạng thái (Empty · Loading · Error · Data)** theo đúng tiêu chuẩn M3.

---

### 2.1 `/` — Landing Page

"The user comes here to see what Trakora is and sign in to start tracking prices."

**API Endpoints gọi:** Không có (Trang tĩnh giới thiệu; điều hướng xác thực qua `/login` và `/register`).

![Landing Page](./images/ui/landing.png)

---

### 2.2 `/register` — Register Page

"The user comes here to create a new account using Google or Email (with OTP verification)."

**API Endpoints gọi:**
- `POST /api/v1/otp/send` (gửi mã xác thực OTP 6 số qua email, lý do: `verify-email`)
- `POST /api/v1/otp/verify` (kiểm tra mã OTP, nhận `verified_token`)
- `POST /api/v1/auth/register` (hoàn tất tạo tài khoản với `verified_token`)
- `POST /api/v1/auth/google` (đăng ký/đăng nhập nhanh bằng Google ID token)

![Register Page](./images/ui/register-email.png)

![Register OTP Verification](./images/ui/register-otp.png)

---

### 2.3 `/login` — Login Page

"The user comes here to sign in to their existing account."

**API Endpoints gọi:**
- `POST /api/v1/auth/login` (gửi form credentials: `username`, `password`, nhận JWT `access_token`)
- `POST /api/v1/auth/google` (xác thực Google OAuth credential)
- `GET /api/v1/user/me` (lấy thông tin hồ sơ người dùng sau đăng nhập)

![Login Page](./images/ui/login.png)

---

### 2.4 `/forgot-password` — Forgot Password Page

"The user comes here to reset their password using email OTP verification."

**API Endpoints gọi:**
- `POST /api/v1/otp/send` (gửi OTP đặt lại mật khẩu, lý do: `reset-password`)
- `POST /api/v1/otp/verify` (xác minh OTP đặt lại mật khẩu)
- `POST /api/v1/auth/reset-password` (cập nhật mật khẩu mới)

![Forgot Password](./images/ui/forgot-password.png)

---

### 2.5 `/watchlist` — Watchlist Page (Drawn in 4 States)

"The user comes here to see all tracked products at a glance and add new ones."

**API Endpoints gọi:**
- `GET /api/v1/watchlist` (lấy danh sách sản phẩm theo dõi, nhãn giá, khoảng giá, điểm đánh giá)
- `POST /api/v1/watchlist` (thêm link sản phẩm theo dõi mới, kiểm tra giới hạn 10 sản phẩm - BR8)
- `DELETE /api/v1/watchlist/{product_id}` (ngừng theo dõi, kích hoạt ân hạn lưu trữ 7 ngày - BR15)
- `GET /api/v1/watchlist/notifications` (polling kiểm tra thông báo cảnh báo giá)

#### Bốn trạng thái giao diện (4 States Wireframe / Screenshots):

| 1. Empty State (`/watchlist` trống) | 2. Loading State (`/watchlist` đang tải) |
|:---:|:---:|
| ![Watchlist Empty](./images/ui/watchlist-empty.png) | ![Watchlist Loading](./images/ui/watchlist-loading.png) |

| 3. Data State (`/watchlist` có dữ liệu thật) | 4. Error State (Chạm giới hạn 10 sản phẩm - BR8) |
|:---:|:---:|
| ![Watchlist Data State](./images/ui/app-live-data.png) | ![Watchlist Error State (BR8)](./images/ui/error-limit-10-product.png) |

---

### 2.6 `/detail/:productId` — Product Detail & Price Dashboard

"The user comes here to see everything about one tracked product: price chart, labels, target price, shop info, reviews."

**API Endpoints gọi:**
- `GET /api/v1/watchlist` (lấy dữ liệu tóm tắt sản phẩm)
- `GET /api/v1/watchlist/{product_id}/history` (lấy toàn bộ lịch sử giá, gap thời gian)
- `PUT /api/v1/watchlist/{product_id}/target-price` (cập nhật hoặc đặt mới giá mục tiêu qua Settings modal)
- `DELETE /api/v1/watchlist/{product_id}` (ngừng theo dõi sản phẩm)
- `GET /api/v1/watchlist/{product_id}/stream` (kết nối Server-Sent Events nhận cập nhật giá theo thời gian thực)

![Product Detail & Price Dashboard](./images/ui/detail-dashboard.png)

---

## 3. Error messages

Hệ thống tuân thủ nghiêm ngặt nguyên tắc thông báo lỗi thân thiện: **nói rõ điều gì đã xảy ra**, **lý do**, và **hướng dẫn hành động tiếp theo cho người dùng**. Tuyệt đối không hiển thị mã lỗi kỹ thuật như "Error 422", "Error 500" hay stack trace trên giao diện.

| API error code | HTTP | Business rule | The exact message the user sees (Thông điệp hiển thị trên UI) |
| -------------- | :--: | ------------- | -------------------------------------------------------------- |
| `INVALID_TARGET_PRICE` | 400 | **BR1** — Giá mục tiêu phải thấp hơn giá hiện tại | *"Giá mục tiêu phải thấp hơn giá hiện tại {current_price}đ. Vui lòng nhập mức giá thấp hơn."* |
| `WATCHLIST_LIMIT_REACHED` | 400 | **BR8** — Tối đa 10 sản phẩm theo dõi | *"You have reached the limit of 10 tracked products (Bạn đã đạt giới hạn 10 sản phẩm theo dõi. Hãy xoá bớt sản phẩm cũ trước khi thêm mới)."* |
| `INVALID_PRODUCT_LINK` | 400 | **BR9** — Định dạng link sản phẩm hợp lệ | *"Link sản phẩm không hợp lệ hoặc không tìm thấy mã định danh ASIN. Vui lòng dán link Amazon hợp lệ (ví dụ: https://www.amazon.com/dp/...)."* |
| `AMAZON_ONLY` | 400 | **BR9** — Sàn hỗ trợ thử nghiệm (Sprint 2 & 3) | *"Hiện tại hệ thống chỉ hỗ trợ liên kết sản phẩm từ Amazon (Shopee và TikTok Shop đang trong giai đoạn kết nối API)."* |
| `MULTIPLE_LINKS` | 400 | **BR9** — Dán một link mỗi lần | *"Vui lòng chỉ dán một link sản phẩm duy nhất cho mỗi lần thêm."* |
| `OTP_INVALID` | 400 | **BR13** — OTP 6 số, tối đa 5 lần thử | *"Mã OTP không chính xác. Vui lòng kiểm tra lại mã trong hộp thư đến. Bạn còn {N} lần thử."* |
| `OTP_EXPIRED` | 400 | **BR13** — Hết hạn sau 5 phút | *"Mã OTP đã hết hiệu lực (quá thời hạn 5 phút). Vui lòng nhấn 'Gửi lại mã' để nhận mã OTP mới."* |
| `OTP_LIMIT_EXCEEDED` | 400 | **BR13** — Khóa sau 5 lần nhập sai | *"Bạn đã nhập sai mã OTP quá 5 lần. Mã hiện tại đã bị hủy để đảm bảo an toàn. Vui lòng yêu cầu mã mới."* |
| `EMAIL_ALREADY_EXISTS` | 400 | Quy tắc đăng ký tài khoản | *"Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng tính năng Quên mật khẩu."* |
| `INVALID_LOGIN` | 401 | Xác thực đăng nhập | *"Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin."* |
| `GOOGLE_ACCOUNT_NO_PASSWORD`| 400 | Đặt lại mật khẩu tài khoản Google | *"Tài khoản này được đăng ký trực tiếp bằng Google và không có mật khẩu ứng dụng. Vui lòng đăng nhập bằng nút Google."* |
| `PRODUCT_ALREADY_TRACKED`| 409 | Chống theo dõi trùng lặp | *"Sản phẩm này đã có sẵn trong danh sách theo dõi của bạn."* |
| `TRACKING_NOT_FOUND` | 404 | Truy cập sản phẩm theo dõi | *"Sản phẩm không nằm trong danh sách theo dõi của bạn hoặc đã bị xóa."* |
| `MARKETPLACE_UNAVAILABLE`| 503 | Dịch vụ bên ngoài (RapidAPI) | *"Dịch vụ tra cứu giá sàn thương mại điện tử chưa được cấu hình hoặc tạm ngưng. Vui lòng liên hệ quản trị viên."* |
| `MARKETPLACE_UPSTREAM_ERROR`| 502| Lỗi từ máy chủ sàn thương mại | *"Không thể lấy thông tin sản phẩm từ sàn thương mại điện tử vào lúc này. Vui lòng kiểm tra lại liên kết và thử lại sau."* |

---

### Ví dụ minh hoạ thông báo lỗi cụ thể trên giao diện

#### Trường hợp 1 — Vi phạm Business Rule BR1 (Đặt giá mục tiêu $\ge$ giá hiện tại):
- **Ngữ cảnh:** Sản phẩm tai nghe đang có giá hiện tại là `5.490.000đ`. Người dùng mở modal Cài đặt và nhập giá mục tiêu là `5.500.000đ` hoặc `5.490.000đ`.
- **Hành vi giao diện:** 
  - Ngay khi người dùng rời ô nhập hoặc bấm "Lưu", thông báo lỗi viền đỏ nổi bật xuất hiện ngay dưới ô nhập:
    `"Target must be lower than the current price (Giá mục tiêu phải thấp hơn giá hiện tại 5.490.000đ)"`.
  - Nút "Lưu giá mục tiêu" tự động bị vô hiệu hóa (`disabled`) cho đến khi giá nhập hợp lệ.

![Minh chứng thông báo lỗi vi phạm BR1 - Đặt giá mục tiêu cao hơn giá hiện tại](./images/ui/app-live-error.png)

#### Trường hợp 2 — Vi phạm Business Rule BR8 (Chạm giới hạn tối đa 10 sản phẩm theo dõi):
- **Ngữ cảnh:** Người dùng đã theo dõi đủ 10 sản phẩm trên `/watchlist`, sau đó bấm vào nút `+ Thêm sản phẩm`.
- **Hành vi giao diện:**
  - Form/Modal dán link hoàn toàn không mở ra.
  - Một banner cảnh báo màu vàng cam xuất hiện phía trên bảng danh sách:
    `"You have reached the limit of 10 tracked products (Bạn đã đạt giới hạn tối đa 10 sản phẩm theo dõi)."`.

![Minh chứng thông báo lỗi vi phạm BR8 - Đạt giới hạn 10 sản phẩm theo dõi](./images/ui/error-limit-10-product.png)

#### Trường hợp 3 — Vi phạm Business Rule BR13 (Nhập sai OTP khi đăng ký):
- **Ngữ cảnh:** Người dùng đăng ký qua email, nhận mã OTP nhưng gõ nhầm chữ số.
- **Hành vi giao diện:**
  - Dưới các ô nhập OTP hiển thị dòng cảnh báo màu đỏ thông báo rõ số lần còn lại:
    `"Mã OTP không chính xác. Bạn còn 4 lần thử."`.
  - Nếu nhập sai liên tục đến lần thứ 5:
    `"Bạn đã nhập sai mã OTP quá 5 lần. Mã hiện tại đã bị hủy để đảm bảo an toàn. Vui lòng yêu cầu mã mới."` và các ô nhập bị khóa lại.

![Minh chứng thông báo lỗi vi phạm BR13 - Nhập sai mã OTP và số lần thử còn lại](./images/ui/error-limit-otp.png)

#### Trường hợp 4 — Vi phạm Business Rule BR9 (Dán link không hợp lệ):
- **Ngữ cảnh:** Người dùng dán liên kết không phải sàn Amazon hoặc dán chuỗi văn bản không chứa URL.
- **Hành vi giao diện:**
  - Hiển thị thông báo: `"A valid Amazon product link is required (Cần dán liên kết sản phẩm Amazon hợp lệ)"`.

![Minh chứng thông báo lỗi vi phạm BR9 - Yêu cầu liên kết sản phẩm sàn Amazon hợp lệ](./images/ui/error-amazon-link-only.png)

---

## 4. What changed since M2

Quá trình xây dựng và hoàn thiện giao diện người dùng (UI) trong Sprint 3 đã dẫn đến một số tinh chỉnh và bổ sung cần thiết so với tài liệu thiết kế kiến trúc `docs/design.md` từ Milestone 2:

### Thay đổi 1: Bổ sung Modal Cài đặt trên `/detail` và đường nét đứt mốc Giá mục tiêu trên biểu đồ (US02)

| Khía cạnh | Chi tiết thay đổi |
|-----------|-------------------|
| **Thiết kế ở M2** | Trong M2, giá mục tiêu (`target_price`) chỉ được nhập một lần duy nhất lúc tạo sản phẩm qua `POST /api/v1/watchlist`. Giao diện màn hình chi tiết sản phẩm chưa có phương tiện trực quan để người dùng cập nhật lại giá mục tiêu sau khi quan sát biểu đồ biến động giá. |
| **Thiết kế sau khi làm UI** | 1. Bổ sung nút **Cài đặt** (biểu tượng bánh răng ⚙️) trên `/detail` kích hoạt pop-up modal (`ProductSettingsModal`), cho phép người dùng điều chỉnh giá mục tiêu bất kỳ lúc nào thông qua endpoint `PUT /api/v1/watchlist/{product_id}/target-price`.<br>2. Bổ sung **đường gạch ngang nét đứt màu xanh dương** hiển thị mốc Giá mục tiêu trực tiếp trên biểu đồ Recharts, song hành cùng đường nét đứt mốc Giá cao nhất và Giá thấp nhất.<br>3. Thêm chỉ số "Mục tiêu" vào lưới tóm tắt thông số (`statsGrid`) và phần chú thích (`chartLegend`). |
| **Lý do thay đổi** | Khi người dùng xem biểu đồ lịch sử biến động giá thực tế, họ thường muốn cân nhắc đặt lại target price hợp lý hơn so với mức ban đầu. Việc thể hiện đường nét đứt mốc target trên biểu đồ giúp người dùng so sánh ngay khoảng cách giữa giá hiện tại và giá kỳ vọng một cách trực quan. |
| **Tác động tới code** | Frontend cập nhật `PriceHistoryChart.tsx` (thêm prop `targetPrice`, tính toán `effectiveMin`/`effectiveMax` cho trục Y, render `ReferenceLine`), `ProductDetailPage.tsx` và `ProductSettingsModal.tsx`. |

---

### Thay đổi 2: Mở rộng tham số lịch sử giá hỗ trợ xem "Tất cả" (`days=0`) (US03)

| Khía cạnh | Chi tiết thay đổi |
|-----------|-------------------|
| **Thiết kế ở M2** | Endpoint `GET /api/v1/watchlist/{product_id}/history` ràng buộc tham số `days` với điều kiện `Query(ge=1, le=365)`. Trên UI chỉ có 3 nút cố định: 7 ngày, 14 ngày, 30 ngày. |
| **Thiết kế sau khi làm UI** | Backend nới lỏng điều kiện kiểm tra sang `ge=0`, quy định giá trị đặc biệt `days=0` biểu thị xem toàn bộ lịch sử (All time) từ ngày đầu tiên theo dõi. Giao diện biểu đồ bổ sung nút lựa chọn **"Tất cả"** bên cạnh các mốc thời gian ngắn hạn. |
| **Lý do thay đổi** | Đáp ứng đúng tiêu chí nghiệm thu của User Story US03: *"covering however long the product has been tracked"* — người dùng có quyền xem lại toàn bộ lịch sử giá của sản phẩm kể từ ngày đầu tiên được đưa vào hệ thống. |
| **Tác động tới code** | Backend cập nhật validator trong `watchlist_router.py`. Frontend thêm tùy chọn `all` vào `RANGE_OPTIONS` của `PriceHistoryChart.tsx`. |

---

### Thay đổi 3: Chặn quy trình Quên mật khẩu đối với tài khoản chỉ dùng Google OAuth (US04)

| Khía cạnh | Chi tiết thay đổi |
|-----------|-------------------|
| **Thiết kế ở M2** | Endpoint gửi OTP quên mật khẩu `POST /api/v1/otp/send` chỉ kiểm tra email có tồn tại hay không, không kiểm tra phương thức xác thực (`auth_provider`). |
| **Thiết kế sau khi làm UI** | Khi người dùng nhập email tài khoản thuần Google vào màn hình `/forgot-password`, backend kiểm tra điều kiện `auth_provider == 'google'` và trả về mã lỗi `GOOGLE_ACCOUNT_NO_PASSWORD`. Giao diện hiển thị hướng dẫn người dùng bấm vào nút "Đăng nhập bằng Google". |
| **Lý do thay đổi** | Tài khoản Google không lưu `password_hashed` trong cơ sở dữ liệu. Cho phép người dùng gửi OTP quên mật khẩu sẽ dẫn đến trạng thái lỗi không thể hoàn tất đổi mật khẩu. |
| **Tác động tới code** | Thêm mã lỗi `GOOGLE_ACCOUNT_NO_PASSWORD` vào `backend/app/schemas/user_schema.py` và xử lý giao diện tại `ForgotPasswordPage.tsx`. |

---

### Thay đổi 4: Chuẩn hóa đường dẫn Hồ sơ cá nhân từ `/settings` sang `/profile` (US04, BR14)

| Khía cạnh | Chi tiết thay đổi |
|-----------|-------------------|
| **Thiết kế ở M2** | Trong code frontend ban đầu, trang chỉnh sửa nickname và mật khẩu được gắn vào route `/settings`. |
| **Thiết kế sau khi làm UI** | Chuyển đổi chính thức sang route `/profile` để khớp 100% với bảng đặc tả màn hình trong tài liệu `docs/requirements.md`. Đồng thời giữ lại chuyển hướng tự động (`Navigate to="/profile"`) từ `/settings` để đảm bảo tính tương thích ngược. |
| **Lý do thay đổi** | Đảm bảo tính nhất quán tuyệt đối giữa tài liệu phân tích nghiệp vụ, tài liệu thiết kế và mã nguồn thực tế. |
| **Tác động tới code** | Cập nhật cấu hình route tại `App.tsx` và liên kết trong `Sidebar.tsx`. |
