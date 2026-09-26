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

---

Giờ cập nhật US04's screen reference vẫn giữ nguyên (không đổi), qua US05:Cập nhật US06, US07 (bỏ nhắc "30-day" trong AC cho khớp BR6/BR7 mới):Thêm ghi chú phụ thuộc vào US09 (vì đã bỏ shop_rating/shop_review_count khỏi scope hiện tại):Giờ cập nhật Business rules (BR3, BR5, BR6, BR7, thêm BR15):Thêm BR15 (retention & gap) vào cuối bảng business rules:Cuối cùng, cập nhật bảng Screens (`/watchlist`, `/detail`) cho khớp:Đã cập nhật xong toàn bộ `requirements.md`. Đây là task chi tiết cho US01 và US05 theo đúng lifecycle mới (đã lồng thẳng vào file, nhắc lại ở đây cho tiện):

**US01 — Tasks:**
- **[Task] Thiết kế nút "+" và form dán link trên /watchlist** (validate Shopee/TikTok Shop, short link, BR9, chặn khi đủ 10 — BR8) — `@Dai-Nguyen1506`
- **[Task] Thiết kế logic dán link ở backend** — tra DB theo (marketplace, external_id): có sẵn + đang có người theo dõi → dùng cache; có sẵn nhưng đang trong 7 ngày ân hạn (0 người theo dõi) → gọi lại API refresh giá rồi mới trả về (resume); hoàn toàn chưa có → gọi API, lưu sản phẩm + dòng giá đầu tiên (BR3, BR15) — `@huydang2006`

**US05 — Tasks:**
- **[Task] Thiết kế row sản phẩm trên /watchlist** (tên, giá hiện tại, thấp/cao nhất trong toàn bộ thời gian theo dõi, sao, nhãn) — `@CaMapCon26`
- **[Task] Thiết kế endpoint danh sách + xoá theo dõi** — `GET /watchlist` (check BR8 khi thêm), `DELETE /watchlist/{id}` chỉ giảm tracker-count và bật đếm ngược 7 ngày (BR15), không đụng vào dữ liệu giá đã lưu — `@happyhusky3303`
- **[Task] Responsive layout màn 375px, tối đa 10 rows không scroll ngang** — `@maimanhbel`

**Toàn bộ thay đổi trong file so với bản trước:**

| Mục | Thay đổi |
|---|---|
| US01 | Bỏ hẳn "Track this product" (không còn tồn tại vì `/detail` chỉ vào được từ sản phẩm đã theo dõi); thêm case "resume trong 7 ngày" vào AC + Task |
| US02 | Task job refresh 5 phút giờ kiêm luôn việc xoá vĩnh viễn sản phẩm hết hạn 7 ngày (BR15) |
| US03 | Đổi tên "30-day price history" → "full price history"; thêm AC/Task xử lý **gap** (dải nhạt màu, tooltip "No data recorded", suy luận qua khoảng cách thời gian giữa 2 điểm liên tiếp) |
| US05 | Bỏ "shop trust" khỏi label liệt kê (dời sang US09); AC xoá theo dõi làm rõ giữ dữ liệu 7 ngày (BR15) |
| US06, US07 | Đổi "30-day median/lowest" → "median/lowest trên toàn bộ thời gian theo dõi" cho khớp BR6/BR7 mới |
| US09 | Thêm ghi chú: API sản phẩm hiện tại không có rating của shop, cần bổ sung khi làm story này |
| BR3 | Viết lại 3 nhánh rõ ràng: đã có+đang track / đã có+đang trong ân hạn (resume) / hoàn toàn mới |
| BR5 | Làm rõ "7 ngày" là 7 **ngày lịch riêng biệt có dữ liệu**, không tính ngày bị gap |
| BR6, BR7 | Bỏ khung "30 ngày", đổi thành "toàn bộ thời gian đã theo dõi" |
| BR15 (mới) | Quy tắc giữ 7 ngày sau khi hết người theo dõi → resume nếu có người track lại → xoá vĩnh viễn (cascade cả price_history) nếu quá hạn |
| Screens (`/watchlist`, `/detail`) | Bỏ "shop trust", bỏ "Track this product", đổi "30-day chart" → "full price chart... gaps shown", thêm "remove tracking" |

Không đổi: Product vision, Personas, Business rules BR1/2/4/8-14, US04, US08, US10-US12, sơ đồ flow diagram (không liên quan tới thay đổi này). Riêng Scenario 2 (mục 3, kịch bản phỏng vấn) vẫn còn nhắc "30 days of price history" — mình giữ nguyên vì đó là câu chuyện nghiên cứu người dùng gốc, không phải đặc tả kỹ thuật, sửa lại sẽ làm sai lệch tư liệu phỏng vấn thực tế.