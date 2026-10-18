# Milestone 3 - User Interface & Usability Specification

```
Team:           Team 02 - Automated E-commerce Price Tracker (Trakora)
Topic:          A3
Members:        Nguyen Trong Dai (11247268) - @Dai-Nguyen1506
                Mai Huy Dang (11247269) - @huydang2006
                Pham Huu Gia An (11247254) - @CaMapCon26
                Mai Tuan Manh (11247318) - @mfortunaa
                Le Ba Phong (11247339) - @happyhusky3303
Product Owner:  @Dai-Nguyen1506
Scrum Master:   @mfortunaa (Sprint 3)

Repository:     https://github.com/SE-FDA-NEU/group2_ai66a_se.git
Project board:  https://github.com/orgs/SE-FDA-NEU/projects/19/views/1
Setup Guide:    docs/SETUP.md
```

---

## Proof: Project Board (Sprint 3)

### 1. Board lúc bắt đầu Sprint 3 (Planning)
![Sprint 3 Board Start](./images/sprint-03/start.png)

### 2. Board vào ngày kết thúc Sprint 3 (Completion)
![Sprint 3 Board End](./images/sprint-03/end.png)

---

## Proof: Ứng dụng chạy thực tế với dữ liệu thật (Live App Execution)

### 1. Ảnh chụp ứng dụng có dữ liệu thật từ Database (Data State)
![Live App with Real Data](./images/ui/app-live-data.png)

### 2. Ảnh chụp ứng dụng hiển thị thông báo lỗi rõ ràng khi vi phạm nghiệp vụ (Error State)
![Live App with Business Rule Error](./images/ui/app-live-error.png)

---

## 1. PO stories and status

Bảng tổng hợp tiến độ và trạng thái hoàn thiện của toàn bộ các Product Owner (PO) Stories trong hệ thống Trakora tính đến Milestone 3:

| Story | Screen(s) (Màn hình) | Route | Status | Issue |
| :--- | :--- | :--- | :---: | :---: |
| **US01:** Dán link Shopee/TikTok Shop (Amazon dev adapter) và xem giá tức thì | Watchlist, Chi tiết sản phẩm | `/watchlist`, `/detail/:id` | **works** | #42, #75, #76, #77, #78, #79, #80, #81 |
| **US02:** Thiết lập giá mục tiêu và nhận thông báo khi giá chạm mốc | Chi tiết sản phẩm (Modal Cài đặt) | `/detail/:id` | **works** | #84, #85 |
| **US03:** Xem biểu đồ lịch sử giá đầy đủ và phát hiện khoảng trống Gap | Chi tiết sản phẩm (Biểu đồ giá) | `/detail/:id` | **works** | #82, #83, #86 |
| **US04:** Đăng ký và đăng nhập đa phương thức (Google, Email/OTP, Quên MK) | Landing, Đăng nhập, Đăng ký, OTP, Quên MK, Hồ sơ | `/`, `/login`, `/register`, `/otp`, `/forgot-password`, `/profile` | **works** | #45, #62, #70, #71, #72, #73, #74 |
| **US05:** Xem danh sách sản phẩm theo dõi dạng dòng tóm tắt | Watchlist (Danh sách theo dõi) | `/watchlist` | **works** | #46, #64, #65, #66, #67, #68, #69 |
| **US06:** Cảnh báo giảm giá ảo (Fake discount warning) | Watchlist, Chi tiết sản phẩm | `/watchlist`, `/detail/:id` | **works** | #80, #84 |
| **US07:** Nhãn phân tích giá (Good price/Normal/Expensive) và Mua khi giá tốt | Watchlist, Chi tiết sản phẩm | `/watchlist`, `/detail/:id` | **works** | #80, #85 |
| **US08:** Sắp xếp danh sách sản phẩm theo giá hiện tại | Watchlist (Danh sách theo dõi) | `/watchlist` | **works** | #84, #85 |
| **US09:** Xem thông tin cửa hàng, thương hiệu, đánh giá và nhận xét | Chi tiết sản phẩm | `/detail/:id` | **partly works** | #80, #84 |
| **US10:** Tùy chọn kênh thông báo (Email, Push) và cài đặt Khung giờ yên tĩnh | Chi tiết sản phẩm (Modal Thông báo) | `/detail/:id` | **partly works** | #85 |
| **US11:** Cảnh báo trước 48h khi có sự kiện sale lớn | Cài đặt thông báo | `/notifications` | **not started** | #88 |
| **US12:** Quản lý lịch sự kiện sale dành cho Quản trị viên (Admin) | Quản lý sự kiện Sale | `/admin/sales` | **not started** | #89 |

### Sơ đồ luồng màn hình cập nhật (Screen Flow Diagram - M3)

Luồng di chuyển giữa các màn hình được cập nhật đầy đủ các luồng xác thực mới (Email OTP, Quên mật khẩu, Profile) và luồng tương tác thời gian thực trên trang Chi tiết sản phẩm:

```mermaid
flowchart TD
    Start([Khách truy cập]) --> Landing["/ (Landing Page)"]
    
    Landing -->|Đăng nhập Google| AuthGoogle{"Xác thực Google OAuth"}
    Landing -->|Đăng nhập Email| Login["/login"]
    Landing -->|Đăng ký tài khoản| Register["/register"]
    
    Login -->|Chưa có tài khoản| Register
    Login -->|Quên mật khẩu| ForgotPass["/forgot-password"]
    Login -->|Nhập email + password| AuthEmail{"Kiểm tra thông tin"}
    
    Register -->|Nhập email, nickname, pass| SendOTP1["Gửi mã OTP (6 số, 5 phút)"]
    SendOTP1 --> OTPReg["/otp (Xác thực đăng ký)"]
    OTPReg -->|Xác thực thành công| Watchlist["/watchlist (Trang chính)"]
    
    ForgotPass -->|Nhập email tài khoản| CheckAcc{"Tài khoản Google?"}
    CheckAcc -->|Đúng (Google)| ErrGoogle["Báo lỗi: Đăng nhập bằng Google"]
    CheckAcc -->|Tài khoản Email| SendOTP2["Gửi mã OTP đặt lại MK"]
    SendOTP2 --> OTPForgot["/otp (Xác thực quên MK)"]
    OTPForgot --> ResetPass["Đặt lại mật khẩu mới"]
    ResetPass --> Login
    
    AuthGoogle -->|Thành công| Watchlist
    AuthEmail -->|Thành công| Watchlist
    
    subgraph ProtectedApp ["Khu vực bảo vệ (Yêu cầu đăng nhập)"]
        Watchlist -->|Nhấn '+' (chưa đủ 10 SP)| AddModal["[Modal] Dán link sản phẩm (BR9)"]
        Watchlist -->|Nhấn '+' (đã đủ 10 SP)| ErrLimit["Báo lỗi: Đạt giới hạn 10 SP (BR8)"]
        AddModal -->|Cào dữ liệu & Lưu DB| Watchlist
        
        Watchlist -->|Sắp xếp giá, Tìm kiếm| Watchlist
        Watchlist -->|Nhấn Xóa sản phẩm| DeleteConfirm["Ân hạn lưu 7 ngày (BR15)"]
        DeleteConfirm --> Watchlist
        
        Watchlist -->|Bấm vào thẻ sản phẩm| Detail["/detail/:id (Chi tiết sản phẩm)"]
        Watchlist -->|Menu điều hướng| Profile["/profile (Hồ sơ cá nhân)"]
        
        Detail -->|Nhấn Cài đặt (Icon bánh răng)| SettingsModal["[Modal] Cài đặt sản phẩm"]
        SettingsModal -->|Cập nhật Target Price (BR1)| Detail
        SettingsModal -->|Cấu hình Kênh thông báo / Quiet hours| Detail
        Detail -->|SSE Realtime Updates| Detail
        Detail -->|Bấm Quay lại| Watchlist
        
        Profile -->|Đổi nickname (BR14) / Mật khẩu| Profile
    end
    
    ProtectedApp -.->|Đăng xuất| Landing
```

![Sơ đồ luồng màn hình chi tiết](./images/flow-diagram.png)

---

## 2. Wireframes

Dưới đây là đặc tả wireframe cho từng màn hình PO trong hệ thống Trakora, bao gồm mục đích sử dụng, các API endpoints được triệu gọi, và hình ảnh giao diện tương ứng.

---

### 2.1. Màn hình Danh sách theo dõi - Watchlist (`/watchlist`)

**Mục đích màn hình:**
  * Hiển thị danh sách toàn bộ các sản phẩm người dùng đang theo dõi dưới dạng các thẻ tóm tắt.
  * Cung cấp các chỉ số quan trọng: Ảnh sản phẩm, Tên, Giá hiện tại, Khoảng biến động giá (Thấp nhất - Cao nhất), Đánh giá sao, và Nhãn phân tích giá tự động (`Good price`, `Normal`, `Expensive`, `Fake discount`).
  * Cho phép thêm sản phẩm mới bằng nút `+ Thêm sản phẩm` (kiểm tra chặn khi đã đạt 10 sản phẩm theo BR8).
  * Hỗ trợ tìm kiếm theo tên và sắp xếp theo giá tăng dần/giảm dần (US08).
  * Cho phép ngừng theo dõi (xóa) sản phẩm với cơ chế giữ dữ liệu ân hạn 7 ngày (BR15).
  
**Các API Endpoints triệu gọi:**
  * `GET /api/v1/watchlist`: Lấy danh sách sản phẩm theo dõi kèm các thống kê giá và nhãn phân tích.
  * `POST /api/v1/watchlist`: Thêm sản phẩm mới bằng đường dẫn marketplace (BR3, BR8, BR9).
  * `DELETE /api/v1/watchlist/{product_id}`: Ngừng theo dõi sản phẩm (kích hoạt đếm ngược ân hạn 7 ngày - BR15).
  * `GET /api/v1/watchlist/notifications`: Lấy danh sách các thông báo giá mới nhất để hiển thị chuông thông báo.

#### A. Trạng thái Trống (Empty State)
Trạng thái khi người dùng mới tạo tài khoản hoặc chưa theo dõi bất kỳ sản phẩm nào.

```
+-----------------------------------------------------------------------+
|  Trakora     [Search sản phẩm...]          (Bell: 0)  [User: Trang]   |
+-----------------------------------------------------------------------+
|  Danh sách theo dõi (0/10)                       [+ Thêm sản phẩm]    |
|                                                                       |
|                     +-----------------------+                         |
|                     |       [Empty Box]     |                         |
|                     |                       |                         |
|                     |  Chưa có sản phẩm nào |                         |
|                     |   trong danh sách!    |                         |
|                     +-----------------------+                         |
|           Dán link sản phẩm Shopee/Amazon để bắt đầu theo dõi         |
|                     biến động giá và săn sale nhé!                    |
|                                                                       |
|                       [ + Thêm sản phẩm ngay ]                        |
+-----------------------------------------------------------------------+
```

![Wireframe Watchlist - Empty State](./images/ui/watchlist-empty.png)

---

#### B. Trạng thái Đang tải (Loading State)
Trạng thái khi ứng dụng đang gọi API lấy danh sách hoặc xử lý cào dữ liệu đường dẫn sản phẩm mới.

```
+-----------------------------------------------------------------------+
|  Trakora     [Search sản phẩm...]          (Bell: ...) [User: Trang]  |
+-----------------------------------------------------------------------+
|  Danh sách theo dõi                              [+ Thêm sản phẩm]    |
|  [|||||||||| Sắp xếp: Mặc định v ]                                    |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | [Shimmer Img]  [Shimmer Line Long .......................]      |  |
|  |                [Shimmer Line Med ..........]                    |  |
|  |                [Shimmer Badge]   [Shimmer Price ...........]    |  |
|  +-----------------------------------------------------------------+  |
|  | [Shimmer Img]  [Shimmer Line Long .......................]      |  |
|  |                [Shimmer Line Med ..........]                    |  |
|  |                [Shimmer Badge]   [Shimmer Price ...........]    |  |
|  +-----------------------------------------------------------------+  |
|                 Đang tải dữ liệu giá mới nhất...                      |
+-----------------------------------------------------------------------+
```

![Wireframe Watchlist - Loading State](./images/ui/watchlist-loading.png)

---

#### C. Trạng thái Báo lỗi (Error State)
Trạng thái khi hệ thống phát hiện vi phạm quy tắc nghiệp vụ (ví dụ: bấm thêm khi đã đủ 10 sản phẩm theo BR8) hoặc lỗi kết nối.

```
+-----------------------------------------------------------------------+
|  Trakora     [Search sản phẩm...]          (Bell: 2)  [User: Trang]   |
+-----------------------------------------------------------------------+
|  Danh sách theo dõi (10/10)                      [+ Thêm sản phẩm]    |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | [!] You have reached the limit of 10 tracked products           |  |
|  |     Bạn đã đạt giới hạn tối đa 10 sản phẩm theo dõi.            |  |
|  |     Vui lòng xóa bớt sản phẩm cũ trước khi thêm sản phẩm mới.   |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  [Danh sách 10 sản phẩm hiện tại vẫn hiển thị bên dưới...]            |
+-----------------------------------------------------------------------+
```

![Wireframe Watchlist - Error State](./images/ui/watchlist-error.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH TRẠNG THÁI LỖI:
> - **Tên file cần lưu:** `docs/images/ui/watchlist-error.png`
> - **Cách thực hiện:** Khi tài khoản đã có 10 sản phẩm, nhấn nút "+ Thêm sản phẩm". Banner thông báo lỗi `You have reached the limit of 10 tracked products` sẽ xuất hiện ngay trên đầu trang.

---

#### D. Trạng thái Có dữ liệu (Data State)
Trạng thái hiển thị bình thường khi có dữ liệu thật từ cơ sở dữ liệu.

```
+-----------------------------------------------------------------------+
|  Trakora     [Tìm kiếm sản phẩm...]        (Bell: 3)  [User: Trang v] |
+-----------------------------------------------------------------------+
|  Danh sách theo dõi (3/10)                       [+ Thêm sản phẩm]    |
|  Sắp xếp: [ Giá: Thấp đến Cao v ]                                     |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | [Img] Tai nghe Bluetooth Sony WH-1000XM5                [ Xóa ] |  |
|  |       Thấp nhất: 6.890.000đ  |  Cao nhất: 8.490.000đ            |  |
|  |       [ Good Price ] [ 4.8★ ]          Giá: 6.990.000đ           |  |
|  +-----------------------------------------------------------------+  |
|  | [Img] Nồi chiên không dầu Philips HD9252                [ Xóa ] |  |
|  |       Thấp nhất: 1.250.000đ  |  Cao nhất: 1.890.000đ            |  |
|  |       [ Fake Discount: 18% ] [ 4.5★ ]  Giá: 1.750.000đ           |  |
|  +-----------------------------------------------------------------+  |
|  | [Img] Chuột không dây Logitech MX Master 3S             [ Xóa ] |  |
|  |       Thấp nhất: 2.100.000đ  |  Cao nhất: 2.450.000đ            |  |
|  |       [ Normal ] [ 4.9★ ]              Giá: 2.250.000đ           |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

![Wireframe Watchlist - Data State](./images/ui/watchlist-data.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH CÓ DỮ LIỆU:
> - **Tên file cần lưu:** `docs/images/ui/watchlist-data.png`
> - **Cách thực hiện:** Chụp màn hình `/watchlist` khi đã có từ 2-3 sản phẩm với đầy đủ ảnh, giá, nhãn phân tích giá.

---

### 2.2. Màn hình Giới thiệu & Điểm bắt đầu - Landing Page (`/`)

* **Mục đích màn hình:**
  * Trang đích giới thiệu tổng quan giá trị cốt lõi của Trakora cho người dùng mới (theo dõi biến động giá thật, bóc trần giảm giá ảo, nhận cảnh báo tự động).
  * Cung cấp nút đăng nhập một chạm với Google OAuth (`GoogleAuthButton`) và các lối tắt đến form Đăng nhập / Đăng ký qua Email.
  * Tự động chuyển hướng (redirect) vào `/watchlist` nếu người dùng đã đăng nhập từ trước.
* **Các API Endpoints triệu gọi:**
  * `POST /api/v1/auth/google-login`: Xác thực Google ID Token và trả về Access Token.

```
+-----------------------------------------------------------------------+
|  Trakora                                        [Đăng ký] [Đăng nhập] |
+-----------------------------------------------------------------------+
|                                                                       |
|               THEO DÕI GIÁ SĂN SALE THÔNG MINH                        |
|        Tự động lưu lịch sử giá, phát hiện giảm giá ảo                 |
|            và nhận thông báo khi giá chạm mục tiêu!                   |
|                                                                       |
|                  [ G  Đăng nhập bằng Google ]                         |
|                                                                       |
|              --------- hoặc tiếp tục với ---------                    |
|                                                                       |
|                   [ Đăng nhập với Email ]                             |
|                                                                       |
|  [Feature 1: Biểu đồ giá] [Feature 2: Báo giảm giá ảo] [Feature 3: Push]
+-----------------------------------------------------------------------+
```

![Wireframe Landing Page](./images/ui/wireframe-landing.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH LANDING PAGE:
> - **Tên file cần lưu:** `docs/images/ui/wireframe-landing.png`
> - **Cách thực hiện:** Đăng xuất khỏi hệ thống và truy cập `http://localhost:3000/`.

---

### 2.3. Màn hình Đăng nhập & Đăng ký (`/login`, `/register`)

* **Mục đích màn hình:**
  * Cho phép người dùng đăng nhập bằng Email + Mật khẩu hoặc Google OAuth.
  * Đăng ký tài khoản mới với: Email, Nickname hiển thị, Mật khẩu và Xác nhận mật khẩu.
  * Tự động kích hoạt quy trình gửi mã OTP 6 số qua email để xác thực đăng ký (BR13).
* **Các API Endpoints triệu gọi:**
  * `POST /api/v1/auth/login`: Xác thực OAuth2 Password form.
  * `POST /api/v1/otp/send`: Gửi mã OTP xác thực email (`reason: verify-email`).
  * `POST /api/v1/otp/verify`: Xác minh mã OTP 6 chữ số.
  * `POST /api/v1/user/register`: Tạo tài khoản người dùng sau khi xác thực OTP thành công.

```
+-----------------------------------------------------------------------+
|  Trakora                                                              |
+-----------------------------------------------------------------------+
|                        +-----------------------+                      |
|                        |       Đăng nhập       |                      |
|                        |                       |                      |
|                        | Email:                |                      |
|                        | [ user@example.com  ] |                      |
|                        |                       |                      |
|                        | Mật khẩu:             |                      |
|                        | [ ****************  ] |                      |
|                        |                       |                      |
|                        |    [ Đăng nhập ]      |                      |
|                        |                       |                      |
|                        | [Quên mật khẩu?]      |                      |
|                        |                       |                      |
|                        | [ G  Đăng nhập Google]|                      |
|                        |                       |                      |
|                        | Chưa có tài khoản?    |                      |
|                        | [ Đăng ký ngay ]      |                      |
|                        +-----------------------+                      |
+-----------------------------------------------------------------------+
```

![Wireframe Login & Register](./images/ui/wireframe-login-register.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH ĐĂNG NHẬP:
> - **Tên file cần lưu:** `docs/images/ui/wireframe-login-register.png`
> - **Cách thực hiện:** Truy cập `http://localhost:3000/login` hoặc `http://localhost:3000/register`.

---

### 2.4. Màn hình Quên mật khẩu & Xác thực OTP (`/forgot-password`, `/otp`)

* **Mục đích màn hình:**
  * Cho phép người dùng đặt lại mật khẩu an toàn thông qua mã OTP 6 chữ số gửi về hòm thư điện tử.
  * Hiển thị đếm ngược 5 phút hiệu lực và số lần thử còn lại (tối đa 5 lần theo BR13).
  * Phát hiện và cảnh báo rõ ràng nếu tài khoản được đăng ký thuần bằng Google (`GOOGLE_ACCOUNT_NO_PASSWORD`).
* **Các API Endpoints triệu gọi:**
  * `POST /api/v1/otp/send`: Gửi mã OTP khôi phục (`reason: reset-password`).
  * `POST /api/v1/otp/verify`: Xác minh OTP và nhận token xác thực tạm thời.
  * `POST /api/v1/user/reset-password`: Thiết lập mật khẩu mới kèm xác thực verify_token.

```
+-----------------------------------------------------------------------+
|  Trakora                                                              |
+-----------------------------------------------------------------------+
|                        +-----------------------+                      |
|                        |     Quên mật khẩu     |                      |
|                        |                       |                      |
|                        | Nhập email của bạn:   |                      |
|                        | [ user@example.com  ] |                      |
|                        |                       |                      |
|                        |     [ Gửi mã OTP ]    |                      |
|                        |                       |                      |
|                        | Nhập mã OTP 6 chữ số: |                      |
|                        | [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ]               |
|                        | Hết hạn sau: 04:59    |                      |
|                        |                       |                      |
|                        | Mật khẩu mới:         |                      |
|                        | [ ****************  ] |                      |
|                        | [ Xác nhận đặt lại ]  |                      |
|                        +-----------------------+                      |
+-----------------------------------------------------------------------+
```

![Wireframe Forgot Password](./images/ui/wireframe-forgot-password.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH QUÊN MẬT KHẨU:
> - **Tên file cần lưu:** `docs/images/ui/wireframe-forgot-password.png`
> - **Cách thực hiện:** Truy cập `http://localhost:3000/forgot-password`.

---

### 2.5. Màn hình Chi tiết sản phẩm & Biểu đồ lịch sử giá (`/detail/:id`)

* **Mục đích màn hình:**
  * Hiển thị toàn bộ thông tin chi tiết của một sản phẩm đang theo dõi: Ảnh lớn, Tên, Thương hiệu, Cửa hàng, Đánh giá sao, Số lượng nhận xét.
  * **Biểu đồ biến động giá tương tác:**
    * Cung cấp các nút lọc khoảng thời gian: `7 ngày`, `14 ngày`, `30 ngày`, và **`Tất cả` (All time)** để xem trọn vẹn toàn bộ lịch sử (US03).
    * Hiển thị các đường tham chiếu mức giá thấp nhất (`Min Price`) và cao nhất (`Max Price`).
    * **Xử lý khoảng trống Gap (BR15):** Thể hiện bằng vùng đổ bóng mờ và đường nét đứt, tooltip hiển thị `"No data recorded during this period"`.
    * Cảnh báo sản phẩm chưa đủ dữ liệu đánh giá nếu dưới 7 ngày riêng biệt (BR5).
  * **Nút Cài đặt (Icon Bánh răng) mở Modal Pop-up (`ProductSettingsModal`):**
    * Cho phép cập nhật mức giá mục tiêu nhận thông báo (kiểm tra BR1 thời gian thực).
    * Bố trí cấu hình kênh nhận thông báo (Email, Push) và khung giờ yên tĩnh (US10).
  * **Cập nhật dữ liệu thời gian thực (Realtime):** Kết nối SSE Stream để cập nhật giá tức thì khi có biến động từ máy chủ.
  * Nút "Đến nơi bán" mở trực tiếp link sản phẩm trên sàn thương mại điện tử.
* **Các API Endpoints triệu gọi:**
  * `GET /api/v1/watchlist`: Lấy thông tin tóm tắt sản phẩm.
  * `GET /api/v1/watchlist/{product_id}/history?days=...`: Lấy dữ liệu điểm giá và phát hiện Gap (hỗ trợ `days=0`).
  * `PUT /api/v1/watchlist/{product_id}/target-price`: Cập nhật giá mục tiêu cảnh báo (kiểm tra BR1).
  * `GET /api/v1/watchlist/{product_id}/stream`: Kết nối SSE stream nhận biến động giá tức thì từ Redis Pub/Sub.

```
+-----------------------------------------------------------------------+
|  < [Quay lại]              Chi tiết sản phẩm          (Icon Bánh răng)|
+-----------------------------------------------------------------------+
|  [Ảnh lớn]  Tai nghe Sony WH-1000XM5 Wireless Noise Canceling         |
|             Thương hiệu: Sony | Cửa hàng: Sony Official Store         |
|             4.8 ★★★★☆ (1,240 đánh giá) | [ Good price ]              |
|                                                                       |
|  GIÁ HIỆN TẠI: 6.990.000đ                                             |
|  [ Huy hiệu: Alert at 6.500.000đ ]             [ Đến nơi bán (Link) ] |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | BIỂU ĐỒ LỊCH SỬ GIÁ          Khoảng thời gian: [7N][14N][30N][Tất cả]
|  |                                                                 |  |
|  |  8.5M |--- Max: 8.490.000đ                                      |  |
|  |       |        \                                                |  |
|  |  7.5M |         \........ (Vùng Gap nét đứt - BR15)             |  |
|  |       |                  \                                      |  |
|  |  6.8M |--- Min: 6.890.000đ\____ Giá hiện tại: 6.990.000đ        |  |
|  |       +------------------------------------------------         |  |
|  |        01/10     05/10         10/10                  Hôm nay   |  |
|  +-----------------------------------------------------------------+  |
|  * Đánh giá nhận xét hàng đầu từ người mua:                           |
|    - "Chất âm cực hay, chống ồn đỉnh cao." - 5 sao                    |
+-----------------------------------------------------------------------+
|  [Modal Pop-up Cài đặt - Hiện lên khi bấm icon bánh răng]:            |
|  +-----------------------------------------------------------------+  |
|  | Cài đặt theo dõi: Tai nghe Sony WH-1000XM5                  [X] |  |
|  | Mức giá mục tiêu mong muốn (VND):                               |  |
|  | [ 6.500.000                                                   ] |  |
|  | (!) Target must be lower than the current price 6,990,000đ      |  |
|  | [x] Báo cho tôi khi giá được đánh giá là "Giá tốt" (BR7)         |  |
|  |                                                                 |  |
|  | Kênh thông báo: [x] Email   [ ] Web Push                        |  |
|  | Khung giờ yên tĩnh: Từ [ 23:00 ] Đến [ 07:00 ] (BR11)           |  |
|  |                                                                 |  |
|  |                    [ Lưu thiết lập ]                            |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

![Wireframe Product Detail & Settings Modal](./images/ui/wireframe-product-detail.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH CHI TIẾT SẢN PHẨM:
> - **Tên file cần lưu:** `docs/images/ui/wireframe-product-detail.png`
> - **Cách thực hiện:** Tại `/watchlist`, bấm vào một sản phẩm để vào `http://localhost:3000/detail/:id`. Bấm nút icon bánh răng để thấy cả Modal Pop-up cài đặt giá mục tiêu.

---

### 2.6. Màn hình Hồ sơ cá nhân - Profile (`/profile`)

* **Mục đích màn hình:**
  * Hiển thị thông tin định danh của người dùng (Email, Phương thức đăng nhập Google/Email, Trạng thái tài khoản).
  * Cho phép xem và chỉnh sửa Nickname hiển thị bất cứ lúc nào (BR14).
  * Hỗ trợ đổi mật khẩu đối với tài khoản đăng ký bằng Email.
* **Các API Endpoints triệu gọi:**
  * `GET /api/v1/user/me`: Lấy thông tin tài khoản hiện tại.
  * `PUT /api/v1/user/me`: Cập nhật nickname hiển thị mới.
  * `PUT /api/v1/user/password`: Đổi mật khẩu tài khoản.

```
+-----------------------------------------------------------------------+
|  Trakora     [Search...]                   (Bell: 0)  [User: Trang v] |
+-----------------------------------------------------------------------+
|  Hồ sơ tài khoản                                                      |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Ảnh đại diện: [ Avatar Tr ]                                     |  |
|  | Email:        trang.nguyen@example.com (Đã xác thực)             |  |
|  | Đăng nhập:    Google OAuth 2.0                                  |  |
|  |                                                                 |  |
|  | Biệt danh hiển thị (Nickname - BR14):                            |  |
|  | [ Trang Cute                                                  ] |  |
|  |                                                                 |  |
|  |                   [ Lưu thay đổi Nickname ]                     |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

![Wireframe Profile](./images/ui/wireframe-profile.png)

> [!TIP] HƯỚNG DẪN CHỤP ẢNH HỒ SƠ:
> - **Tên file cần lưu:** `docs/images/ui/wireframe-profile.png`
> - **Cách thực hiện:** Truy cập `http://localhost:3000/profile`.

---

## 3. Error messages

Hệ thống Trakora tuân thủ nghiêm ngặt nguyên tắc phản hồi giao diện thân thiện với người dùng: **Tuyệt đối không hiển thị mã lỗi kỹ thuật thuần túy (như 422, 500), không in stack trace hay thông báo lập trình khó hiểu**. Mọi phản hồi đều được ánh xạ rõ ràng sang quy tắc nghiệp vụ với lời nhắc chính xác, có thể hành động được:

| Mã lỗi API (API Error Code) | Quy tắc nghiệp vụ (Business Rule) | Lời nhắc chính xác người dùng sẽ thấy trên màn hình (Exact User-Facing Message) |
| :--- | :--- | :--- |
| `INVALID_TARGET_PRICE` <br>*(HTTP 400 Bad Request)* | **BR1:** Giá mục tiêu cảnh báo phải nhỏ hơn giá hiện tại của sản phẩm. Người dùng không được đặt mức giá cao hơn hoặc bằng giá đang bán. | `"Target must be lower than the current price 239,000đ"` *(kèm số tiền giá hiện tại thực tế của sản phẩm được định dạng rõ ràng)* |
| `WATCHLIST_LIMIT_REACHED` <br>*(HTTP 400 Bad Request)* | **BR8:** Mỗi người dùng chỉ được theo dõi tối đa 10 sản phẩm cùng lúc. Chặn ngay tại nút "+" và không mở modal dán link khi đã đủ giới hạn. | `"You have reached the limit of 10 tracked products"` <br>*(kèm chú thích tiếng Việt: "Bạn đã đạt giới hạn tối đa 10 sản phẩm theo dõi (10/10). Vui lòng xóa bớt sản phẩm cũ trước khi thêm.")* |
| `OTP_LIMIT_EXCEEDED` <br>*(HTTP 400 Bad Request)* | **BR13:** Mã OTP xác thực (Đăng ký hoặc Quên mật khẩu) gồm 6 chữ số, hết hạn sau 5 phút và cho phép nhập sai tối đa 5 lần. | `"Mã OTP nhập vượt quá số lần cho phép. Vui lòng lấy mã mới."` <br>*(Đối với trường hợp nhập sai trước lần thứ 5: "Mã OTP không chính xác. Bạn còn 3 lần thử.")* |
| `GOOGLE_ACCOUNT_NO_PASSWORD` <br>*(HTTP 400 Bad Request)* | **BR14, US04:** Người dùng đăng ký hoàn toàn qua Google OAuth không có mật khẩu ứng dụng riêng nên không thể thực hiện quy trình Quên mật khẩu thông thường. | `"Tài khoản này được đăng ký bằng Google và không có mật khẩu ứng dụng để đặt lại. Vui lòng sử dụng Đăng nhập bằng Google."` |
| `INVALID_PRODUCT_LINK` <br>*(HTTP 400 Bad Request)* | **BR9:** Chỉ chấp nhận 1 đường dẫn sản phẩm hợp lệ duy nhất từ sàn thương mại điện tử được hỗ trợ, có chứa mã định danh sản phẩm (ASIN). | `"A supported product link with a product ID is required."` <br>*(hoặc: "Vui lòng nhập đường dẫn (URL) sản phẩm hợp lệ.")* |
| `PRODUCT_ALREADY_TRACKED` <br>*(HTTP 409 Conflict)* | **US01, US05:** Một sản phẩm chỉ được thêm một lần duy nhất vào danh sách theo dõi của cùng một tài khoản người dùng. | `"This product is already in your watchlist."` |

---

## 4. What changed since M2

Trong quá trình xây dựng và kiểm thử trải nghiệm người dùng thực tế trên giao diện (UI) ở Sprint 3, nhóm đã phát hiện các điểm nghẽn về trải nghiệm và hiệu năng so với thiết kế ban đầu ở Milestone 2. Dưới đây là các thay đổi quan trọng về API và kiến trúc hệ thống đã được triển khai:

### 4.1. Bổ sung cơ chế Server-Sent Events (SSE) Stream và Giải phóng sớm Kết nối Database Pool
* **Nội dung thay đổi:**
  * Bổ sung endpoint SSE mới: `GET /api/v1/watchlist/{product_id}/stream` kết nối với Redis Pub/Sub thông qua dịch vụ `price_stream_service`.
  * Tinh chỉnh kiến trúc Dependency Injection trong FastAPI: Thực hiện đóng phiên làm việc cơ sở dữ liệu chủ động (`await db.close()`) ngay trước khi bắt đầu `StreamingResponse` thay vì đợi connection cleanup mặc định của framework.
* **Lý do thay đổi khi làm UI:**
  * Ở M2, giao diện phải định kỳ gửi HTTP Polling để cập nhật biểu đồ giá và danh sách thông báo, tạo ra tải request thừa thãi và gây độ trễ cập nhật trên màn hình. SSE giúp giao diện nhận biến động giá tức thì theo thời gian thực mà không cần reload.
  * Khi kiểm thử UI mở nhiều tab chi tiết sản phẩm, hệ thống gặp lỗi treo: do FastAPI mặc định giữ session database của request cho đến khi response hoàn tất, trong khi SSE stream duy trì kết nối dài hạn (hàng chục phút), dẫn tới cạn kiệt Connection Pool của PostgreSQL (`asyncpg`). Việc giải phóng session DB sớm trước khi mở luồng stream đã giải quyết triệt để vấn đề rò rỉ kết nối này.

### 4.2. Mở rộng tham số `days=0` cho API Lịch sử giá phục vụ tùy chọn "Tất cả" (All time)
* **Nội dung thay đổi:**
  * Cập nhật endpoint `GET /api/v1/watchlist/{product_id}/history`: Cho phép tham số `days` nhận giá trị `0` (sửa validation schema từ `ge=1` thành `ge=0`). Khi `days=0`, backend bỏ qua điều kiện `since` và truy vấn toàn bộ bản ghi lịch sử giá từ ngày đầu tiên sản phẩm được theo dõi.
* **Lý do thay đổi khi làm UI:**
  * Trong Milestone 2, API chỉ hỗ trợ các mốc cố định 7, 14, hoặc 30 ngày.
  * Khi đưa vào thực tế giao diện ở US03 (tiêu chí: *"covering however long the product has been tracked"*), người dùng cần một nút lựa chọn **"Tất cả" (All time)** để quan sát toàn bộ vòng đời sản phẩm từ nhiều tháng trước, giúp họ đánh giá xu hướng giá dài hạn chính xác hơn.

### 4.3. Chuyển cơ chế kiểm tra giới hạn 10 sản phẩm (BR8) lên Client-Side (Front-load Validation)
* **Nội dung thay đổi:**
  * Thay vì chỉ kiểm tra giới hạn 10 sản phẩm ở tầng backend khi người dùng nhấn submit form thêm sản phẩm, giao diện `WatchlistPage.tsx` kiểm tra trực tiếp độ dài danh sách (`products.length >= 10`). Nếu đã đủ 10 sản phẩm, nút `+ Thêm sản phẩm` sẽ chặn không mở modal dán link và hiển thị ngay banner cảnh báo: `"You have reached the limit of 10 tracked products"`.
* **Lý do thay đổi khi làm UI:**
  * Ở Milestone 2, người dùng phải tốn công tìm link sản phẩm, mở modal, dán link rồi bấm gửi mới nhận lại thông báo lỗi 400 từ chối. Trải nghiệm này gây khó chịu và tốn thao tác vô ích. Việc chặn ngay tại giao diện giúp phản hồi tức thì và tiết kiệm request đến backend.

### 4.4. Bổ sung mã lỗi chuyên biệt `GOOGLE_ACCOUNT_NO_PASSWORD` cho luồng Quên mật khẩu
* **Nội dung thay đổi:**
  * Backend bổ sung kiểm tra trong `auth_service.py` khi nhận yêu cầu OTP cho mục đích `reset-password`: Nếu tài khoản đăng ký qua Google (`auth_provider == 'google'`) và chưa từng đặt mật khẩu băm, hệ thống trả về mã lỗi `GOOGLE_ACCOUNT_NO_PASSWORD` (HTTP 400).
  * Frontend `ForgotPasswordPage.tsx` bắt mã lỗi này và hiển thị thông báo hướng dẫn người dùng sử dụng nút "Đăng nhập bằng Google".
* **Lý do thay đổi khi làm UI:**
  * Ở M2 chưa có kịch bản xử lý khi người dùng dùng tài khoản Google nhưng quên mất và cố nhập email vào trang quên mật khẩu. Nếu gửi OTP thì người dùng đổi mật khẩu xong vẫn bối rối về cách đăng nhập, hoặc hệ thống báo lỗi không tìm thấy người dùng là sai sự thật. Mã lỗi mới giúp giao diện điều hướng người dùng quay lại đúng luồng Google Sign-In.

### 4.5. Chuẩn hóa đường dẫn Hồ sơ cá nhân sang `/profile`
* **Nội dung thay đổi:**
  * Chuyển toàn bộ các liên kết và cấu hình router từ `/settings` sang `/profile` trên `App.tsx` và `Sidebar.tsx`, đồng thời duy trì redirect tự động từ `/settings` sang `/profile` để đảm bảo tương thích ngược.
* **Lý do thay đổi khi làm UI:**
  * Đảm bảo tính nhất quán 100% giữa mã nguồn giao diện thực tế với tài liệu kiến trúc đặc tả màn hình (`docs/requirements.md`) và bảng screen flow diagram đã thống nhất từ Milestone 1.

---

## 5. Danh mục ảnh cần chuẩn bị cho tài liệu (Photo Checklist)

Để hoàn tất trọn vẹn tài liệu và xuất file PDF `Team02_M3.pdf` nộp bài, bạn chỉ cần chụp và lưu các ảnh sau vào thư mục `docs/images/ui/` và `docs/images/sprint-03/`:

| STT | Tên file | Vị trí màn hình / URL | Yêu cầu nội dung ảnh |
| :---: | :--- | :--- | :--- |
| 1 | `docs/images/sprint-03/end.png` | GitHub Project Board | Chụp màn hình Project Board ngày kết thúc Sprint 3 với các task chuyển sang Done |
| 2 | `docs/images/ui/app-live-data.png` | `http://localhost:3000/watchlist` | **Bắt buộc thấy rõ Address Bar**. Giao diện có dữ liệu thật (các thẻ sản phẩm, giá, nhãn) |
| 3 | `docs/images/ui/app-live-error.png` | `http://localhost:3000/detail/:id` | **Bắt buộc thấy rõ Address Bar**. Mở Modal Cài đặt, nhập target price $\ge$ current price để hiện lỗi vi phạm BR1 |
| 4 | `docs/images/ui/watchlist-empty.png` | `http://localhost:3000/watchlist` | Màn hình Watchlist khi chưa có sản phẩm nào (Empty state) |
| 5 | `docs/images/ui/watchlist-loading.png` | `http://localhost:3000/watchlist` | Màn hình Watchlist lúc đang tải (bật Slow 3G trong DevTools để thấy Shimmer Skeleton) |
| 6 | `docs/images/ui/watchlist-error.png` | `http://localhost:3000/watchlist` | Màn hình Watchlist khi bấm '+' lúc đã đủ 10 sản phẩm (Error state BR8) |
| 7 | `docs/images/ui/watchlist-data.png` | `http://localhost:3000/watchlist` | Màn hình Watchlist hiển thị danh sách sản phẩm bình thường |
| 8 | `docs/images/ui/wireframe-landing.png` | `http://localhost:3000/` | Giao diện trang Landing Page giới thiệu và các nút đăng nhập |
| 9 | `docs/images/ui/wireframe-login-register.png` | `http://localhost:3000/login` | Giao diện form Đăng nhập / Đăng ký tài khoản |
| 10 | `docs/images/ui/wireframe-forgot-password.png` | `http://localhost:3000/forgot-password` | Giao diện form Quên mật khẩu và nhập OTP |
| 11 | `docs/images/ui/wireframe-product-detail.png` | `http://localhost:3000/detail/:id` | Giao diện Chi tiết sản phẩm kèm biểu đồ giá và Modal cài đặt (icon bánh răng) |
| 12 | `docs/images/ui/wireframe-profile.png` | `http://localhost:3000/profile` | Giao diện trang Hồ sơ người dùng và chỉnh sửa Nickname |

