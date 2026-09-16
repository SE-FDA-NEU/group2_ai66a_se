# Task Description: Thiết kế Bộ câu hỏi khảo sát xác định Chân dung Người dùng (User Persona Survey)

***Link làm việc chung:*** [Docs](https://docs.google.com/document/d/1xqGyDUoXLk4SYCvp9l83zuP17tEXFumfeysdwefFWVA/edit?usp=sharing)  
***Link bộ câu hỏi khảo sát trực tiếp:*** [Direct Survey](./02-direct-questions.md)  
***Link bộ câu hỏi khảo sát online:*** [Online Survey](./03-online-questions.md)  
***Link câu trả lời:***  [Answers](04-answers.md)  

---

## 1. Mục tiêu nhiệm vụ (Task Objectives)
- **Tên dự án:** Automated E-commerce Price Tracker & Alert System (Hệ thống theo dõi lịch sử giá và cảnh báo giảm giá sàn TMĐT).
- **Mục tiêu cốt lõi:** Xây dựng bộ công cụ khảo sát thực chứng (User Research Tool) nhằm thu thập dữ liệu hành vi, tâm lý và trải nghiệm mua sắm thực tế của người dùng. Kết quả phân tích sẽ là cơ sở trực tiếp để xây dựng 2–3 hồ sơ Chân dung người dùng chuẩn (`docs/personas.md`) và các User Story có giá trị thực tế cho `docs/backlog.md` trong Sprint 1.

---

## 2. Đối tượng khảo sát (Target Audience)
1. **Nhóm đối tượng chính (Primary Target):** 
   - Phụ nữ (sinh viên, nhân viên văn phòng, nội trợ / mẹ bỉm sữa) thường xuyên mua sắm online các ngành hàng: Mỹ phẩm, Thời trang, Đồ gia dụng & Mẹ và bé.
2. **Nhóm đối tượng mở rộng (Secondary Target):**
   - Những người đam mê "săn sale", chuyên gia canh deal giá rẻ, người nhạy cảm về giá và thường xuyên mua sắm trên các sàn TMĐT (Shopee, TikTok Shop, Lazada, Tiki).
   - Người có thói quen so sánh giá, tìm kiếm mã giảm giá và muốn tránh tình trạng "sale ảo" / tăng giá trước ngày giảm.

---

## 3. Miêu tả chi tiết 4 Tiêu chí cốt lõi (4 Core Pillars)

| Tiêu chí | Định nghĩa & Ý nghĩa | Mục tiêu bóc tách dữ liệu |
| :--- | :--- | :--- |
| **1. Identity (Định danh)** | Chân dung nhân khẩu học và thói quen nền tảng của người dùng. | Xác định độ tuổi, giới tính, mức thu nhập/ngân sách mua sắm, nền tảng TMĐT quen thuộc, mức độ thành thạo công nghệ và thiết bị sử dụng chính. |
| **2. Goals (Mục tiêu & Động lực)** | Kết quả mong đợi và lợi ích lớn nhất mà người dùng muốn đạt được khi mua sắm/săn deal. | Xác định lý do họ cần theo dõi giá: mua được đáy giá thực sự, tối ưu chi phí, bóc trần chiêu trò sale ảo, nhận thông báo kịp thời không bỏ lỡ deal. |
| **3. Pains (Nỗi đau & Rào cản)** | Khó khăn, bức xúc và rủi ro người dùng gặp phải trong quá trình mua sắm hiện tại. | Nhận diện các điểm nghẽn: tốn thời gian kiểm tra giá thủ công, bực bội vì mua xong bị giảm giá sâu hơn, bị lừa bởi giá ảo, trôi thông báo quan trọng do sàn spam quảng cáo. |
| **4. Context (Bối cảnh sử dụng)** | Môi trường, thời điểm, tần suất và quy trình tương tác thực tế khi săn deal. | Làm rõ thói quen: lướt sàn ban đêm/flash sale, nhận tin báo qua đâu (Telegram, Zalo, Push Mobile, Web Extension), số bước thao tác chấp nhận được khi dán link theo dõi giá. |

---

## 4. Phân công nhiệm vụ trong nhóm (Team Assignment)

> **Nguyên tắc phân công:** Nhóm gồm 4 thành viên, mỗi người chọn và phụ trách nghiên cứu chuyên sâu **1 tiêu chí** để thiết kế câu hỏi cho cả 2 phiên bản (Online & Phỏng vấn trực tiếp).

* **Thành viên 1:** Phụ trách tiêu chí **Identity (Định danh)**.
* **Thành viên 2:** Phụ trách tiêu chí **Goals (Mục tiêu)**.
* **Thành viên 3:** Phụ trách tiêu chí **Pains (Nỗi đau & Rào cản)**.
* **Thành viên 4:** Phụ trách tiêu chí **Context (Bối cảnh sử dụng)**.

---

## 5. Bộ câu hỏi khảo sát mẫu (Survey Templates)

> **Yêu cầu đối với câu hỏi khảo sát:**
> - **Câu hỏi mở có cấu trúc (Structured Open-ended Questions):** Đi kèm gợi ý định hướng (prompts/ví dụ cụ thể) để người trả lời dễ hình dung ngữ cảnh và phản hồi trúng trọng tâm, tránh câu hỏi quá chung chung hoặc mơ hồ.
> - **Tính tinh gọn:** Kết hợp hài hòa giữa trắc nghiệm định lượng và câu hỏi mở định tính.

### Phiên bản 1: Khảo sát Online (Google Forms / Typeform)

* **1. Identity (Định danh):**
  * *Trắc nghiệm:* Độ tuổi và nhóm đối tượng của bạn? *(< 20 / 20-24 Sinh viên / 25-32 Đi làm - Mẹ bỉm / > 32)*.
  * *Trắc nghiệm:* Sàn TMĐT & Ngành hàng bạn hay mua sắm nhất? *(Shopee / TikTok Shop / Lazada... & Thời trang / Mỹ phẩm / Gia dụng...)*.
* **2. Goals (Mục tiêu):**
  * *Trắc nghiệm:* Mục tiêu lớn nhất của bạn khi canh sale là gì? *(Mua đúng đáy giá / Bóc trần sale ảo / Áp mã giảm tối đa)*.
  * *Câu hỏi mở có gợi ý:* *"Nếu có công cụ theo dõi giá, điều gì sẽ khiến bạn quyết định bấm mua ngay lập tức? (Gợi ý: Mức giảm từ bao nhiêu % hoặc giảm bao nhiêu tiền so với giá gốc?)"*
* **3. Pains (Nỗi đau):**
  * *Trắc nghiệm:* Khó khăn lớn nhất khi săn sale? *(Mất thời gian kiểm tra thủ công / Mua xong bị giảm giá sâu hơn / Bị tăng giá ảo / Trôi thông báo)*.
  * *Câu hỏi mở có gợi ý:* *"Hãy mô tả ngắn gọn một trải nghiệm mua hàng mà bạn thấy 'bị hớ' hoặc bức xúc nhất (Gợi ý: Tên món hàng, chiêu trò nâng giá ảo của shop, hoặc mức độ chênh lệch giá sau khi mua)?"*
* **4. Context (Bối cảnh):**
  * *Trắc nghiệm:* Bạn ưu tiên nhận cảnh báo giảm giá tức thì qua kênh nào? *(Telegram / Zalo / Push App / Web Extension)*.
  * *Trắc nghiệm:* Thao tác tối đa bạn chấp nhận để theo dõi 1 sản phẩm? *(1 chạm dán link / 2-3 bước tùy chỉnh giá)*.

---

### Phiên bản 2: Phỏng vấn trực tiếp (1-on-1 In-depth Interview)

* **1. Identity:** *"Bạn có thể chia sẻ thói quen mua sắm online hàng tháng của mình không? (Gợi ý: Bạn thường lướt mua đồ theo nhu cầu phát sinh hay có danh sách dự định từ trước?)"*
* **2. Goals:** *"Làm thế nào để bạn biết chắc chắn mình đã mua được một món đồ với 'giá đáy' thực sự chứ không phải chiêu trò giảm giá ảo của người bán?"*
* **3. Pains:** *"Khi phải liên tục vào sàn kiểm tra xem món đồ mình thích đã giảm giá chưa, bạn cảm thấy phiền toái nhất ở điểm nào? Đã bao giờ bạn bỏ lỡ đợt flash sale vì việc này chưa?"*
* **4. Context:** *"Hãy mô tả tình huống bạn nhận thông báo giảm giá lý tưởng nhất: Bạn đang làm gì, ở đâu và muốn hệ thống gửi thông báo kèm theo thông tin gì để bạn bấm mua nhanh nhất?"*

---

## 6. Kết quả mong muốn (Expected Deliverables)

Sau khi hoàn thành khảo sát, nhóm cần đạt được các đầu ra cụ thể sau cho Milestone 1 (Sprint 1):

1. **Dữ liệu khảo sát:**
   - Online Form: Đạt tối thiểu **3 - 5 phản hồi** hợp lệ.
   - Phỏng vấn trực tiếp: Tối thiểu **2 - 3 bản ghi chép/phỏng vấn sâu**.
2. **Hoàn thiện `docs/personas.md`:**
   - Xây dựng chuẩn 2 hồ sơ chân dung đại diện:
     - **Persona 1 (Thợ săn deal sành sỏi):** Nghiên cứu sâu lịch sử giá, ghét giá ảo, tối ưu chi phí.
     - **Persona 2 (Người mua sắm bận rộn):** Cần đặt giá tự động, nhận tin báo 1 chạm và thao tác nhanh gọn.
3. **Chuyển hóa sang `docs/backlog.md`:**
   - Chuyển các insight về Nỗi đau (Pains) & Mục tiêu (Goals) thành danh sách **User Stories kèm Acceptance Criteria (Given/When/Then)** có thể kiểm thử được.