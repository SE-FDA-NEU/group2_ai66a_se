1. Đăng ký/đăng nhập (US04, /login, /register mới, /forgot-password mới)

- M1: chỉ có "Sign in with Google" (không có Email, không có đăng ký, không quên mật khẩu).
- Bản mới: thêm hẳn luồng Email — đăng ký (nickname, email, password, confirm password → OTP), đăng nhập (email + password), quên mật khẩu (OTP → đặt lại mật khẩu). Story US04 đổi tên, tăng từ 3 → 8 điểm vì phạm vi rộng hơn nhiều.
- Route mới: /register, /forgot-password.

2. Nickname (US04, BR14 mới, /profile mới)

- M1: không có khái niệm nickname.
- Bản mới: Google → nickname tự lấy từ profile Google; Email → nhập tay lúc đăng ký. Cả hai đều sửa được sau trong /profile (route mới, P1).

3. Giới hạn 10 sản phẩm (BR8, US05)

- M1: BR8 chặn sau khi thêm sản phẩm thứ 11 ("adding an 11th → rejected").
- Bản mới: chặn ngay khi bấm "+" nếu đã đủ 10 — form dán link không mở ra nữa, hiện luôn thông báo đã đạt giới hạn.

4. Sàn hỗ trợ Amazon (BR9)

- M1: chỉ Shopee/TikTok Shop, Amazon bị từ chối.
- Bản mới: giữ nguyên phạm vi chính thức Shopee/TikTok, nhưng thêm ghi chú (dev/test only) rằng trong lúc chưa có API Shopee/TikTok, hệ thống tạm chấp nhận 1 link Amazon để test — không phải scope chính thức.

5. OTP (BR13 mới)

- M1: chưa có OTP.
- Bản mới: 6 số, hết hạn 5 phút, tối đa 5 lần thử sai trước khi phải gửi lại mã — áp dụng cho cả đăng ký Email và quên mật khẩu.

6. Nội dung hiển thị ở /watchlist và /detail (US03, US05, US06, US07)

- M1: mô tả bằng "price chart" (biểu đồ mini) trên từng dòng sản phẩm.
- Bản mới: mô tả cụ thể "current price, lowest price, highest price" thay vì chỉ "price chart" — khớp với luồng bạn mô tả ban đầu (thẻ hiển thị giá thấp/cao nhất 30 ngày + giá hiện tại).