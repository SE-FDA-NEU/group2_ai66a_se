# Milestone 4 Testing

## US04 — Register and sign in with Google or Email

### What we test, and why

| Layer | Test | Why |
|---|---|---|
| `backend/app/services/auth_service.py` (authentication and OTP services) | Integration tests through the FastAPI routes, with fake Redis and users | Covers the user-visible authentication flows and OTP business rules without external services. |
| `backend/app/api/v1/endpoints/` (routes) | FastAPI `AsyncClient` with `ASGITransport` | Checks response status and payloads without starting a server. |
| Persistence and external providers | Fakes/mocks; no real database, Redis, SMTP, or Google verification | Keeps the suite deterministic and runnable on a clean machine. |

The authentication and OTP rules carry the highest risk because errors can block
registration or password recovery, or permit an invalid OTP. The suite checks
successful flows, rejected input, the five-attempt limit, and the five-minute
OTP expiration boundary. UI presentation is not covered by these backend tests.

### Test cases for US04

| ID | Story | Input | Expected result | Kind / pytest test |
|---|---|---|---|---|
| US04-TC-001 | As a user, I want to register and sign in with email so I can access my account. | New email; request OTP, verify the returned test OTP, register, then log in. | OTP verification and registration succeed; login returns an access token. | Integration — `test_us04_tc_001_full_email_registration_and_login_flow` |
| US04-TC-002 | As a user, I want to sign in with Google so I can access my account. | A valid mocked Google token for a new user. | A Google account is created and an access token is returned. | Integration — `test_us04_tc_002_google_login_new_user` |
| US04-TC-003 | As a user, I want to recover my password with email OTP so I can regain access. | Existing email; request and verify OTP, set a new password, then log in. | Password reset succeeds and the new password can sign in. | Integration — `test_us04_tc_003_forgot_password_flow` |
| US04-TC-004 | As a user, I want OTP verification attempts limited to five so repeated guesses are refused. | Submit an incorrect OTP five times, then submit again. | Attempts 1–5 return `OTP_INVALID`; attempt 6 returns `OTP_LIMIT_EXCEEDED`. | Integration — `test_us04_tc_004_otp_fifth_wrong_attempt_is_allowed_then_limit_exceeded` |
| US04-TC-010 | As a user, I want an OTP to remain usable during its five-minute validity period. | Submit the correct OTP 299 seconds after it is issued. | Verification succeeds and returns a verification token. | Integration — `test_us04_tc_010_otp_is_valid_just_before_five_minute_expiry` |
| US04-TC-011 | As a user, I want expired OTPs refused after five minutes. | Submit the correct OTP at the 300-second expiry boundary. | Verification is rejected with `OTP_EXPIRED`. | Integration — `test_us04_tc_011_otp_expires_at_five_minute_limit` |

### Automated tests

Each case above maps to a pytest test in
`backend/tests/integration/test_auth_endpoint.py`; the ID appears in the test
name. They use a deterministic fake Redis implementation that honors key
expirations. Run the US04 suite from the repository root with:

```bash
python -m pytest backend/tests/integration/test_auth_endpoint.py -q
```

These tests use an in-process ASGI client, fake Redis/user storage, and mocked
email and Google verification. They do not start a server or use a real
database or external provider.

### What the tests found

The five-minute cases check both sides of the expiry boundary (299 seconds and
300 seconds). The five-attempt case checks the fifth rejected code and the
subsequent blocked attempt. A deliberate mutation run and its red pytest output
have not yet been recorded; perform that check before treating the US04
regression-evidence requirement as complete. For example, temporarily change
`OTP_EXPIRE_SECONDS` from 300 to 301 and run the US04 suite; TC-011 should fail.
Restore the setting to 300 and rerun the suite, which should pass. Do not commit
the temporary mutation.

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
