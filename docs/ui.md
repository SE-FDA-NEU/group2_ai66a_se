### 1. Mục tiêu cốt lõi của Sprint 3 (Milestone 3)

* **Chứng minh tính khả dụng:** Nếu Milestone 2 chứng minh hệ thống của bạn có thể chạy được, thì Sprint 3 phải chứng minh rằng người dùng thực tế có thể sử dụng nó qua giao diện (UI).


* **Hoàn thiện PO Story:** Mỗi Product Owner (PO) story phải hoạt động trơn tru từ đầu đến cuối trên giao diện với dữ liệu thật từ database.


* **Tiêu chuẩn "Done":** Một story chỉ được coi là hoàn thành khi một người chưa từng dùng app của bạn có thể thao tác xong qua giao diện mà không cần trợ giúp, không phải gõ URL thủ công và hệ thống phải báo lỗi rõ ràng nếu có sự cố.



### 2. Các tài liệu cần tạo và cập nhật

* **Tạo mới file `docs/ui.md`:** Viết bằng Markdown. Wireframes và ảnh chụp màn hình để trong thư mục `docs/images/ui/`.


* **Cập nhật `docs/SETUP.md`:** Đảm bảo file hướng dẫn cài đặt từ Milestone 2 vẫn hoạt động tốt, nhớ cập nhật nếu có thêm thư viện, cấu hình hoặc tài khoản test.


* **Cập nhật README:** Ở ngay màn hình đầu tiên của README, hãy liệt kê các PO stories và điểm bắt đầu của chúng. Nếu app cần đăng nhập, hãy cung cấp tài khoản test (không dùng mật khẩu thật) trong `SETUP.md`.


* **Cập nhật `docs/design.md`:** Cập nhật lại thiết kế API, cơ sở dữ liệu nếu quá trình làm giao diện khiến bạn phải thay đổi thiết kế ban đầu.



### 3. Cấu trúc bắt buộc của file `docs/ui.md`

File này phải có **đúng 4 phần theo thứ tự sau**:

1. **PO stories and status:** Bảng danh sách toàn bộ PO story gồm các cột: Story, Screen(s) (Màn hình), Route, Status (Trạng thái: works, partly works, not started) và Issue. Cần kèm theo sơ đồ luồng màn hình (screen flow diagram) đã cập nhật từ M1.


2. **Wireframes:** Cần có 1 wireframe (vẽ tay chụp ảnh cũng được) cho mỗi màn hình PO. Ghi rõ mục đích của màn hình và các API endpoints nó gọi. **Đặc biệt:** Phải có ít nhất 1 màn hình được vẽ ở cả 4 trạng thái: Trống (empty), Đang tải (loading), Lỗi (error), và Có dữ liệu (data).


3. **Error messages:** Bảng liệt kê ít nhất 4 thông báo lỗi, gồm: Mã lỗi API, Quy tắc nghiệp vụ (Business rule), và Lời nhắc chính xác người dùng sẽ thấy. Cấm dùng các câu chung chung như "Error 422" hay in ra stack trace.


4. **What changed since M2:** Nêu ít nhất 1 thay đổi về API/kiến trúc khi làm UI và lý do tại sao thay đổi.



### 4. Tiêu chí qua môn (Pass condition) khi chấm điểm

Giảng viên sẽ clone code về một máy tính hoàn toàn mới và chạy thử:

* Làm theo `SETUP.md` không gặp lỗi, database được tạo và có dữ liệu.


* Hoàn thành 1 PO story hoàn toàn qua giao diện.


* Cố tình vi phạm 1 quy tắc nghiệp vụ và hệ thống phải hiện lỗi rõ ràng trên màn hình.


* File `docs/ui.md` có đủ 4 phần đúng thứ tự.



### 5. Yêu cầu đối với GitHub Repository

* **Pull Requests (PR):** Tối thiểu 4 PRs được merge trong Sprint 3, mỗi PR phải được người khác review.


* **Issues:** Tối thiểu 5 issues được đóng (bao gồm cả các PO stories có trạng thái "works").


* **Đóng góp cá nhân:** Mỗi thành viên phải có ít nhất: 1 PR được merge, 1 lần review PR, và đóng 1 issue.


* **Scrum Master:** Phải là một người **khác** so với Sprint 1 và 2 (ghi tên trong README).


* **Quản lý dự án:** Hoàn thành đóng các issue chore quản lý (Refine backlog, Sprint wrap-up) và cập nhật số liệu (committed, completed, velocity) vào `docs/sprint-log.md`.



### 6. Yêu cầu nộp bài (Submission)

* **Quy trình làm việc:** Nhóm làm trên nhánh riêng (VD: `docs/m3-ui`), sau đó tạo PR gộp vào `main`. Phải có thành viên khác review bằng nút "Review changes" (bình luận thông thường không được tính), rồi mới merge.


* **File nộp bài:** Xuất file `ui.md` sau khi merge thành file PDF với tên định dạng `Team<NN>_M3.pdf` (VD: Team03_M3.pdf).


* **Cấu trúc file PDF nộp:**
* **Trang 1:** Chứa block thông tin đầy đủ của nhóm (Tên nhóm, Topic, Thành viên, PO, SM, link Repo, link Project board, link Setup guide).


* **Trang 2:** 2 ảnh chụp Project board (1 lúc mới lên kế hoạch và 1 vào ngày nộp).


* **Trang 3:** 2 ảnh chụp app đang chạy thực tế: 1 ảnh có dữ liệu thật và 1 ảnh hiển thị thông báo lỗi. **Lưu ý quan trọng:** Cả hai ảnh phải thấy rõ thanh địa chỉ trình duyệt (address bar).
