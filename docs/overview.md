# Trakora - Tổng quan cấu trúc, công cụ và hướng dẫn phát triển

Tài liệu này mô tả trạng thái hiện tại của dự án Trakora - hệ thống theo dõi lịch sử giá sản phẩm thương mại điện tử và gửi cảnh báo khi giá giảm dưới ngưỡng do người dùng thiết lập.

Mục đích của tài liệu là giúp thành viên mới nhanh chóng biết:

- Dự án hiện đã có những thành phần nào.
- Mỗi thư mục và file chính chịu trách nhiệm gì.
- Các công cụ, framework, thư viện và dịch vụ đang được sử dụng.
- Cách khởi chạy môi trường phát triển.
- Những phần đã có sẵn và những phần cần tiếp tục triển khai.

## 1. Trạng thái hiện tại

Phần cấu trúc và cấu hình nền tảng đã được tạo cho một ứng dụng web gồm:

- Backend FastAPI chạy bất đồng bộ bằng Uvicorn.
- Frontend React + TypeScript chạy trên Vite.
- PostgreSQL làm cơ sở dữ liệu chính.
- Redis lưu OTP và các dữ liệu tạm thời có thời hạn.
- Docker Compose điều phối toàn bộ môi trường phát triển.
- Alembic quản lý migration cho cơ sở dữ liệu.
- JWT và bcrypt phục vụ xác thực người dùng.

Backend đã có nền tảng cho đăng ký, đăng nhập, xác thực OTP qua email, lấy thông tin người dùng, phân quyền developer và kiểm tra kết nối hệ thống. Frontend hiện mới là template khởi đầu, chưa có các màn hình nghiệp vụ của hệ thống theo dõi giá.

## 2. Kiến trúc tổng thể

```text
Người dùng
	|
	v
Frontend React/Vite :3000
	|
	| /api được Vite proxy tới backend
	v
Backend FastAPI/Uvicorn :8000
	|
	+-- PostgreSQL :5432  - dữ liệu người dùng và dữ liệu nghiệp vụ
	+-- Redis :6379       - OTP, token xác minh và dữ liệu tạm thời
	+-- SMTP Gmail        - gửi email OTP
```

Trong Docker Compose, frontend gọi backend qua hostname `backend`. Backend gọi PostgreSQL qua hostname `db-postgre` và Redis qua hostname `redis`. Khi chạy trực tiếp ngoài Docker, các giá trị kết nối sẽ sử dụng `localhost` theo cấu hình trong `.env`.

## 3. Cấu trúc thư mục

### 3.1. File ở thư mục gốc

| File hoặc thư mục | Vai trò |
|---|---|
| `docker-compose.yml` | Khai báo các service PostgreSQL, Redis, backend và frontend; thiết lập port, volume, healthcheck và quan hệ phụ thuộc. |
| `Makefile` | Tập hợp các lệnh thường dùng để chạy môi trường, xem log, quản lý container và migration. |
| `README.md` | Giới thiệu dự án và hướng dẫn khởi đầu ở mức tổng quan. |
| `.env` | Cấu hình thực tế của máy hoặc môi trường chạy. File này chứa thông tin nhạy cảm và không được commit. |
| `.env.example` | Mẫu các biến môi trường cần thiết để tạo `.env` mới. |
| `.devcontainer/` | Cấu hình môi trường phát triển trong Dev Container nếu nhóm sử dụng VS Code Dev Containers. |
| `.github/` | Cấu hình và tài nguyên liên quan đến GitHub của dự án. |
| `docs/` | Tài liệu yêu cầu, thiết kế, quy trình, sprint và hướng dẫn kỹ thuật. |

### 3.2. Backend

| File hoặc thư mục | Vai trò |
|---|---|
| `backend/main.py` | Entry point của FastAPI. Khởi tạo lifecycle, kết nối Redis, tạo admin mặc định, đăng ký router và exception handler. |
| `backend/admin.py` | Tạo hoặc cập nhật tài khoản developer/admin từ biến môi trường khi backend khởi động. |
| `backend/requirements.txt` | Danh sách package Python của backend. |
| `backend/Dockerfile` | Tạo image Python 3.11, cài package và khởi chạy qua `entrypoint.sh`. |
| `backend/entrypoint.sh` | Chạy `alembic upgrade head` trước khi khởi động Uvicorn. |
| `backend/alembic.ini` | Cấu hình vị trí script migration và logging của Alembic. URL cơ sở dữ liệu được ghi đè trong `alembic/env.py`. |
| `backend/alembic/` | Mã và lịch sử migration của database. |
| `backend/app/api/` | Các router và dependency của API. |
| `backend/app/core/` | Cấu hình, database, Redis, bảo mật, logger và xử lý exception dùng chung. |
| `backend/app/crud/` | Tầng truy vấn và thao tác dữ liệu với database. |
| `backend/app/helper/` | Các helper dùng chung, hiện có xử lý OTP và gửi email. |
| `backend/app/models/` | Các model SQLAlchemy ánh xạ với bảng database. |
| `backend/app/schemas/` | Các schema Pydantic cho request, response, token và lỗi nghiệp vụ. |
| `backend/app/services/` | Tầng nghiệp vụ, nằm giữa endpoint và CRUD/helper. |
| `backend/tests/` | Vị trí dành cho test backend; hiện cần tiếp tục bổ sung test nghiệp vụ và API. |

### 3.3. Backend API và dependency

| File | Vai trò |
|---|---|
| `backend/app/api/v1/api.py` | Gom router của `auth`, `users`, `otp` và `dev` dưới prefix `/api/v1`. |
| `backend/app/api/deps.py` | Đọc JWT bearer token, xác định user hiện tại và kiểm tra quyền developer. |
| `backend/app/api/v1/endpoints/auth.py` | Endpoint đăng nhập và cấp access token. |
| `backend/app/api/v1/endpoints/users.py` | Đăng ký, lấy danh sách user có phân trang và lấy thông tin user hiện tại. |
| `backend/app/api/v1/endpoints/otp.py` | Gửi OTP và xác minh OTP cho email. |
| `backend/app/api/v1/endpoints/dev.py` | API dành cho developer: xem thông tin hệ thống, health check và cấp quyền admin. |
| `backend/app/api/v1/endpoints/__init__.py` | Khởi tạo package endpoint. |
| `backend/app/api/v1/__init__.py` | Khởi tạo package API v1. |
| `backend/app/api/__init__.py` | Khởi tạo package API. |

### 3.4. Backend core, dữ liệu và nghiệp vụ

| File | Vai trò |
|---|---|
| `backend/app/core/config.py` | Đọc và kiểm tra cấu hình từ `.env`; tạo URL PostgreSQL và Redis khi cần. |
| `backend/app/core/database.py` | Tạo async SQLAlchemy engine, connection pool, session factory và dependency `get_db`. |
| `backend/app/core/redis.py` | Tạo Redis client bất đồng bộ, ping khi khởi động và đóng kết nối khi shutdown. |
| `backend/app/core/security.py` | Hash/verify mật khẩu bằng bcrypt và tạo JWT access token. |
| `backend/app/core/exceptions.py` | Định nghĩa lỗi ứng dụng và các handler lỗi HTTP, validation và lỗi chưa xử lý. |
| `backend/app/core/logger.py` | Cấu hình logger dùng chung. |
| `backend/app/models/base.py` | Base model được Alembic sử dụng để lấy metadata. |
| `backend/app/models/user_model.py` | Model bảng `users`, gồm email, nickname, mật khẩu đã hash, trạng thái kích hoạt và quyền developer. |
| `backend/app/crud/base.py` | CRUD cơ sở dùng lại cho các model. |
| `backend/app/crud/user_crud.py` | Truy vấn và tạo dữ liệu user. |
| `backend/app/crud/developer_crud.py` | Các thao tác dữ liệu liên quan đến developer. |
| `backend/app/services/auth_service.py` | Xác thực đăng nhập, cấp token, tạo OTP và xác minh OTP. |
| `backend/app/services/user_service.py` | Đăng ký user và lấy danh sách user. |
| `backend/app/services/dev_service.py` | Health check database/Redis và cập nhật quyền developer. |
| `backend/app/helper/otp.py` | Sinh email HTML, gửi OTP qua SMTP Gmail và kiểm tra token sau OTP. |
| `backend/app/schemas/common.py` | Wrapper response dùng chung. |
| `backend/app/schemas/token_schema.py` | Schema access token và các lỗi xác thực. |
| `backend/app/schemas/user_schema.py` | Schema tạo, trả về và phân trang user. |
| `backend/app/schemas/otp_schema.py` | Schema OTP và lỗi OTP. |
| `backend/app/schemas/dev_schema.py` | Schema thông tin hệ thống developer. |

### 3.5. Migration

| File hoặc thư mục | Vai trò |
|---|---|
| `backend/alembic/env.py` | Kết nối Alembic với async database URL và metadata của SQLAlchemy. |
| `backend/alembic/script.py.mako` | Template tạo migration mới. |
| `backend/alembic/README` | Ghi chú mặc định của Alembic. |
| `backend/alembic/versions/0164fe70099c_initial_async_tables.py` | Tạo bảng `users` và các index ban đầu. |
| `backend/alembic/versions/2ac5599a1353_add_nickname_column.py` | Thêm cột `nickname` vào bảng `users`. |

### 3.6. Frontend

| File hoặc thư mục | Vai trò |
|---|---|
| `frontend/package.json` | Khai báo script npm và dependency React, React Router, TypeScript, Vite. |
| `frontend/Dockerfile` | Tạo image Node 18 Alpine, cài package và chạy Vite. |
| `frontend/index.html` | HTML entry point của ứng dụng Vite. |
| `frontend/vite.config.ts` | Cấu hình plugin React, port 3000 và proxy `/api` tới backend. |
| `frontend/tsconfig.json` | Cấu hình TypeScript strict cho source frontend. |
| `frontend/tsconfig.node.json` | Cấu hình TypeScript cho các file cấu hình chạy trên Node. |
| `frontend/src/main.tsx` | Mount React application và nạp CSS toàn cục. |
| `frontend/src/App.tsx` | Component gốc; hiện vẫn là màn hình template cần thay bằng ứng dụng thực tế. |
| `frontend/src/styles/globals.css` | CSS toàn cục và font mặc định hiện tại. |
| `frontend/src/components/` | Vị trí dành cho component dùng lại; hiện chưa có component nghiệp vụ. |
| `frontend/src/pages/` | Vị trí dành cho các page và route; hiện chưa có page nghiệp vụ. |
| `frontend/src/assets/` | Vị trí dành cho hình ảnh, font hoặc tài nguyên tĩnh. |

## 4. Công cụ và công nghệ

### 4.1. Công cụ phát triển

| Công cụ | Mục đích |
|---|---|
| Git | Quản lý phiên bản và làm việc theo nhánh. |
| GitHub | Lưu repository, theo dõi issue, pull request và project board. |
| Docker | Đóng gói backend/frontend và tạo môi trường nhất quán. |
| Docker Compose | Chạy nhiều service cùng lúc. |
| Make | Viết lệnh ngắn cho các thao tác phát triển lặp lại. |
| VS Code | IDE được khuyến nghị cho dự án. |
| Python 3.11 | Runtime của backend và image backend. |
| Node.js 18 | Runtime của frontend và image frontend. |
| npm | Cài package và chạy script frontend. |

### 4.2. Backend package

| Package | Mục đích |
|---|---|
| FastAPI | Xây dựng HTTP API và dependency injection. |
| Uvicorn | ASGI server chạy FastAPI. |
| Pydantic và pydantic-settings | Validation dữ liệu và đọc cấu hình. |
| SQLAlchemy asyncio | ORM và truy cập PostgreSQL bất đồng bộ. |
| asyncpg | PostgreSQL driver bất đồng bộ. |
| Alembic | Migration database. |
| python-jose | Tạo và giải mã JWT. |
| passlib và bcrypt | Hash và kiểm tra mật khẩu. |
| python-multipart | Nhận form data, cần cho OAuth2 password form. |
| redis | Redis client bất đồng bộ. |

### 4.3. Frontend package

| Package | Mục đích |
|---|---|
| React | Xây dựng giao diện theo component. |
| React DOM | Render React vào trình duyệt. |
| React Router DOM | Điều hướng giữa các page. |
| TypeScript | Kiểm tra kiểu tĩnh cho frontend. |
| Vite | Dev server và bundler. |
| `@vitejs/plugin-react` | Tích hợp React với Vite. |
| `@types/react`, `@types/react-dom` | Type definition cho React và React DOM. |

## 5. Cấu hình môi trường

Tạo file `.env` từ `.env.example` trước khi chạy. Không commit giá trị thật của password, secret key hoặc thông tin email.

| Biến | Ý nghĩa |
|---|---|
| `PROJECT_NAME` | Tên ứng dụng hiển thị trong cấu hình backend. |
| `COMPOSE_PROJECT_NAME` | Tên project Docker Compose. |
| `ADMIN_USERNAME` | Nickname tài khoản developer/admin mặc định. |
| `ADMIN_EMAIL` | Email đăng nhập của developer/admin mặc định. |
| `ADMIN_PASSWORD` | Mật khẩu developer/admin mặc định và mật khẩu SMTP Gmail hiện tại. |
| `HOST_PORT_FRONTEND` | Port frontend trên máy host, mặc định `3000`. |
| `HOST_PORT_BACKEND` | Port backend trên máy host, mặc định `8000`. |
| `HOST_PORT_DB` | Port PostgreSQL trên máy host. Compose mặc định sử dụng `15432`; `.env.example` hiện đặt `5432`, nên cần thống nhất trước khi chạy local. |
| `HOST_PORT_REDIS` | Port Redis trên máy host, mặc định `6379`. |
| `POSTGRES_USER` | Tên user PostgreSQL. |
| `POSTGRES_PASSWORD` | Mật khẩu PostgreSQL. |
| `POSTGRES_DB` | Tên database. |
| `REDIS_PASSWORD` | Mật khẩu Redis. |
| `API_V1_STR` | Prefix API, hiện là `/api/v1`. |
| `VITE_API_URL` | URL API frontend dự kiến sử dụng. Proxy Vite hiện xử lý request bắt đầu bằng `/api`. |
| `SECRET_KEY` | Khóa ký JWT; cần thay bằng giá trị đủ dài và riêng cho từng môi trường. |
| `ALGORITHM` | Thuật toán JWT, hiện là `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Thời gian sống của access token theo phút. |

Lưu ý về email: `backend/app/helper/otp.py` đang dùng SMTP Gmail tại `smtp.gmail.com:587`, sử dụng `ADMIN_EMAIL` và `ADMIN_PASSWORD`. Khi dùng Gmail thực tế, nên dùng App Password thay vì mật khẩu tài khoản chính và nên tách riêng biến `SMTP_USER`, `SMTP_PASSWORD` trong một bước cấu hình tiếp theo.

## 6. Cách khởi chạy môi trường phát triển

### 6.1. Yêu cầu cài đặt

- Git.
- Docker Desktop có Docker Compose.
- Make nếu muốn dùng các lệnh trong `Makefile`. Trên Windows có thể chạy lệnh tương đương bằng `docker compose` hoặc sử dụng Git Bash/WSL.

### 6.2. Khởi tạo lần đầu

```bash
git clone <repository-url>
cd group2_ai66a_se
cp .env.example .env
```

Sau đó chỉnh các giá trị trong `.env`, đặc biệt là database password, Redis password, JWT secret và thông tin admin.

### 6.3. Chạy toàn bộ hệ thống

```bash
make dev
```

Hoặc chạy trực tiếp:

```bash
docker compose up -d --build
```

Các địa chỉ chính:

| Thành phần | Địa chỉ mặc định |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend root | `http://localhost:8000/` |
| Swagger UI | `http://localhost:8000/docs` |
| OpenAPI JSON | `http://localhost:8000/openapi.json` |
| PostgreSQL | `localhost:15432` theo Compose mặc định |
| Redis | `localhost:6379` |

Khi container backend khởi động, `entrypoint.sh` tự chạy migration lên revision mới nhất rồi mới chạy Uvicorn. Tài khoản admin cũng được tạo hoặc cập nhật tự động từ `.env`.

## 7. Các lệnh Make quan trọng

| Lệnh | Tác dụng |
|---|---|
| `make dev` | Build và khởi động toàn bộ môi trường ở chế độ nền. |
| `make dev-down` | Dừng và xóa các container của môi trường dev. |
| `make dev-refresh` | Dừng, xóa orphan container và tạo lại toàn bộ stack. |
| `make ps` | Xem trạng thái các service. |
| `make logs-dev` | Theo dõi log của tất cả service. |
| `make logs-backend` | Theo dõi log backend. |
| `make logs-frontend` | Theo dõi log frontend. |
| `make logs-db` | Theo dõi log PostgreSQL. |
| `make env-backend` | Recreate backend sau khi sửa `.env`. |
| `make env-frontend` | Recreate frontend sau khi sửa `.env`. |
| `make env-all` | Recreate backend và frontend sau khi sửa `.env`. |
| `make db-migrate msg="mo ta thay doi"` | Tạo migration mới bằng Alembic autogenerate. |
| `make db-upgrade` | Áp dụng migration mới nhất. |
| `make clean` | Xóa container và volume database; dữ liệu local sẽ mất. Chỉ dùng khi cần reset môi trường. |

## 8. API nền hiện có

API prefix hiện tại là `/api/v1`.

| Method | Endpoint | Mục đích | Xác thực |
|---|---|---|---|
| `POST` | `/users/register` | Đăng ký user mới. | Không |
| `GET` | `/users` | Lấy danh sách user có `page` và `limit`. | Bearer token |
| `GET` | `/users/me` | Lấy thông tin user hiện tại. | Bearer token |
| `POST` | `/auth/login` | Đăng nhập bằng OAuth2 form và nhận JWT. | Không |
| `POST` | `/otp/send` | Gửi OTP cho `verify-email` hoặc `change-password`. | Không |
| `POST` | `/otp/verify` | Kiểm tra OTP và nhận verification token. | Không |
| `GET` | `/dev/system-info` | Lấy thông tin hệ thống. | Developer |
| `GET` | `/dev/health` | Kiểm tra kết nối PostgreSQL và Redis. | Developer |
| `PATCH` | `/dev/set-admin` | Cấp quyền developer cho user theo email. | Developer |

`POST /auth/login` sử dụng form OAuth2, trong đó field đăng nhập là `username` nhưng giá trị cần truyền là email. Các endpoint có bảo vệ sử dụng header `Authorization: Bearer <access_token>`.

## 9. Quy trình phát triển được khuyến nghị

1. Đọc yêu cầu trong `docs/requirements.md`, thiết kế trong `docs/design.md` và các tài liệu sprint liên quan trước khi code.
2. Tạo branch riêng cho một feature hoặc một bug fix.
3. Nếu thay đổi database, cập nhật model trước, sau đó tạo migration:

   ```bash
   make db-migrate msg="Mo ta thay doi schema"
   make db-upgrade
   ```

4. Backend mới nên tuân theo luồng `endpoint -> service -> crud -> model`.
5. Request và response nên khai báo bằng Pydantic schema trong `backend/app/schemas/`.
6. Logic dùng chung cho xác thực, database, Redis và lỗi nên đặt trong `backend/app/core/`.
7. Frontend nên tổ chức theo `pages`, `components`, API client và các kiểu dữ liệu riêng; không đặt toàn bộ logic vào `App.tsx`.
8. Chạy kiểm tra trước khi tạo pull request:

   ```bash
   docker compose ps
   docker compose logs backend
   ```

9. Kiểm tra Swagger tại `http://localhost:8000/docs` và kiểm thử luồng chính bằng request thực tế.
10. Không commit `.env`, secret, password, token hoặc dữ liệu cá nhân.

## 10. Việc cần tiếp tục triển khai

### Backend

- Bổ sung các model cho sản phẩm, nguồn thương mại điện tử, lịch sử giá, ngưỡng cảnh báo và thông báo.
- Thiết kế CRUD và service cho nghiệp vụ theo dõi sản phẩm.
- Xây dựng cơ chế lấy dữ liệu giá định kỳ từ các nguồn được yêu cầu.
- Thêm worker hoặc scheduler cho việc cập nhật giá tự động.
- Xây dựng logic so sánh giá hiện tại với ngưỡng người dùng đặt.
- Gửi thông báo khi giá đạt điều kiện, có thể mở rộng từ email sang các kênh khác.
- Bổ sung API quản lý sản phẩm theo dõi, lịch sử giá và cấu hình cảnh báo.
- Bổ sung phân quyền chi tiết nếu hệ thống cần nhiều vai trò hơn developer/user.
- Hoàn thiện test unit, test service và test API.
- Thêm health endpoint công khai phù hợp cho Docker healthcheck; hiện Compose kiểm tra `/health` trong khi API developer hiện khai báo `/api/v1/dev/health`, cần thống nhất trước khi dùng healthcheck tự động.

### Frontend

- Thay nội dung mẫu trong `frontend/src/App.tsx` bằng router và layout thực tế.
- Xây dựng các page đăng ký, đăng nhập, xác minh OTP và quản lý tài khoản.
- Xây dựng dashboard sản phẩm đang theo dõi.
- Xây dựng biểu đồ lịch sử giá và màn hình thiết lập ngưỡng cảnh báo.
- Tạo API client dùng prefix `/api/v1`, xử lý JWT và trạng thái đăng nhập.
- Thêm loading state, empty state, error state và thông báo thành công/thất bại.
- Tổ chức component trong `frontend/src/components/` và page trong `frontend/src/pages/`.
- Bổ sung kiểm thử component và kiểm thử luồng người dùng.

### Hạ tầng và chất lượng

- Thống nhất port database giữa `.env.example` và `docker-compose.yml`.
- Tách cấu hình SMTP khỏi cấu hình tài khoản admin.
- Đổi các secret mẫu thành secret riêng ở từng môi trường.
- Bổ sung CI để chạy build, test, lint và kiểm tra migration.
- Bổ sung tài liệu API và quy trình release/deployment.
- Xác định chính sách lưu trữ, backup và reset volume PostgreSQL/Redis.

## 11. Điểm cần lưu ý khi tiếp nhận dự án

- Đây là skeleton có nền tảng backend và hạ tầng, chưa phải sản phẩm hoàn chỉnh.
- Frontend chưa kết nối các luồng nghiệp vụ thực tế.
- API OTP hiện gửi email trực tiếp qua Gmail và phụ thuộc cấu hình SMTP hợp lệ.
- `ADMIN_PASSWORD` hiện được dùng trong cả việc tạo admin và gửi SMTP; cần tách hai mục đích này khi đưa lên môi trường thật.
- `make clean` xóa volume database và Redis, vì vậy không dùng trên dữ liệu cần giữ lại.
- Migration phải được commit cùng với thay đổi model để các môi trường khác có thể dựng lại cùng schema.
- Khi thêm model mới, cần bảo đảm model được import vào metadata mà Alembic sử dụng để `--autogenerate` nhận diện đúng.

## 12. Tài liệu liên quan

- `README.md`: giới thiệu và khởi đầu dự án.
- `docs/requirements.md`: yêu cầu chức năng và phi chức năng.
- `docs/design.md`: thiết kế hệ thống.
- `docs/SETUP.md`: hướng dẫn setup nếu có cập nhật riêng cho môi trường.
- `docs/process.md`: quy trình làm việc của nhóm.
- `docs/workflow.md`: workflow phát triển.
- `docs/definition-of-done.md`: tiêu chí hoàn thành công việc.
- `docs/traceability.md`: liên kết giữa yêu cầu và phần triển khai.
- `docs/sprint-log/`: nhật ký các sprint.
- `docs/survey/`: tài liệu khảo sát và phân tích người dùng.
