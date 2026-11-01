#!/usr/bin/env python3
"""Export docs/testing.md into Team02_M4.pdf with exact 4-page structure."""

import os
import subprocess
from pathlib import Path
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = ROOT / "docs" / "testing.md"
PDF_PATH = ROOT / "Team02_M4.pdf"
HTML_PATH = ROOT / "docs" / "testing_export.html"


def generate_pdf():
    md_content = DOC_PATH.read_text(encoding="utf-8")
    md = MarkdownIt("commonmark").enable("table")
    
    # We parse the file into sections
    # Cover block: from start up to images
    cover_lines = []
    body_lines = []
    mode = "cover"
    
    for line in md_content.splitlines():
        if line.startswith("![Start of Sprint 4]"):
            mode = "body"
            continue
        if mode == "cover":
            cover_lines.append(line)
        else:
            if line.startswith("![End of Sprint 4]") or line.startswith("![Pytest Test Suite Output]"):
                continue
            body_lines.append(line)
            
    cover_html = md.render("\n".join(cover_lines))
    body_html = md.render("\n".join(body_lines))
    
    start_img = (ROOT / "docs" / "images" / "sprint-04" / "start.png").resolve().as_uri()
    end_img = (ROOT / "docs" / "images" / "sprint-04" / "end.png").resolve().as_uri()
    test_img = (ROOT / "docs" / "images" / "testing.png").resolve().as_uri()

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Milestone 4 - Team 02</title>
<style>
  @page {{
    size: A4;
    margin: 1.5cm;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #24292f;
    line-height: 1.5;
    font-size: 13px;
  }}
  .page-break {{
    page-break-after: always;
    break-after: page;
  }}
  h1, h2, h3, h4 {{
    color: #1f2328;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
  }}
  h1 {{ font-size: 24px; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }}
  h2 {{ font-size: 18px; border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; margin-top: 1.5em; }}
  h3 {{ font-size: 15px; margin-top: 1.2em; }}
  pre {{
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.45;
    overflow-x: auto;
    border: 1px solid #d0d7de;
  }}
  code {{
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 85%;
    background-color: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }}
  pre code {{
    background-color: transparent;
    padding: 0;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin-top: 12px;
    margin-bottom: 16px;
    font-size: 11.5px;
  }}
  th, td {{
    border: 1px solid #d0d7de;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background-color: #f6f8fa;
    font-weight: 600;
  }}
  tr:nth-child(even) {{
    background-color: #fbfcfd;
  }}
  .board-img {{
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 12px;
    display: block;
  }}
  .test-img {{
    width: 100%;
    max-height: 850px;
    object-fit: contain;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    display: block;
  }}
  .img-caption {{
    font-size: 12px;
    font-weight: bold;
    color: #57609a;
    margin-bottom: 6px;
  }}
</style>
</head>
<body>

<!-- PAGE 1: COVER BLOCK -->
<div class="page-break">
  {cover_html}
</div>

<!-- PAGE 2: TWO SCREENSHOTS OF PROJECT BOARD -->
<div class="page-break">
  <h1>Project Board Evolution (Sprint 4)</h1>
  <div class="img-caption">1. Project board right after Sprint Planning:</div>
  <img class="board-img" src="{start_img}" alt="Start of Sprint 4">
  <div class="img-caption">2. Project board on submission day (Completed / Done):</div>
  <img class="board-img" src="{end_img}" alt="End of Sprint 4">
</div>

<!-- PAGE 3: PYTEST FULL TERMINAL OUTPUT SCREENSHOT -->
<div class="page-break">
  <h1>Automated Test Suite Execution</h1>
  <div class="img-caption">Full terminal output of <code>python -m pytest -v</code> (Every test name visible):</div>
  <img class="test-img" src="{test_img}" alt="Pytest Execution Output">
</div>

<!-- PAGE 4+: REPORT CONTENT -->
<div>
  {body_html}
</div>

</body>
</html>
"""
    HTML_PATH.write_text(html_template, encoding="utf-8")
    print(f"Generated HTML at {HTML_PATH}")

    # Compile with google-chrome
    chrome = "/usr/bin/google-chrome"
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={PDF_PATH}",
        str(HTML_PATH),
    ]
    subprocess.run(cmd, check=True)
    print(f"Generated PDF successfully at {PDF_PATH}")


if __name__ == "__main__":
    generate_pdf()

