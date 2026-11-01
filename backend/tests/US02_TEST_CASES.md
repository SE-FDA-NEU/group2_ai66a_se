# US02 Target Price Test Cases

These cases cover target price validation and price notifications with mocked
repositories and sessions. They run without a server or real database.

| Test case ID | Scenario | Expected result | Automated test |
|---|---|---|---|
| US02-TC-001 | Set a positive target price below the current price. | The target price is saved and a confirmation notification is created. | `test_us02_tc_001_set_valid_target_price` |
| US02-TC-002 | Set a target equal to the current price. | The service rejects it with `INVALID_TARGET_PRICE` (400) and rolls back. | `test_us02_tc_002_reject_target_equal_to_current_price` |
| US02-TC-003 | Set a target above the current price. | The service rejects it with `INVALID_TARGET_PRICE` (400) and rolls back. | `test_us02_tc_003_reject_target_above_current_price` |
| US02-TC-004 | Submit a target of zero or less. | Schema validation rejects the request. | `test_us02_tc_004_reject_non_positive_target_price` |
| US02-TC-005 | Current price is exactly equal to the target. | One `target_price_reached` notification is created and the tracker is marked notified. | `test_us02_tc_005_notify_when_price_equals_target` |
| US02-TC-006 | Price rises above a target after notification. | `price_above_target` notification is created and the tracker is reset. | `test_us02_tc_006_notify_when_price_rises_above_target` |
| US02-TC-007 | Current price is one unit above the target before any reached notification. | No `target_price_reached` notification is created and the tracker remains unnotified. | `test_us02_tc_007_no_reached_notification_above_target` |

Run from the repository root:

```powershell
docker compose run --rm --no-deps --build --entrypoint python backend -m pytest tests/unit/test_target_price_service.py tests/unit/test_price_monitor_service.py -v -s
```
