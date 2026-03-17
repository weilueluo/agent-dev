#!/usr/bin/env python3
"""Run the eval + improve loop until all pass or max iterations reached."""
import argparse
import json
import random
import sys
import tempfile
import time
import webbrowser
from pathlib import Path
from scripts.generate_report import generate_html
from scripts.improve_description import improve_description
from scripts.run_eval import find_project_root, run_eval
from scripts.utils import parse_skill_md


def split_eval_set(eval_set, holdout, seed=42):
    random.seed(seed)
    trigger = [e for e in eval_set if e["should_trigger"]]
    no_trigger = [e for e in eval_set if not e["should_trigger"]]
    random.shuffle(trigger)
    random.shuffle(no_trigger)
    n_t = max(1, int(len(trigger) * holdout))
    n_nt = max(1, int(len(no_trigger) * holdout))
    return trigger[n_t:] + no_trigger[n_nt:], trigger[:n_t] + no_trigger[:n_nt]


def run_loop(eval_set, skill_path, description_override, num_workers, timeout, max_iterations, runs_per_query, trigger_threshold, holdout, model, verbose, live_report_path=None, log_dir=None):
    project_root = find_project_root()
    name, original_description, content = parse_skill_md(skill_path)
    current_description = description_override or original_description
    train_set, test_set = split_eval_set(eval_set, holdout) if holdout > 0 else (eval_set, [])
    history = []
    for iteration in range(1, max_iterations + 1):
        all_results = run_eval(train_set + test_set, name, current_description, num_workers, timeout, project_root, runs_per_query, trigger_threshold, model)
        train_queries_set = {q["query"] for q in train_set}
        train_results = [r for r in all_results["results"] if r["query"] in train_queries_set]
        train_passed = sum(1 for r in train_results if r["pass"])
        history.append({"iteration": iteration, "description": current_description, "train_passed": train_passed, "train_total": len(train_results), "passed": train_passed, "total": len(train_results), "results": train_results})
        if train_passed == len(train_results) or iteration == max_iterations:
            break
        current_description = improve_description(name, content, current_description, {"results": train_results, "summary": {"passed": train_passed, "total": len(train_results)}}, history, model, log_dir=log_dir, iteration=iteration)
    best = max(history, key=lambda h: h["train_passed"])
    return {"original_description": original_description, "best_description": best["description"], "best_score": f"{best['train_passed']}/{best['train_total']}", "iterations_run": len(history), "history": history}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval-set", required=True)
    parser.add_argument("--skill-path", required=True)
    parser.add_argument("--max-iterations", type=int, default=5)
    parser.add_argument("--runs-per-query", type=int, default=3)
    parser.add_argument("--holdout", type=float, default=0.4)
    parser.add_argument("--model", required=True)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    output = run_loop(json.loads(Path(args.eval_set).read_text()), Path(args.skill_path), None, 10, 30, args.max_iterations, args.runs_per_query, 0.5, args.holdout, args.model, args.verbose)
    print(json.dumps(output, indent=2))
