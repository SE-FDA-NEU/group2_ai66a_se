# US03 Price History Test Cases

These cases exercise `WatchlistService.get_price_history` with mocked repository
dependencies. They run without a server, Redis, or a database.

| Test case ID | Scenario | Expected result | Automated test |
|---|---|---|---|
| US03-TC-001 | Request the default seven-day history when tracking has multiple recent price records. | The response includes the tracked-day count, ordered timestamps and prices, correct min/max values, and the requested time cutoff. | `test_us03_tc_001_history_returns_tracked_period_and_price_records` |
| US03-TC-002 | Only two days of price data are available. | The response reports two tracked days and includes only the real available price records and their min/max; it does not fabricate data. | `test_us03_tc_002_few_days_of_history_returns_available_data` |
| US03-TC-003 | Price tracking pauses for longer than the configured gap threshold and later resumes. | The first resumed record is marked as a gap; adjacent records inside the threshold are not. | `test_us03_tc_003_gap_after_tracking_stops_and_resumes` |
| US03-TC-004 | Request history for a product not tracked by the current user. | The service raises `TRACKING_NOT_FOUND` with HTTP status 404. | `test_us03_tc_004_untracked_product_raises_tracking_not_found` |
| US03-TC-005 | Consecutive records are exactly 30 minutes apart with the default threshold. | The interval is not marked as a gap because only intervals greater than the threshold count as gaps. | `test_us03_tc_005_gap_at_threshold_is_not_a_gap` |
| US03-TC-006 | Consecutive records exceed a custom 15-minute threshold. | The later record is marked as the start of a gap. | `test_us03_tc_006_gap_exceeding_custom_threshold_is_detected` |
| US03-TC-007 | The repository returns no history records. | The response has no min/max values and an empty data-point list while preserving the tracked-day count. | `test_us03_tc_007_empty_price_history` |
| US03-TC-008 | The repository returns one price record. | The response has equal min/max values and one non-gap data point. | `test_us03_tc_008_single_price_point` |
| US03-TC-009 | Request all history using the `days=0` boundary. | The repository is called without a time cutoff and older records are returned. | `test_us03_tc_009_zero_days_returns_all_history` |

Run this suite using the project's documented command from the repository root:

```powershell
docker compose run --rm --no-deps --build --entrypoint python backend -m pytest tests/unit/test_price_history_service.py -v -s
```
