"""Run the uncommitted working snapshot in a clean folder, then prove regression sensitivity.

Requires Python dependencies from docs/SETUP.md and Node.js/npm. No server or .env.
Does not modify source files in the original repository and never creates a commit.
"""
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/testing/evidence"


def run(args, cwd):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=300)


def save(name, command, result):
    (EVIDENCE / name).write_text(f"$ {command}\n{result.stdout}{result.stderr}\nExit code: {result.returncode}\n", encoding="utf-8")


def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    clean = Path(tempfile.mkdtemp(prefix="issue185-clean-")).resolve()
    try:
        tracked = run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], ROOT)
        assert tracked.returncode == 0, tracked.stderr
        for name in tracked.stdout.split("\0"):
            if not name or name.startswith("docs/testing/evidence/"):
                continue
            source = ROOT / name
            target = clean / name
            if source.is_file():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
        assert not (clean / ".env").exists()
        assert not (clean / "frontend/node_modules").exists()
        npm = shutil.which("npm.cmd") or shutil.which("npm")
        assert npm, "Install Node.js/npm first"
        installed = run([npm, "ci", "--no-audit", "--no-fund"], clean / "frontend")
        save("issue185-clean-install.txt", "npm ci --no-audit --no-fund", installed)
        assert installed.returncode == 0, installed.stdout + installed.stderr
        green = run([sys.executable, "-m", "pytest", "-q"], clean)
        save("issue185-green.txt", "pytest -q  # clean snapshot, no .env, no server", green)
        assert green.returncode == 0, green.stdout + green.stderr
        build = run([npm, "run", "build"], clean / "frontend")
        save("issue185-build.txt", "npm run build", build)
        assert build.returncode == 0, build.stdout + build.stderr
        # Deliberate mutation only in the disposable copy: reintroduce the old six-second bug.
        source = clean / "frontend/src/components/NotificationCenter.tsx"
        original = source.read_text(encoding="utf-8")
        assert "TOAST_DURATION_MS = 5_000" in original
        source.write_text(original.replace("TOAST_DURATION_MS = 5_000", "TOAST_DURATION_MS = 6_000"), encoding="utf-8")
        red = run([sys.executable, "-m", "pytest", "tests/test_issue185_interface.py", "-k", "N185-UI-03", "-q"], clean)
        save("issue185-red.txt", "pytest tests/test_issue185_interface.py -k N185-UI-03 -q  # mutant: 6000 ms", red)
        assert red.returncode == 1, "The regression test must fail for the six-second mutant"
        source.write_text(original, encoding="utf-8")
        restored = run([sys.executable, "-m", "pytest", "-m", "issue185", "-q"], clean)
        save("issue185-restored.txt", "pytest -m issue185 -q  # restored 5000 ms", restored)
        assert restored.returncode == 0, restored.stdout + restored.stderr
        (EVIDENCE / "environment.json").write_text(json.dumps({
            "python": sys.version.split()[0], "node": run(["node", "--version"], clean).stdout.strip(),
            "npm": run([npm, "--version"], clean).stdout.strip(),
            "snapshot": "git tracked and untracked non-ignored working files; no .git or .env",
            "python_dependencies": "preinstalled from backend/requirements.txt; not a fresh OS or fresh Python venv",
            "frontend_dependencies": "fresh npm ci in disposable copy",
            "green_exit": green.returncode, "red_exit": red.returncode, "restored_exit": restored.returncode,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(green.stdout)
        print("Expected red mutation: exit 1. Restored issue185 suite: exit 0.")
        print(f"Evidence: {EVIDENCE}")
    finally:
        assert clean.parent == Path(tempfile.gettempdir()).resolve()
        assert clean.name.startswith("issue185-clean-")
        shutil.rmtree(clean)


if __name__ == "__main__":
    main()
