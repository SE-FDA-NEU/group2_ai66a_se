# Milestone 4 Testing

## US01 — Add a product to the watchlist

### Review of issue #81 tests

Issue #81's `WatchlistPage.test.tsx` covers the frontend limit state: the add
button is disabled at 10 products, remains enabled at 9, and the modal displays
a backend validation error. Those tests verify the UI behavior; they do not
exercise product creation, marketplace fetching, or the backend grace-period
logic. The backend unit cases below cover those service rules and the actual
10th-product acceptance boundary.

These unit tests exercise `WatchlistService.add_product` with mocked database,
marketplace, and CRUD dependencies. They do not start the API server or connect
to a real database, Redis instance, or marketplace API.

| ID | Story | Input | Expected result | Test kind / pytest test |
|---|---|---|---|---|
| US01-TC-001 | As a user, I want to add a product link and see its current price so I can start tracking it. | A valid Amazon product URL for an item not in the product store; watchlist has capacity. | Marketplace is fetched once, the product is stored with its first price, tracking is created, and the transaction commits. | Unit — `test_new_product_is_fetched_and_created_with_initial_price` |
| US01-TC-002 | As a user, I want the watchlist to enforce its 10-product limit so the service rejects additions over capacity. | A valid product URL when the user already tracks 10 products. | `WATCHLIST_LIMIT_REACHED` is raised, the transaction rolls back, and nothing is committed. | Unit — `test_tracking_limit_is_enforced_by_backend` |
| US01-TC-003 | As a user, I want to fill the watchlist up to its 10-product limit. | A valid product URL when the user tracks 9 products. | The tenth product is accepted, tracking is created, and the transaction commits without rollback. | Unit — `test_tracking_limit_allows_tenth_product` |
| US01-TC-004 | As a user, I want a recently untracked product reused during its 7-day grace period. | A product untracked for 6 days. | Stored product data is reused without a marketplace fetch, tracking resumes, and the untracked timestamp is cleared. | Unit — `test_product_untracked_less_than_seven_days_is_reused_without_marketplace_call` |
| US01-TC-005 | As a user, I want stale product data refreshed after the 7-day grace period. | A product untracked for exactly 7 days. | Marketplace data is fetched and the stored product is refreshed before tracking resumes. | Unit — `test_product_untracked_for_seven_days_is_refreshed` |

Run the US01 watchlist service tests from the repository root:

```powershell
docker compose run --rm --no-deps --build --entrypoint python backend -m pytest tests/unit/test_watchlist_service.py -q
```

## Regression-check evidence

The requested mutation check temporarily changes the service's 10-product
guard from `>= 10` to `> 10`; `US01-TC-002` should fail because the 11th
product would no longer be rejected. The original guard must then be restored
and the US01 suite rerun.

This check could not be completed in the current environment. Docker was
unavailable (`permission denied` connecting to the Docker Desktop engine), and
the local Python environment is missing `asyncpg`, so pytest cannot collect the
service tests. No mutation was left in the source. Rerun the command above in an
environment with Docker access to record the failing mutation run and the
passing restored run here.

## Issue #185 — Thông báo

Phần kiểm thử bổ sung US02 cho email theo ngưỡng giá, toast 5 giây, đã xem/reload và lịch sử 10 mục: [báo cáo #185](testing/issue185.md). Ma trận US02 từ main: [US02_TEST_CASES.md](../backend/tests/US02_TEST_CASES.md).

Chạy toàn bộ từ root bằng `pytest` sau khi cài Python dependencies và `npm ci --prefix frontend` theo [SETUP.md](SETUP.md). Với Docker, chạy backend bằng `docker compose exec -w /workspace backend python -m pytest backend/tests -q`; test React chạy riêng trong container frontend vì image backend chưa có Node.js.
