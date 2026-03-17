#!/usr/bin/env python3
"""Generate an HTML report from run_loop.py output."""
import argparse
import html
import json
import sys
from pathlib import Path


def generate_html(data, auto_refresh=False, skill_name=""):
    history = data.get("history", [])
    title = html.escape(skill_name + " — ") if skill_name else ""
    refresh = '<meta http-equiv="refresh" content="5">' if auto_refresh else ""
    rows = ""
    for h in history:
        passed = h.get("train_passed", h.get("passed", 0))
        total = h.get("train_total", h.get("total", 0))
        desc = html.escape(h.get("description", "")[:200])
        rows += f"<tr><td>{h.get('iteration','?')}</td><td>{passed}/{total}</td><td style='font-family:monospace;font-size:11px'>{desc}</td></tr>\n"
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">{refresh}
<title>{title}Skill Description Optimization</title>
<style>body{{font-family:sans-serif;padding:20px;background:#faf9f5}}table{{border-collapse:collapse;width:100%}}th,td{{padding:8px;border:1px solid #e8e6dc;text-align:left}}th{{background:#141413;color:white}}</style>
</head><body>
<h1>{title}Skill Description Optimization</h1>
<p><strong>Best:</strong> {html.escape(data.get('best_description','N/A'))}</p>
<p><strong>Score:</strong> {data.get('best_score','N/A')} | <strong>Iterations:</strong> {data.get('iterations_run',0)}</p>
<table><thead><tr><th>Iter</th><th>Score</th><th>Description</th></tr></thead><tbody>{rows}</tbody></table>
</body></html>"""


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("-o", "--output", default=None)
    parser.add_argument("--skill-name", default="")
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text()) if args.input != "-" else json.load(sys.stdin)
    result = generate_html(data, skill_name=args.skill_name)
    if args.output:
        Path(args.output).write_text(result)
    else:
        print(result)
