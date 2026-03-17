#!/usr/bin/env python3
"""Improve a skill description based on eval results."""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from scripts.utils import parse_skill_md


def _call_claude(prompt, model, timeout=300):
    cmd = ["claude", "-p", "--output-format", "text"]
    if model:
        cmd.extend(["--model", model])
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    result = subprocess.run(cmd, input=prompt, capture_output=True, text=True, env=env, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"claude -p exited {result.returncode}")
    return result.stdout


def improve_description(skill_name, skill_content, current_description, eval_results, history, model, test_results=None, log_dir=None, iteration=None):
    failed_triggers = [r for r in eval_results["results"] if r["should_trigger"] and not r["pass"]]
    false_triggers = [r for r in eval_results["results"] if not r["should_trigger"] and not r["pass"]]
    train_score = f"{eval_results['summary']['passed']}/{eval_results['summary']['total']}"
    prompt = f'You are optimizing a skill description for "{skill_name}".\n\nCurrent: "{current_description}"\nScore: {train_score}\n\n'
    if failed_triggers:
        prompt += "FAILED TO TRIGGER:\n" + "".join(f'  - "{r["query"]}" ({r["triggers"]}/{r["runs"]})\n' for r in failed_triggers)
    if false_triggers:
        prompt += "FALSE TRIGGERS:\n" + "".join(f'  - "{r["query"]}" ({r["triggers"]}/{r["runs"]})\n' for r in false_triggers)
    if history:
        prompt += "\nPREVIOUS ATTEMPTS:\n" + "".join(f'  {h.get("train_passed",h.get("passed",0))}/{h.get("train_total",h.get("total",0))}: "{h["description"][:100]}..."\n' for h in history)
    prompt += f"\nSkill content:\n{skill_content[:2000]}\n\nWrite an improved description (max 1024 chars). Respond in <new_description> tags."
    text = _call_claude(prompt, model)
    match = re.search(r"<new_description>(.*?)</new_description>", text, re.DOTALL)
    description = match.group(1).strip().strip('"') if match else text.strip().strip('"')
    if log_dir:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
        (Path(log_dir) / f"improve_iter_{iteration or 'unknown'}.json").write_text(json.dumps({"prompt": prompt[:500], "description": description}, indent=2))
    return description


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval-results", required=True)
    parser.add_argument("--skill-path", required=True)
    parser.add_argument("--history", default=None)
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    eval_results = json.loads(Path(args.eval_results).read_text())
    name, _, content = parse_skill_md(Path(args.skill_path))
    history = json.loads(Path(args.history).read_text()) if args.history else []
    new_desc = improve_description(name, content, eval_results["description"], eval_results, history, args.model)
    print(json.dumps({"description": new_desc}, indent=2))
