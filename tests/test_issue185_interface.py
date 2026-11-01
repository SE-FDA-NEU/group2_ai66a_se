"""Pytest entry points run the real React tests, not Python copies of UI logic."""
import json
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    "N185-UI-01", "N185-UI-02", "N185-UI-03", "N185-UI-04", "N185-UI-05",
    "N185-UI-06", "N185-UI-07", "N185-UI-08", "N185-UI-09", "N185-UI-10",
    "N185-UI-11", "N185-UI-12",
]


@pytest.fixture(scope="module")
def react_results(tmp_path_factory):
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    assert npm, "Install Node.js 20+ and run npm ci --prefix frontend (docs/SETUP.md)."
    output = tmp_path_factory.mktemp("issue185") / "vitest.json"
    result = subprocess.run(
        [npm, "exec", "--", "vitest", "run", "src/test/NotificationCenter.test.tsx",
         "src/test/OperationToasts.test.tsx", "src/test/NotificationsPage.test.tsx",
         "--reporter=json", f"--outputFile={output}"],
        cwd=ROOT / "frontend", capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180,
    )
    assert result.returncode in (0, 1) and output.exists(), result.stdout + result.stderr
    data = json.loads(output.read_text(encoding="utf-8"))
    return [test for suite in data["testResults"] for test in suite["assertionResults"]]


@pytest.mark.parametrize("case_id", CASES, ids=CASES)
def test_issue185_interface(case_id, react_results):
    matches = [test for test in react_results if case_id in test["fullName"]]
    assert matches, f"Missing React case {case_id}"
    failures = [message for test in matches for message in test.get("failureMessages", [])]
    assert all(test["status"] == "passed" for test in matches), "\n".join(failures)
