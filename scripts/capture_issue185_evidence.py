"""Capture a browser rendering of the real saved pytest transcripts (not a terminal screenshot)."""
from html import escape
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/testing/evidence"


def main():
    candidates = [shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("msedge"),
                  r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                  r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"]
    browser = next((path for path in candidates if path and Path(path).is_file()), None)
    assert browser, "Install Chrome, Chromium or Edge to capture the saved transcript pages."
    for name, title in [("issue185-green", "Pytest — bản sao sạch"), ("issue185-red", "Mutation 6000 ms — test phải thất bại")]:
        transcript = (EVIDENCE / f"{name}.txt").read_text(encoding="utf-8")
        html = EVIDENCE / f"{name}.html"
        html.write_text(f"""<!doctype html><html lang="vi"><meta charset="utf-8"><title>{escape(title)}</title>
<style>body{{margin:0;padding:28px;background:#f9fafb;color:#111827;font:16px Arial,sans-serif}}
h1{{font-size:22px;margin:0 0 8px}}p{{color:#4b5563;margin:0 0 20px}}pre{{background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;font:14px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}}</style>
<h1>{escape(title)}</h1><p>Issue #185 · Nội dung log thực tế đã lưu · Không phải ảnh chụp terminal</p><pre>{escape(transcript)}</pre></html>""", encoding="utf-8")
        with tempfile.TemporaryDirectory(prefix="issue185-browser-") as profile:
            result = subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                                     "--no-default-browser-check", f"--user-data-dir={profile}",
                                     "--window-size=1400,1200", f"--screenshot={EVIDENCE / (name + '.png')}", html.as_uri()],
                                    capture_output=True, timeout=60)
            assert result.returncode == 0 and (EVIDENCE / f"{name}.png").is_file(), result.stderr.decode(errors="replace")
        print(f"Saved {name}.png")


if __name__ == "__main__":
    main()
