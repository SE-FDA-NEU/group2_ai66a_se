## THỐNG KÊ TỔNG HỢP (từ file CSV – khảo sát online)

> Mẫu: **15 phản hồi**, thu thập qua Google Forms từ 16/09/2026 đến 18/09/2026. Mẫu nhỏ nên các con số chỉ mang tính **định hướng**, chưa đại diện cho toàn bộ HS-SV. Với câu hỏi chọn nhiều đáp án, tổng tỷ lệ có thể vượt 100%.

### A. Kiểm tra dữ liệu (thực hiện bằng Python – xem `analyze_survey.py`)

- Số phản hồi hợp lệ: **15/15**; không có dòng trùng lặp, không trùng tên; 26/29 cột đầy đủ 100% dữ liệu.
- 2 cột **“Lý do lớn nhất khiến bạn chưa mua sắm online”** và **“Yếu tố khiến bạn cân nhắc bắt đầu mua sắm online”** trống hoàn toàn vì cả 15 người đều đã từng mua online (câu hỏi rẽ nhánh, đúng thiết kế). Cột “Khó khăn khác” trống 4/15 (bỏ qua câu mở).
- Đã chuẩn hóa: cắt khoảng trắng thừa ở tên và câu trả lời mở (4 tên, 4 ô câu mở), viết hoa tên “trần phương anh”; chuyển 2 ô (Nguyễn Tiến Phong) từ Unicode dạng tổ hợp (NFD) sang NFC (nhìn giống hệt nhưng so khớp/tìm kiếm chuỗi sẽ bị lệch).
- Câu hỏi chọn nhiều đáp án được tách theo danh sách đáp án chuẩn của form (một số đáp án có dấu phẩy bên trong).
- Điểm cần lưu ý (không xóa dữ liệu, chỉ ghi chú trong từng khối người trả lời):
  - Nguyễn Thế Vinh: chọn “Chưa từng gặp vấn đề gì” cùng lúc với 3 tình huống khác; đồng thời chọn “Chưa bao giờ” săn sale.
  - Hoàng Yến Nhi: chọn “Chưa từng gặp vấn đề gì” nhưng lại điền khó khăn lớn nhất là “Hay fomo”.
  - Trương Diệu Anh: chọn check giá khi “Đang học trên lớp” nhưng trả lời “Không bao giờ” ở câu check giá lúc học/bận.
  - Nguyễn Đại Dương: nhóm tuổi “Dưới 18” nhưng là sinh viên năm 1–2 (hiếm gặp, nên xác nhận lại).
  - Câu “Giá trị cốt lõi” quy định chọn 1–2 đáp án nhưng **7/15** người chọn 3–4 đáp án (form không giới hạn số lượng) → khi trích số liệu nên hiểu là “được chọn”, không phải “ưu tiên số 1”.
- Hạn chế mẫu: 100% là sinh viên; 73,3% là nữ; 86,7% thuộc nhóm 18–22 tuổi; chưa có nhóm mẹ bỉm sữa/nhân viên văn phòng như đối tượng chính trong `01-description.md`.

### B. Identity – Nhân khẩu học & hành vi mua sắm

**Giới tính**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Nữ | 11 | 73,3% |
| Nam | 4 | 26,7% |

**Nhóm tuổi**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Dưới 18 | 1 | 6,7% |
| 18–22 | 13 | 86,7% |
| 23–25 | 1 | 6,7% |

**Tình trạng học tập/công việc**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Sinh viên năm 1–2 | 4 | 26,7% |
| Sinh viên năm 3–4 / sắp ra trường | 8 | 53,3% |
| Sinh viên vừa học vừa đi làm thêm | 3 | 20,0% |

**Nguồn thu nhập/chi tiêu chính**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Gia đình chu cấp | 4 | 26,7% |
| Làm thêm bán thời gian | 2 | 13,3% |
| Học bổng / trợ cấp | 1 | 6,7% |
| Kết hợp nhiều nguồn | 8 | 53,3% |

**Chi tiêu cá nhân hằng tháng**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Dưới 3 triệu VNĐ | 3 | 20,0% |
| 3 – 5 triệu VNĐ | 8 | 53,3% |
| 5 – 10 triệu VNĐ | 3 | 20,0% |
| Trên 10 triệu VNĐ | 1 | 6,7% |

**Hoàn cảnh sống**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Sống cùng bố mẹ / gia đình | 6 | 40,0% |
| Ở trọ một mình | 3 | 20,0% |
| Ở ghép cùng bạn | 5 | 33,3% |
| Ở cùng em gái ( ở trọ ) | 1 | 6,7% |

**Mức độ am hiểu công nghệ**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Cơ bản | 3 | 20,0% |
| Trung cấp | 10 | 66,7% |
| Nâng cao | 2 | 13,3% |

**Nền tảng thường dùng (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Shopee | 14 | 93,3% |
| TikTok Shop | 10 | 66,7% |
| Lazada | 0 | 0,0% |
| Sendo | 0 | 0,0% |
| Khác (tự điền): Tiki, fb | 1 | 6,7% |

*Shopee và TikTok Shop chiếm gần như toàn bộ; không ai chọn Lazada hoặc Sendo.*

**Mức chi cho mua sắm online mỗi tháng (tự đánh giá)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Ít | 3 | 20,0% |
| Trung bình | 4 | 26,7% |
| Kha khá | 7 | 46,7% |
| Nhiều | 1 | 6,7% |

**Tần suất săn sale**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Chưa bao giờ | 1 | 6,7% |
| Thỉnh thoảng | 9 | 60,0% |
| Thường xuyên | 3 | 20,0% |
| Săn sale vào mọi dịp có sale | 2 | 13,3% |

**Quy trình săn sale quen thuộc nhất**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Chốt deal tại trận (lướt thấy sale/livestream → lấy voucher → chốt) | 4 | 26,7% |
| Gom sẵn từ sớm (giỏ hàng, mã giảm giá, canh giờ 0h/12h) | 4 | 26,7% |
| So sánh đa nền tảng (so giá chéo sàn, lưu link rẻ nhất, chờ giảm thêm) | 3 | 20,0% |
| Tiện thì mua (không có quy trình, thấy giá hợp lý/freeship là mua) | 3 | 20,0% |
| Tự điền: tùy giá sản phẩm mà dùng cách “gom sẵn” hoặc “chốt tại trận” | 1 | 6,7% |

### C. Goals – Mục tiêu & kỳ vọng vào công cụ

**Mục tiêu khi canh giá/săn sale (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Mua được nhiều đồ với ngân sách giới hạn | 11 | 73,3% |
| Mua món hàng với giá rẻ nhất có thể | 10 | 66,7% |
| Tiết kiệm tiền cho việc khác | 9 | 60,0% |
| Giảm stress trong chi tiêu | 4 | 26,7% |
| Nhận thông báo kịp thời, không bỏ lỡ giá tốt | 1 | 6,7% |
| Khác (tự điền): Đôi khi là fomo | 1 | 6,7% |

**Yếu tố quyết định một buổi săn sale thành công**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Mua được đúng món đang cần gấp với giá hợp lý | 7 | 46,7% |
| Tiết kiệm được số tiền lớn nhất có thể | 7 | 46,7% |
| Tiết kiệm thời gian, không cần canh giá thủ công liên tục | 1 | 6,7% |

**Điều muốn công cụ tự động hóa (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Tự động theo dõi giá & báo khi giảm tới mức mong muốn | 8 | 53,3% |
| Kiểm tra/gợi ý độ uy tín của shop | 7 | 46,7% |
| So sánh giá chéo nhiều sàn | 7 | 46,7% |
| Biểu đồ lịch sử giá (tự đánh giá sale ảo) | 3 | 20,0% |
| Watchlist: theo dõi nhiều sản phẩm cùng lúc | 2 | 13,3% |
| AI dự đoán & cảnh báo trước đợt hạ giá/flash sale | 2 | 13,3% |

**Giá trị cốt lõi để mở app thường xuyên (chọn 1–2)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Tiết kiệm tiền bạc (rẻ hơn bình thường) | 11 | 73,3% |
| An tâm tâm lý (không sợ mua hớ / giá ảo) | 8 | 53,3% |
| Tiện lợi (gom theo dõi nhiều sàn vào một chỗ) | 7 | 46,7% |
| Tiết kiệm thời gian (không phải mở app check mỗi ngày) | 6 | 40,0% |
| Khác (tự điền): sản phẩm chất lượng | 1 | 6,7% |

### D. Pains – Nỗi đau & rào cản

**Tình huống đã từng gặp (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Mua xong vài ngày sau giá giảm mạnh hơn | 11 | 73,3% |
| Bỏ lỡ flash sale vì không online đúng giờ | 8 | 53,3% |
| So sánh kỹ nhiều shop vẫn mua phải hàng không như mong muốn | 7 | 46,7% |
| Quên mất sản phẩm đang muốn mua | 6 | 40,0% |
| Phát hiện shop tăng giá ảo rồi gắn mác giảm giá | 5 | 33,3% |
| Chưa từng gặp vấn đề gì | 2 | 13,3% |

**Khó khăn LỚN NHẤT khi mua sắm online**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Mua xong phát hiện giá giảm sâu hơn sau đó | 4 | 26,7% |
| Mất thời gian kiểm tra giá thủ công mỗi ngày | 3 | 20,0% |
| Cùng sản phẩm nhưng các shop chênh giá, khó biết mua ở đâu | 3 | 20,0% |
| Mua phải hàng không như kỳ vọng (không kiểm tra kỹ đánh giá shop) | 3 | 20,0% |
| Tự điền: “Hay fomo” | 1 | 6,7% |
| Nghi ngờ/phát hiện shop tăng giá ảo trước khi giảm | 1 | 6,7% |

**Tần suất gặp tình trạng không mong muốn**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Hiếm khi | 2 | 13,3% |
| Thỉnh thoảng | 11 | 73,3% |
| Thường xuyên | 2 | 13,3% |

*Theo form: Hiếm khi ≈ 1–2 lần/năm; Thỉnh thoảng ≈ 1–2 lần/tháng; Thường xuyên ≈ gần như hằng tuần.*

**Cảm xúc khi gặp tình huống đó**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Khá bực bội nhưng bỏ qua vì số tiền không đáng kể | 8 | 53,3% |
| Không quan tâm nhiều, đã quen | 5 | 33,3% |
| Rất khó chịu, mất niềm tin vào shop/sàn | 2 | 13,3% |

### E. Context – Bối cảnh kiểm tra giá

**Thời điểm kiểm tra giá (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Khi vừa phát sinh nhu cầu mua | 9 | 60,0% |
| Trước khi mua vài ngày | 7 | 46,7% |
| Thường xuyên theo dõi giá dù chưa định mua | 5 | 33,3% |
| Trong các dịp sale lớn | 3 | 20,0% |
| Trước khi mua vài tuần | 2 | 13,3% |

**Hoàn cảnh kiểm tra giá (chọn nhiều)**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Ở nhà / phòng trọ | 9 | 60,0% |
| Khi đang giải trí / dùng mạng xã hội | 9 | 60,0% |
| Khi đang mua sắm trực tiếp | 6 | 40,0% |
| Khi nghỉ giải lao | 5 | 33,3% |
| Đang học trên lớp / giảng đường | 4 | 26,7% |
| Khi đang di chuyển | 0 | 0,0% |
| Khác (tự điền, 2 người) | 2 | 13,3% |

**Kiểm tra giá khi đang học/bận việc khác**

| Lựa chọn | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Không bao giờ | 4 | 26,7% |
| Hiếm khi | 3 | 20,0% |
| Thỉnh thoảng | 7 | 46,7% |
| Khá thường xuyên | 1 | 6,7% |

### F. Chỉ số nổi bật (dùng cho Business rules / Acceptance criteria)

| Chỉ số | Số người | Tỷ lệ (n = 15) |
|:---|---:|---:|
| Săn sale thường xuyên hoặc mọi dịp | 5 | 33,3% |
| Gặp tình trạng không mong muốn từ ~1–2 lần/tháng trở lên | 13 | 86,7% |
| Bực bội / rất khó chịu khi gặp tình huống đó | 10 | 66,7% |
| Từng mua xong vài ngày sau thấy giá giảm mạnh hơn | 11 | 73,3% |
| Từng bỏ lỡ flash sale vì không online đúng giờ | 8 | 53,3% |
| Từng phát hiện shop tăng giá ảo rồi gắn mác giảm giá | 5 | 33,3% |
| Kiểm tra giá cả lúc đang học/bận việc khác (từ “thỉnh thoảng” trở lên) | 8 | 53,3% |
| Muốn công cụ tự động theo dõi giá và báo khi giảm | 8 | 53,3% |
| Muốn so sánh giá cùng sản phẩm chéo nhiều sàn | 7 | 46,7% |
| Muốn tự động kiểm tra/gợi ý độ uy tín của shop | 7 | 46,7% |
| Chọn “Tiết kiệm tiền” là giá trị cốt lõi | 11 | 73,3% |
| Chọn “Tiết kiệm thời gian” là giá trị cốt lõi | 6 | 40,0% |

**Đối chiếu nhóm săn sale nhiều với nhóm còn lại**

| Nội dung | Săn sale nhiều (n = 5) | Còn lại (n = 10) |
|:---|---:|---:|
| Muốn theo dõi giá & báo khi giảm | 2/5 (40,0%) | 6/10 (60,0%) |
| Muốn so sánh giá chéo sàn | 2/5 (40,0%) | 5/10 (50,0%) |
| Muốn kiểm tra độ uy tín shop | 2/5 (40,0%) | 5/10 (50,0%) |
| Từng mua xong giá giảm mạnh hơn | 4/5 (80,0%) | 7/10 (70,0%) |
| Từng bỏ lỡ flash sale | 4/5 (80,0%) | 4/10 (40,0%) |

*Nhóm nhỏ nên chỉ nêu xu hướng, không kết luận thống kê.*
