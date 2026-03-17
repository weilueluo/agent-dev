#!/usr/bin/env python3
"""Generate and serve a review page for eval results."""
import argparse
import base64
import json
import mimetypes
import os
import re
import signal
import subprocess
import sys
import time
import webbrowser
from functools import partial
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

METADATA_FILES = {"transcript.md", "user_notes.md", "metrics.json"}
TEXT_EXTENSIONS = {".txt", ".md", ".json", ".csv", ".py", ".js", ".html", ".css", ".xml", ".yaml", ".yml"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}


def find_runs(workspace):
    runs = []
    _find_runs_recursive(workspace, workspace, runs)
    runs.sort(key=lambda r: (r.get("eval_id", float("inf")), r["id"]))
    return runs


def _find_runs_recursive(root, current, runs):
    if not current.is_dir():
        return
    if (current / "outputs").is_dir():
        run = build_run(root, current)
        if run:
            runs.append(run)
        return
    for child in sorted(current.iterdir()):
        if child.is_dir() and child.name not in {"node_modules", ".git", "__pycache__", "skill", "inputs"}:
            _find_runs_recursive(root, child, runs)


def build_run(root, run_dir):
    prompt = "(No prompt found)"
    for candidate in [run_dir / "eval_metadata.json", run_dir.parent / "eval_metadata.json"]:
        if candidate.exists():
            try:
                prompt = json.loads(candidate.read_text()).get("prompt", prompt)
            except Exception:
                pass
            if prompt != "(No prompt found)":
                break
    run_id = str(run_dir.relative_to(root)).replace("/", "-").replace("\\", "-")
    outputs = []
    outputs_dir = run_dir / "outputs"
    if outputs_dir.is_dir():
        for f in sorted(outputs_dir.iterdir()):
            if f.is_file() and f.name not in METADATA_FILES:
                outputs.append(embed_file(f))
    grading = None
    for candidate in [run_dir / "grading.json", run_dir.parent / "grading.json"]:
        if candidate.exists():
            try:
                grading = json.loads(candidate.read_text())
            except Exception:
                pass
    return {"id": run_id, "prompt": prompt, "outputs": outputs, "grading": grading}


def embed_file(path):
    ext = path.suffix.lower()
    if ext in TEXT_EXTENSIONS:
        return {"name": path.name, "type": "text", "content": path.read_text(errors="replace")}
    elif ext in IMAGE_EXTENSIONS:
        mime = mimetypes.guess_type(str(path))[0] or "image/png"
        return {"name": path.name, "type": "image", "data_uri": f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"}
    else:
        mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        return {"name": path.name, "type": "binary", "mime": mime, "data_uri": f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"}


def generate_html(runs, skill_name, previous=None, benchmark=None):
    template_path = Path(__file__).parent / "viewer.html"
    template = template_path.read_text()
    data = json.dumps({"skill_name": skill_name, "runs": runs, "previous_feedback": {}, "previous_outputs": {}})
    return template.replace("/*__EMBEDDED_DATA__*/", f"const EMBEDDED_DATA = {data};")


class ReviewHandler(BaseHTTPRequestHandler):
    def __init__(self, workspace, skill_name, feedback_path, *args, **kwargs):
        self.workspace = workspace
        self.skill_name = skill_name
        self.feedback_path = feedback_path
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            runs = find_runs(self.workspace)
            content = generate_html(runs, self.skill_name).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/feedback":
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length))
            self.feedback_path.write_text(json.dumps(data, indent=2))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')

    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--port", type=int, default=3117)
    parser.add_argument("--skill-name", default=None)
    parser.add_argument("--static", type=Path, default=None)
    args = parser.parse_args()
    workspace = args.workspace.resolve()
    runs = find_runs(workspace)
    skill_name = args.skill_name or workspace.name
    if args.static:
        args.static.write_text(generate_html(runs, skill_name))
        print(f"Written to {args.static}")
        return
    feedback_path = workspace / "feedback.json"
    handler = partial(ReviewHandler, workspace, skill_name, feedback_path)
    server = HTTPServer(("127.0.0.1", args.port), handler)
    print(f"Serving at http://localhost:{args.port}")
    webbrowser.open(f"http://localhost:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
