#!/usr/bin/env python3
"""Aggregate individual run results into benchmark summary statistics."""
import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path


def calculate_stats(values):
    if not values:
        return {"mean": 0.0, "stddev": 0.0, "min": 0.0, "max": 0.0}
    n = len(values)
    mean = sum(values) / n
    stddev = math.sqrt(sum((x - mean) ** 2 for x in values) / (n - 1)) if n > 1 else 0.0
    return {"mean": round(mean, 4), "stddev": round(stddev, 4), "min": round(min(values), 4), "max": round(max(values), 4)}


def load_run_results(benchmark_dir):
    search_dir = benchmark_dir / "runs" if (benchmark_dir / "runs").exists() else benchmark_dir
    results = {}
    for eval_dir in sorted(search_dir.glob("eval-*")):
        eval_id = int(eval_dir.name.split("-")[1]) if eval_dir.name.split("-")[1].isdigit() else 0
        for config_dir in sorted(eval_dir.iterdir()):
            if not config_dir.is_dir() or not list(config_dir.glob("run-*")):
                continue
            config = config_dir.name
            results.setdefault(config, [])
            for run_dir in sorted(config_dir.glob("run-*")):
                grading_file = run_dir / "grading.json"
                if not grading_file.exists():
                    continue
                try:
                    grading = json.loads(grading_file.read_text())
                except json.JSONDecodeError:
                    continue
                results[config].append({
                    "eval_id": eval_id, "run_number": int(run_dir.name.split("-")[1]),
                    "pass_rate": grading.get("summary", {}).get("pass_rate", 0.0),
                    "passed": grading.get("summary", {}).get("passed", 0),
                    "total": grading.get("summary", {}).get("total", 0),
                    "time_seconds": grading.get("timing", {}).get("total_duration_seconds", 0.0),
                    "tokens": grading.get("execution_metrics", {}).get("output_chars", 0),
                    "expectations": grading.get("expectations", []),
                    "notes": []
                })
    return results


def aggregate_results(results):
    run_summary = {}
    configs = list(results.keys())
    for config in configs:
        runs = results.get(config, [])
        run_summary[config] = {
            "pass_rate": calculate_stats([r["pass_rate"] for r in runs]),
            "time_seconds": calculate_stats([r["time_seconds"] for r in runs]),
            "tokens": calculate_stats([r.get("tokens", 0) for r in runs])
        }
    if len(configs) >= 2:
        delta_pr = run_summary[configs[0]]["pass_rate"]["mean"] - run_summary[configs[1]]["pass_rate"]["mean"]
        run_summary["delta"] = {"pass_rate": f"{delta_pr:+.2f}"}
    return run_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("benchmark_dir", type=Path)
    parser.add_argument("--skill-name", default="")
    parser.add_argument("--output", "-o", type=Path, default=None)
    args = parser.parse_args()
    results = load_run_results(args.benchmark_dir)
    benchmark = {"metadata": {"skill_name": args.skill_name, "timestamp": datetime.now(timezone.utc).isoformat()}, "runs": [], "run_summary": aggregate_results(results), "notes": []}
    output_path = args.output or (args.benchmark_dir / "benchmark.json")
    output_path.write_text(json.dumps(benchmark, indent=2))
    print(f"Generated: {output_path}")
