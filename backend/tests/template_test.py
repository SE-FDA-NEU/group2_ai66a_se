# tests/template_test.py
"""Test templates. Copy one function into a new test file and replace the placeholders.

    Template 1 (integration) -> tests/integration/test_<feature>.py
    Template 2 (unit)        -> tests/unit/test_<feature>.py

Do NOT copy the `pytestmark` line (it skips the examples below, which is why this
file reports "2 skipped"). Name tests: test_<action>_<condition>_<expected_result>.
For async code use `async def`, `await` and AsyncMock (needs pytest-asyncio).
"""

import pytest
from unittest.mock import patch
# Import the models, schemas, or functions under test here.

# this line skips the examples below, which is why this file reports "2 skipped"
pytestmark = pytest.mark.skip(reason="Template file: examples only, not real tests")


# ==========================================
# TEMPLATE 1: INTEGRATION TEST (API endpoint)
# ==========================================
def test_feature_name_integration(client, db_session):
    """
    Test [POST] /api/v1/something through router, service and test database.
    Needs the `client` and `db_session` fixtures (see README).
    Rule: Arrange -> Act -> Assert
    """
    # 1. Arrange: request data, plus any records created through db_session
    payload = {
        "field1": "value1",
        "field2": 123,
    }

    # 2. Act: call the endpoint
    response = client.post("/api/v1/something", json=payload)

    # 3. Assert: HTTP status, returned JSON, and saved data
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Success"
    assert "id" in data
    # saved_record = db_session.get(FeatureModel, data["id"])
    # assert saved_record.field1 == payload["field1"]


# ==========================================
# TEMPLATE 2: UNIT TEST (logic/service with mocks)
# ==========================================
@patch("path.to.module.function_to_mock")  # patch where the module under test imports it
def test_feature_name_unit(mock_api_call):
    """
    Test one function in isolation. No real `client` or `db_session`;
    mock everything outside it (database, Redis, HTTP calls).
    """
    # 1. Arrange: set the mock's return value and the input
    mock_api_call.return_value = {"api_status": "ok", "data": [1, 2, 3]}
    input_data = "some_input"

    # 2. Act: call the function directly (not through the API router)
    # result = function_under_test(input_data)
    result = True  # Replace with the real function call

    # 3. Assert: check the result and the mock call
    assert result is True
    # mock_api_call.assert_called_once_with(input_data)