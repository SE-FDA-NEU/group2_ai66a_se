# Milestone 2

```
Team:           Team 02 - Automated E-commerce Price Tracker
Topic:          A3
Members:        Nguyen Trong Dai (11247268), Mai Huy Dang (11247269)
                Pham Huu Gia An (11247254), Mai Tuan Manh (11247318),
                Le Ba Phong (11247339)
Product Owner:  @Dai-nguyen1506
Scrum Master:   @happyhusky3303  (Sprint 2)

Repository:     https://github.com/SE-FDA-NEU/group2_ai66a_se.git;
Project board:  https://github.com/orgs/SE-FDA-NEU/projects/19/views/1;
Pull Request:   ...
Merge commit:   ...

Submitted by:   Nguyen Trong Dai
```

## 1. Architecture

Describe a 4-component architecture:
- **Browser (React 18 SPA)**: Vite dev server on port 3000, proxies `/api` to backend:8000. Pages: Landing `/`, Login `/login`, Register `/register`. Uses Axios with JWT Bearer token interceptor.
- **Web Application (FastAPI)**: Python 3.11 + FastAPI 0.141 + Uvicorn. Async REST API at `/api/v1`. Handles auth (JWT HS256, bcrypt, Google OAuth2), watchlist CRUD, OTP email verification via Redis + aiosmtplib. External: RapidAPI Real-Time Amazon Data for product lookup.
- **PostgreSQL 15**: 4 tables (users, products, price_history, tracked_products). Managed by Alembic async migrations. Connection pool via asyncpg (pool_size=20, max_overflow=10).
- **Redis 7**: Session store for OTP codes (TTL 300s), verified action tokens. Used for rate limiting OTP attempts.

All 4 services run in Docker Compose on a shared default network.

Include a text-based architecture diagram like:
```
┌─────────────┐       HTTP        ┌──────────────────┐      asyncpg     ┌──────────────┐
│   Browser   │  ── /api/v1 ──>  │  FastAPI (py311) │  ────────────>  │ PostgreSQL 15│
│  React 18   │  <── JSON ────   │  Uvicorn :8000   │  <────────────  │   :5432      │
│  Vite :3000 │                  │                  │                 └──────────────┘
└─────────────┘                  │                  │      redis-py    ┌──────────────┐
                                 │                  │  ────────────>  │   Redis 7    │
                                 │                  │  <────────────  │   :6379      │
                                 └──────────────────┘                 └──────────────┘
                                         │
                                         │ httpx (async)
                                         v
                                 ┌──────────────────┐
                                 │   RapidAPI       │
                                 │ Real-Time Amazon │
                                 └──────────────────┘
```

> Note: Include a placeholder for the architecture diagram image: `> 📷 See [architecture-diagram.png](images/architecture-diagram.png) for the visual version.`

## 2. Data Model

For EACH of the 4 tables, provide:
- Purpose
- A markdown table with columns: Column, Type, Nullable, Default/Constraint, Description
- Business rules it enforces

### Table: `users`
| Column | Type | Nullable | Default / Constraint | Description |
|--------|------|----------|---------------------|-------------|
| id | Integer | No | PK, indexed | Unique user ID |
| email | String | No | Unique, indexed | Login email |
| nickname | String | No | — | Display name |
| password_hashed | String | Yes | — | Bcrypt hash (null for Google-only) |
| auth_provider | String | No | Default `'email'` | `'email'`, `'google'`, or `'both'` |
| google_sub | String | Yes | Unique, indexed | Google OAuth subject ID |
| is_activate | Boolean | No | Default `true` | Account active flag |
| is_developer | Boolean | No | Default `false` | Admin/developer flag |
| created_at | DateTime(tz) | Yes | `now()` | Creation timestamp |
| updated_at | DateTime(tz) | Yes | on update `now()` | Last update timestamp |

Constraint: `CHECK (password_hashed IS NOT NULL OR google_sub IS NOT NULL)` — every account must have at least one auth method.

### Table: `products`
| Column | Type | Nullable | Default / Constraint | Description |
|--------|------|----------|---------------------|-------------|
| id | BigInteger | No | PK, autoincrement | Product ID |
| marketplace | String(20) | No | — | Platform (e.g. `'amazon'`) |
| external_id | String(64) | No | — | Platform product ID (ASIN) |
| url | Text | No | — | Canonical product URL |
| name | Text | No | — | Product title |
| image_url | Text | No | — | Main photo URL |
| brand | String(255) | Yes | — | Brand/manufacturer |
| shop_name | String(255) | Yes | — | Seller name |
| product_rating | Numeric(3,2) | Yes | — | Star rating (0–5) |
| review_count | Integer | No | Default `0` | Number of ratings |
| current_price | Numeric(12,2) | No | — | Latest price |
| original_price | Numeric(12,2) | Yes | — | Strikethrough price |
| currency | String(10) | No | — | Currency code |
| in_stock | Boolean | No | Default `true` | Availability |
| tracked_by_count | Integer | No | Default `0` | Active tracker count |
| price_low | Numeric(12,2) | No | — | All-time lowest |
| price_high | Numeric(12,2) | No | — | All-time highest |
| untracked_since | DateTime(tz) | Yes | — | When tracker count hit 0 |
| top_reviews | JSONB | No | Default `'[]'::jsonb` | Cached reviews |
| last_refreshed_at | DateTime(tz) | No | Default `now()` | Last API refresh |

Constraints: `UNIQUE(marketplace, external_id)`, Index on `untracked_since` for cleanup.

### Table: `price_history`
Append-only time-series log.
| Column | Type | Nullable | Default / Constraint | Description |
|--------|------|----------|---------------------|-------------|
| id | BigInteger | No | PK, autoincrement | Entry ID |
| product_id | BigInteger | No | FK → products.id CASCADE | Parent product |
| price | Numeric(12,2) | No | — | Price observation |
| recorded_at | DateTime(tz) | No | Default `now()` | Timestamp |

Index: `(product_id, recorded_at DESC)` for efficient time-series queries.

### Table: `tracked_products`
User-to-product watchlist association.
| Column | Type | Nullable | Default / Constraint | Description |
|--------|------|----------|---------------------|-------------|
| user_id | Integer | No | Composite PK, FK → users.id CASCADE | Tracking user |
| product_id | BigInteger | No | Composite PK, FK → products.id CASCADE | Tracked product |
| target_price | Numeric(12,2) | Yes | — | Desired buy price |
| buy_when_good | Boolean | No | Default `false` | Alert on "Good price" label |
| created_at | DateTime(tz) | No | Default `now()` | When tracking started |

Composite PK `(user_id, product_id)` prevents duplicate tracking.

Add an ERD placeholder: `> 📷 See [erd.png](images/erd.png) for the Entity-Relationship Diagram.`

## 3. API Design

List the following endpoints in a table format for EACH group. For each endpoint provide: Method, Path, Auth, Request Body/Params, Success Response, Error Codes.

### 3.1 Authentication (`/api/v1/auth`)

| # | Method | Path | Auth | Input | Success | Errors |
|---|--------|------|------|-------|---------|--------|
| 1 | POST | `/api/v1/auth/login` | None | Form: `username`, `password` | `200 {access_token, token_type}` | `401 INVALID_LOGIN` |
| 2 | POST | `/api/v1/auth/google` | None | JSON: `{id_token}` | `200 {access_token, token_type}` | `401 GOOGLE_AUTH_FAILED`, `401 INVALID_LOGIN` |
| 3 | POST | `/api/v1/auth/register` | None | Query: `verify_token`; JSON: `{email, nickname, password}` | `201 ApiResponse<UserResponse>` | `400 OTP_EXPIRED`, `400 EMAIL_ALREADY_EXISTS` |
| 4 | POST | `/api/v1/auth/reset-password` | None | Query: `email, new_password, verify_token` | `200 ApiResponse<null>` | `400 OTP_EXPIRED`, `404 USER_NOT_FOUND` |

### 3.2 OTP (`/api/v1/otp`)

| # | Method | Path | Auth | Input | Success | Errors |
|---|--------|------|------|-------|---------|--------|
| 5 | POST | `/api/v1/otp/send` | None | Query: `email, reason` | `200 ApiResponse<null>` | `400 EMAIL_ALREADY_EXISTS`, `404 USER_NOT_FOUND`, `500 EMAIL_SEND_FAILED` |
| 6 | POST | `/api/v1/otp/verify` | None | Query: `email, otp, reason` | `200 ApiResponse<{verified_token}>` | `400 OTP_EXPIRED`, `400 OTP_INVALID`, `400 OTP_LIMIT_EXCEEDED` |

### 3.3 User Profile (`/api/v1/user`)

| # | Method | Path | Auth | Input | Success | Errors |
|---|--------|------|------|-------|---------|--------|
| 7 | GET | `/api/v1/user/me` | Bearer | — | `200 ApiResponse<UserResponse>` | `401 UNAUTHORIZED` |
| 8 | PATCH | `/api/v1/user/me` | Bearer | JSON: `{nickname}` | `200 ApiResponse<UserResponse>` | `401 UNAUTHORIZED` |
| 9 | PATCH | `/api/v1/user/me/password` | Bearer | JSON: `{old_password, new_password}` | `200 ApiResponse<UserResponse>` | `400 INVALID_OLD_PASSWORD`, `401 UNAUTHORIZED` |

### 3.4 Watchlist (`/api/v1/watchlist`)

| # | Method | Path | Auth | Input | Success | Errors |
|---|--------|------|------|-------|---------|--------|
| 10 | POST | `/api/v1/watchlist` | Bearer | JSON: `{url, target_price?, buy_when_good}` | `201 ApiResponse<Product>` | `400 AMAZON_ONLY`, `400 INVALID_PRODUCT_LINK`, `400 WATCHLIST_LIMIT_REACHED`, `502 MARKETPLACE_UPSTREAM_ERROR`, `503 MARKETPLACE_UNAVAILABLE` |
| 11 | GET | `/api/v1/watchlist` | Bearer | — | `200 ApiResponse<ProductList>` | `401 UNAUTHORIZED` |
| 12 | DELETE | `/api/v1/watchlist/{product_id}` | Bearer | Path: `product_id` | `204 No Content` | `404 TRACKING_NOT_FOUND` |

### 3.5 Developer (`/api/v1/dev`)

| # | Method | Path | Auth | Input | Success | Errors |
|---|--------|------|------|-------|---------|--------|
| 13 | GET | `/api/v1/dev/system-info` | Bearer+Dev | — | `200 ApiResponse<SystemInfoData>` | `403 NOT_DEVELOPER` |
| 14 | GET | `/api/v1/dev/health` | Bearer+Dev | — | `200 ApiResponse<null>` | `503 DATABASE_ERROR`, `503 REDIS_ERROR` |
| 15 | PATCH | `/api/v1/dev/set-admin` | Bearer+Dev | Query: `email` | `200 ApiResponse<null>` | `503 USER_NOT_FOUND` |

## 4. Walking Skeleton

Describe the walking skeleton route: **`GET /api/v1/watchlist`** — it reads real data from a real PostgreSQL database and returns it to the browser.

### 4.1 End-to-end trace

1. **Browser**: User navigates to the watchlist page. React sends `GET /api/v1/watchlist` with `Authorization: Bearer <JWT>` header via Axios.
2. **Vite Proxy**: Dev server proxies `/api/*` requests to `http://backend:8000`.
3. **FastAPI Router** (`watchlist_router.py`): The `list_watchlist` endpoint receives the request.
4. **Dependency Injection** (`deps.py`): `get_current_user` extracts and validates JWT, queries `users` table to get the authenticated user. `get_db` provides an async SQLAlchemy session from the connection pool.
5. **Service Layer** (`watchlist_service.py`): `watchlist_service.list_products(db, user)` is called.
6. **CRUD/Database** (`tracked_product_crud.py`): Executes a JOIN query across `tracked_products`, `products`, and `price_history` tables with PostgreSQL aggregate functions:

```sql
SELECT products.*, tracked_products.target_price, tracked_products.buy_when_good,
       COALESCE(stats.distinct_days, 0) AS distinct_days,
       stats.median_price
FROM tracked_products
JOIN products ON products.id = tracked_products.product_id
LEFT OUTER JOIN (
    SELECT product_id,
           COUNT(DISTINCT CAST(recorded_at AS DATE)) AS distinct_days,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS median_price
    FROM price_history
    GROUP BY product_id
) AS stats ON stats.product_id = products.id
WHERE tracked_products.user_id = :user_id
ORDER BY products.id
```

7. **Business Logic**: The service computes price labels:
   - If `distinct_days < 7`: label = "Not enough data to assess"
   - If `current_price ≤ price_low × 1.05`: label = "Good price"
   - If `current_price > median_price × 1.10`: label = "Expensive - wait"
   - Otherwise: label = "Normal"
   - Fake discount detection: if marketplace claims discount but `current_price > median × 1.10`
8. **Response**: Serialized to `ApiResponse<ProductList>` JSON with HTTP 200, streamed back through Uvicorn → Vite proxy → Browser.

### 4.2 Proof

> 📷 See [walking-skeleton.png](images/walking-skeleton.png) — browser screenshot showing the watchlist page with the address bar visible.

## 5. Design Decisions (ADR)

### ADR-1: PostgreSQL over SQLite for the application database

| Aspect | Detail |
|--------|--------|
| **Context** | The application needs a relational database that supports concurrent async access, advanced aggregate functions (like `PERCENTILE_CONT` for median price calculation), and JSONB for storing structured review data. |
| **Options considered** | (A) SQLite — zero-config, file-based, good for prototyping. (B) PostgreSQL — full-featured RDBMS with advanced types and concurrency. |
| **Decision** | PostgreSQL 15 |
| **Rationale** | SQLite does not support `PERCENTILE_CONT`, has limited concurrent write support (problematic with async FastAPI), and lacks JSONB. PostgreSQL natively supports all of these. Docker Compose makes deployment trivial. |
| **What would change this** | If the project needed to run as a single-file desktop app without Docker, SQLite would be reconsidered. |

### ADR-2: FastAPI over Django for the backend framework

| Aspect | Detail |
|--------|--------|
| **Context** | The backend needs to serve a REST API with async database access (asyncpg), integrate with external APIs (RapidAPI) using async HTTP, and handle real-time OTP flows through Redis. |
| **Options considered** | (A) Django + DRF — mature ecosystem, built-in ORM and admin. (B) FastAPI — async-first, Pydantic validation, automatic OpenAPI docs. (C) Flask — lightweight but sync by default. |
| **Decision** | FastAPI |
| **Rationale** | FastAPI's native async support allows non-blocking database queries (asyncpg), Redis operations, and external API calls (httpx). Pydantic v2 integration provides request/response validation with zero boilerplate. Auto-generated Swagger UI at `/docs` accelerates frontend development. Django's ORM is sync-first and would require workarounds. |
| **What would change this** | If the project needed a built-in admin panel or content management, Django's batteries-included approach would be more productive. |

## 6. What Changed Since Milestone 1

### Change 1: Authentication scope expanded from Google-only to multi-provider

| Aspect | Detail |
|--------|--------|
| **M1 design** | Only "Sign in with Google" was planned. No email registration, no OTP, no password reset. |
| **Current design** | Full email registration with OTP verification (6-digit code, 5-min TTL, max 5 attempts), email/password login, Google OAuth login, and account linking (`auth_provider` can be `'email'`, `'google'`, or `'both'`). Password reset via OTP flow added. |
| **Reason** | Sprint 1 feedback: relying solely on Google excludes users who prefer email accounts. Also needed for the course requirement of demonstrating a complete auth walking skeleton. |
| **Impact** | `users` table gained `auth_provider`, `google_sub`, `nickname` columns. `password_hashed` changed from NOT NULL to nullable. 2 new API groups added (`/otp`, `/auth/register`, `/auth/reset-password`). Redis introduced for OTP session management. US04 story points increased from 3 → 8. |

### Change 2: Marketplace support changed from Shopee/TikTok Shop to Amazon

| Aspect | Detail |
|--------|--------|
| **M1 design** | Primary marketplaces were Shopee and TikTok Shop. Amazon was explicitly rejected (BR9). |
| **Current design** | Amazon is used as the primary marketplace for Sprint 2 development and testing, via RapidAPI Real-Time Amazon Data API. Shopee/TikTok Shop adapters are deferred to Sprint 3+. |
| **Reason** | No reliable public API exists for Shopee/TikTok Shop product data (scraping violates ToS and is unstable). RapidAPI provides a clean REST endpoint for Amazon with structured JSON responses, enabling the team to build and test the full price-tracking pipeline end-to-end without scraping concerns. |
| **Impact** | `amazon_link_parser.py` replaces the planned Shopee parser. `rapidapi_client.py` added as the marketplace adapter. BR9 updated with a dev/test note. `products.marketplace` stores `'amazon'` instead of `'shopee'`. The adapter interface remains the same (`ProductMarketplace` schema), so Shopee/TikTok adapters can be plugged in later. |
