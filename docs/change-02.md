# Những gì đã thay đổi (Change Log 02)

Tài liệu này tiếp nối `docs/change-01.md`, ghi nhận lại các quyết định kỹ thuật, tinh chỉnh nghiệp vụ và thay đổi chi tiết đối với toàn bộ các User Story mức P0 (US01 – US05) trong hệ thống Trakora tính đến Milestone hiện tại.

---

## 1. Dán link sản phẩm và xem giá tức thì (US01, BR3, BR8, BR9)

- **Sàn hỗ trợ Amazon (BR9):**
  - Giữ nguyên quyết định kỹ thuật từ Sprint 2: Hệ thống sử dụng adapter Amazon thông qua RapidAPI để đảm bảo dữ liệu REST API ổn định trong môi trường lớp học và kiểm thử, do các sàn thương mại điện tử nội địa (Shopee, TikTok Shop) hiện chưa cấp API mở hoặc giải pháp scrape ổn định không bị chặn bot.
  - Link nhập vào được chuẩn hóa và trích xuất mã định danh ASIN tự động.
- **Giới hạn 10 sản phẩm (BR8, US05):**
  - Trước đây: Nút thêm sản phẩm bị vô hiệu hóa (`disabled`) đơn thuần khi danh sách đạt 10 sản phẩm, người dùng bấm vào không có phản hồi hay lý do cụ thể.
  - Thay đổi mới: Bổ sung thông báo trực quan rõ ràng: `"You have reached the limit of 10 tracked products"` (kèm chú thích tiếng Việt: *"Bạn đã đạt giới hạn tối đa 10 sản phẩm theo dõi"*) ngay khi người dùng nhấn nút thêm sản phẩm nếu danh sách đã đủ 10 sản phẩm, đồng thời chặn không mở form dán link, đúng theo tiêu chí nghiệm thu của US01 và US05.
- **Cache dữ liệu khi đã có người theo dõi (BR3):**
  - Giữ nguyên cơ chế kiểm tra trong database: Nếu sản phẩm đã được ít nhất một người dùng khác theo dõi, hệ thống sử dụng ngay dữ liệu đã lưu và không gọi thêm request API bên ngoài.

---

## 2. Thiết lập giá mục tiêu và nhận cảnh báo (US02, BR1, BR2, BR4)

- **Nút Cài đặt pop-up trên `/detail`:**
  - Bổ sung nút Cài đặt với biểu tượng Bánh răng (`Settings`) ngay trên màn hình chi tiết sản phẩm `/detail`.
  - Khi bấm vào nút, hệ thống hiển thị một Modal Pop-up (`ProductSettingsModal`) phục vụ 2 mục đích:
    1. **Cập nhật giá mục tiêu (Target Price):** Cho phép người dùng linh hoạt đặt lại hoặc điều chỉnh mức giá kỳ vọng bất kỳ lúc nào sau khi đã theo dõi sản phẩm (thay vì chỉ được đặt 1 lần duy nhất lúc thêm sản phẩm như trước đây).
    2. **Khung cấu hình thông báo (Notification Settings Placeholder):** Bố trí sẵn giao diện cấu hình kênh thông báo (Email, Web push), Khung giờ yên tĩnh (Quiet hours), và Cảnh báo trước đợt sale lớn để chuẩn bị sẵn sàng cho US10.
- **Kiểm tra nghiệp vụ thời gian thực (BR1):**
  - Form giá mục tiêu kiểm tra trực tiếp: Nếu giá người dùng nhập $\ge$ giá hiện tại (`current_price`), form hiển thị thông báo lỗi: `"Target must be lower than the current price <current_price>"` và vô hiệu hóa nút submit.
- **Huy hiệu trạng thái cảnh báo giá (Alert status badge):**
  - Khi lưu giá mục tiêu thành công, giao diện cập nhật state cục bộ ngay lập tức mà không cần reload toàn bộ trang, đồng thời hiển thị huy hiệu nổi bật: `"Alert at <target_price>"` (hoặc theo đơn vị tiền tệ tương ứng) tại khu vực thông tin giá của sản phẩm.
- **Kích hoạt hệ thống thông báo Toast (NotificationCenter):**
  - Gỡ bỏ điều kiện khóa môi trường dev/mock, kích hoạt `NotificationCenter` toàn cục cho tất cả người dùng đã đăng nhập để nhận thông báo thời gian thực khi tiến trình nền (`price_monitor_service`) phát hiện giá chạm mục tiêu.
  - Cho phép người dùng click vào thông báo để chuyển hướng ngay đến trang chi tiết sản phẩm hoặc mở link mua sắm.

---

## 3. Biểu đồ lịch sử giá đầy đủ và phát hiện Gap (US03, BR5, BR15)

- **Tùy chọn hiển thị toàn bộ thời gian theo dõi ("Tất cả"):**
  - Trước đây: Biểu đồ chỉ cho phép chọn cố định `7 ngày`, `14 ngày`, hoặc `30 ngày`.
  - Thay đổi mới: Bổ sung nút lựa chọn **"Tất cả" (All time)**. Khi chọn mốc này, frontend truyền tham số `days=0` lên backend để lấy trọn vẹn toàn bộ dữ liệu lịch sử giá từ ngày đầu tiên sản phẩm bắt đầu được ghi nhận, đúng với tinh thần đặc tả *"covering however long the product has been tracked"*.
- **Giữ nguyên các cơ chế xử lý Gap và Cảnh báo:**
  - Tiếp tục duy trì cơ chế phát hiện khoảng trống dữ liệu (`is_gap = True`), hiển thị đường nét đứt kèm vùng đổ bóng mờ (`ReferenceArea`), tooltip *"No data recorded during this period"*, và banner cảnh báo khi dữ liệu dưới 7 ngày riêng biệt (BR5).

---

## 4. Xác thực, Đăng ký, Đăng nhập và Quản lý Nickname (US04, BR13, BR14)

- **Chặn Quên mật khẩu đối với tài khoản Google thuần túy:**
  - Theo đặc tả: Người dùng đăng ký hoàn toàn bằng tài khoản Google không có mật khẩu ứng dụng riêng để đặt lại.
  - Thay đổi mới: Backend `auth_service.py` kiểm tra nếu người dùng yêu cầu OTP đặt lại mật khẩu (`RESET_PASSWORD`) mà có `auth_provider == 'google'` và không có `password_hashed`, hệ thống sẽ trả về lỗi `GOOGLE_ACCOUNT_NO_PASSWORD`. Giao diện `ForgotPasswordPage.tsx` hiển thị thông báo rõ ràng yêu cầu người dùng đăng nhập trực tiếp qua nút Google.
- **Chuẩn hóa đường dẫn Profile:**
  - Trước đây: Màn hình hồ sơ cá nhân và chỉnh sửa nickname được gắn vào route `/settings`.
  - Thay đổi mới: Chuyển đổi chính thức sang route **`/profile`** trên toàn bộ `App.tsx` và `Sidebar.tsx` để khớp 100% với bảng Routes và Screen Flow trong tài liệu kiến trúc `docs/requirements.md`. Hệ thống đồng thời duy trì redirect tự động từ `/settings` sang `/profile` để đảm bảo không gãy liên kết cũ.

---

## 5. Xem danh sách sản phẩm theo dõi (US05, BR5, BR8, BR15)

- **Đồng bộ thông báo giới hạn 10 sản phẩm (BR8):**
  - Đồng bộ cơ chế thông báo `"You have reached the limit of 10 tracked products"` trên giao diện `/watchlist`.
- **Giữ nguyên các thành phần tóm tắt:**
  - Giữ nguyên các cột hiển thị: tên sản phẩm, ảnh đại diện, giá hiện tại, khoảng giá biến động (thấp nhất - cao nhất), điểm sao đánh giá, nhãn giá (`Not enough data to assess`, `Good price`, `Normal`, `Expensive`), và nút xóa sản phẩm kích hoạt thời gian ân hạn 7 ngày (BR15).

---

## Bảng tổng hợp thay đổi so với bản trước

| Mục | Nội dung thay đổi |
|---|---|
| **US01** | Bổ sung thông báo `"You have reached the limit of 10 tracked products"` khi bấm thêm sản phẩm nếu đã đủ 10; giữ nguyên Amazon RapidAPI adapter. |
| **US02** | Thêm nút Cài đặt icon bánh răng trên `/detail` mở pop-up; form sửa giá mục tiêu có kiểm tra BR1 thời gian thực; hiển thị huy hiệu `"Alert at <price>"`; tích hợp khung cấu hình thông báo (US10); kích hoạt `NotificationCenter` toast toàn cục. |
| **US03** | Thêm nút mốc thời gian **"Tất cả"** (`days=0`) vào biểu đồ giá để xem trọn vẹn toàn bộ lịch sử; backend mở rộng `ge=0` cho endpoint history. |
| **US04** | Chặn gửi OTP quên mật khẩu đối với tài khoản chỉ dùng Google (`GOOGLE_ACCOUNT_NO_PASSWORD`); đổi đường dẫn từ `/settings` sang `/profile` kèm redirect phụ tương thích ngược. |
| **US05** | Hiển thị thông báo khi chạm giới hạn 10 sản phẩm đồng bộ với US01. |

