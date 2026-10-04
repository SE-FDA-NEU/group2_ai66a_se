# Backend Tests

```text
tests/
|-- unit/               # Unit tests
|-- integration/        # Integration tests
|-- template_test.py    # Templates to copy (one integration, one unit)
|-- google-auth.py      # Manual utility, not collected by Pytest
|-- python-version.py   # Manual utility, not collected by Pytest
`-- README.md
```

## Test types

- **Unit test** (`unit/`): tests one function or service in isolation. The database, Redis and HTTP clients are replaced with mocks, so it is fast and needs no setup.
- **Integration test** (`integration/`): calls a real API endpoint and runs the router, service and a **test database** together. It needs the `client` and `db_session` fixtures (usually in `tests/integration/conftest.py`), pointing to a test database and cleaned up after each test.

## Run tests

Run from the repository root:

```powershell
docker compose up -d --build backend
docker ps                                                                             # check whether the docker start up successfully
docker compose exec backend python -m pytest tests -v -s                              # all, show each test and print output
docker compose exec backend python -m pytest tests/unit -v -s                         # unit only
docker compose exec backend python -m pytest tests/integration -v -s                  # integration only
docker compose exec backend python -m pytest tests/unit/test_rapidapi_client.py -v -s # one file
```

### Pytest output flags

- `-q` (quiet) shows a compact progress line and final summary, such as `18 passed, 2 skipped`.
- `-v` (verbose) lists each test name and its result.
- `-s` disables output capture so `print()` and other stdout/stderr from passing tests appear in the terminal. Without `-s`, Pytest captures output from passing tests and normally displays it when a test fails.
- Combine `-v -s` to see each test result and its printed data. These flags change output only; they do not change which tests run or what they assert.

The current unit tests print the data they assert when run with `-s`. `template_test.py` reports **2 skipped**, as expected; its examples print the endpoint response or mocked unit result after assertions pass when copied into a real test. Avoid printing tokens, passwords, or other secrets.

## Add a test

1. Create `test_<feature>.py` in `unit/` or `integration/`.
2. Copy the matching function from `template_test.py` (Template 1 = integration, Template 2 = unit), but **not** the `pytestmark` line.
3. Rename it (`test_<action>_<condition>_<expected_result>`), replace the placeholders, and run the file.

Each test follows **Arrange** (prepare data), **Act** (call the code or endpoint), **Assert** (check the result). Cover at least one happy path and one error case per feature. In unit tests, patch a dependency where the module under test imports it. For async code, use `async def`, `await` and `AsyncMock`; `pytest-asyncio` is installed from `backend/requirements.txt` when the backend image is built.

## Existing tests

All current tests are unit tests with mocked dependencies; none checks live RapidAPI or database connectivity.

- `test_amazon_link_parser.py`: accepts one Amazon product or short link, rejects invalid or multiple links.
- `test_rapidapi_client.py`: request parameters, response mapping and timeout handling with a mocked HTTP client.
- `test_watchlist_service.py`: cached and new products, refresh/resume, tracking limits and idempotent requests.
- `test_watchlist_listing.py`: price labels, insufficient history, and fake-discount calculations from `WatchlistService.list_products`.

The watchlist tests call service methods directly; they do not call the HTTP routes. The API mounts these routes at `/api/v1/watchlist`: `POST` calls `add_to_watchlist`, and `GET` calls `list_watchlist`. Endpoint-level request/response coverage should live in `integration/` when the `client` and test-database fixtures are available.
