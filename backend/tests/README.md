# Backend Tests

Cài thư viện và chạy từ thư mục gốc theo [docs/SETUP.md](../../docs/SETUP.md). Cấu hình kiểm thử được gom tại `pytest.ini` và `conftest.py` ở root; không cần `.env` hay dịch vụ đang chạy.

```bash
pytest
pytest -m issue185 -q
pytest backend/tests -q
pytest backend/tests/integration/test_notification_seen_endpoint.py -v
```

`pytest` chạy backend và các hợp đồng giao diện #185 bằng Vitest thật qua `tests/test_issue185_interface.py`. `unit/` kiểm tra services với dependency giả và repository bằng SQLite trong bộ nhớ. `integration/` gọi FastAPI bằng ASGITransport/TestClient trong tiến trình, thay database, Redis và người dùng bằng fake; không cần PostgreSQL/Redis thật.


`template_test.py` là hai ví dụ được skip có chủ đích. `unit/test_google-auth.py` là sandbox Google OAuth thủ công và không được thu thập. Chỉ các test trong scope #185 có guard chặn mọi dịch vụ ngoài tại root conftest; các test còn lại tiếp tục dùng fake riêng của chúng.

Đặt tên `test_<feature>.py`, dùng Arrange → Act → Assert; với code bất đồng bộ dùng `AsyncMock`. Đặt ID ca trong tên hàm hoặc comment và bổ sung hàng tương ứng trong tài liệu. Không in token, mật khẩu hay cấu hình thật vào log.

## Ma trận kiểm thử từ main

- US01: [docs/testing.md](../../docs/testing.md).
- US02: [US02_TEST_CASES.md](US02_TEST_CASES.md).

Giữ tên test `test_us02_tc_*` từ main; các ID N185 được ghi trong comment để truy vết đồng thời hai bộ tiêu chí.
