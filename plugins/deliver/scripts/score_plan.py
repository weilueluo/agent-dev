#!/usr/bin/env python3
"""
score_plan.py — Score a plan artifact on quality dimensions.

Reads a YAML or JSON plan (planner_handoff format) from stdin or a file
and scores it on completeness, feasibility, sequencing, and risk coverage.

Usage:
    python score_plan.py plan.yaml
    cat plan.yaml | python score_plan.py
"""

import sys
import json
import os

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_input(text):
    try:
        import yaml
        return yaml.safe_load(text) or {}
    except ImportError:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            print("Warning: PyYAML not installed and input is not JSON.", file=sys.stderr)
            return {}


def score_completeness(data):
    issues = []
    score = 10
    required = ["planning_mode", "chosen_strategy", "execution_phases",
                 "acceptance_criteria", "non_goals", "risk_mitigations", "rollback_notes"]
    for f in required:
        if f not in data:
            issues.append(f"Missing: {f}")
            score -= 2
        elif not data[f]:
            issues.append(f"Empty: {f}")
            score -= 1
    strategy = data.get("chosen_strategy", {})
    if isinstance(strategy, dict):
        for sub in ["name", "summary", "rationale"]:
            if not strategy.get(sub):
                issues.append(f"Strategy missing: {sub}")
                score -= 1
    phases = data.get("execution_phases", [])
    if isinstance(phases, list):
        for i, p in enumerate(phases):
            if isinstance(p, dict):
                for sub in ["id", "name", "description", "acceptance_criteria"]:
                    if not p.get(sub):
                        issues.append(f"Phase {i+1} missing: {sub}")
                        score -= 0.5
    return max(0, min(10, round(score))), issues


def score_feasibility(data):
    issues = []
    score = 10
    phases = data.get("execution_phases", [])
    if not phases:
        return 0, ["No execution phases"]
    for p in phases:
        if isinstance(p, dict):
            files = p.get("files_affected", [])
            if isinstance(files, list) and len(files) > 10:
                issues.append(f"Phase '{p.get('name', '?')}' affects {len(files)} files")
                score -= 1
            criteria = p.get("acceptance_criteria", [])
            if isinstance(criteria, list) and len(criteria) > 8:
                issues.append(f"Phase '{p.get('name', '?')}' has {len(criteria)} criteria")
                score -= 0.5
    alts = data.get("alternatives_considered", [])
    if not alts and data.get("planning_mode") in ("deep", "high-risk"):
        issues.append("No alternatives in deep/high-risk mode")
        score -= 2
    return max(0, min(10, round(score))), issues


def score_sequencing(data):
    issues = []
    score = 10
    phases = data.get("execution_phases", [])
    if not phases:
        return 0, ["No phases"]
    ids = set()
    adj = {}
    for p in phases:
        if isinstance(p, dict):
            pid = p.get("id", "")
            if pid in ids:
                issues.append(f"Duplicate id: {pid}")
                score -= 2
            ids.add(pid)
            adj[pid] = p.get("depends_on", []) if isinstance(p.get("depends_on"), list) else []
    for pid, deps in adj.items():
        for d in deps:
            if d not in ids:
                issues.append(f"'{pid}' depends on unknown: {d}")
                score -= 2
    # Cycle detection
    visited, in_stack = set(), set()
    def has_cycle(n):
        visited.add(n); in_stack.add(n)
        for nb in adj.get(n, []):
            if nb in in_stack: return True
            if nb not in visited and has_cycle(nb): return True
        in_stack.discard(n); return False
    for pid in ids:
        if pid not in visited and has_cycle(pid):
            issues.append("Circular dependency detected")
            score -= 5
            break
    return max(0, min(10, round(score))), issues


def score_risk(data):
    issues = []
    score = 10
    if not data.get("risk_mitigations"):
        issues.append("No risk mitigations")
        score -= 3
    if not data.get("rollback_notes"):
        issues.append("No rollback notes")
        score -= 2
    high_risk = [p.get("name", "?") for p in data.get("execution_phases", [])
                 if isinstance(p, dict) and p.get("estimated_risk") in ("high", "critical")]
    if high_risk and not data.get("risk_mitigations"):
        issues.append(f"High-risk phases but no mitigations: {', '.join(high_risk)}")
        score -= 3
    if data.get("planning_mode") == "high-risk" and len(data.get("risk_mitigations", [])) < 2:
        issues.append("High-risk mode needs multiple mitigations")
        score -= 2
    return max(0, min(10, round(score))), issues


def score_dependency_clarity(data):
    """Score whether dependencies between phases are explicit and correct."""
    issues = []
    score = 10
    phases = data.get("execution_phases", [])
    if not phases:
        return 0, ["No phases"]
    for p in phases:
        if isinstance(p, dict):
            if "depends_on" not in p:
                issues.append(f"Phase '{p.get('name', '?')}' missing depends_on field")
                score -= 2
    deps = data.get("dependencies", [])
    if not deps and len(phases) > 1:
        issues.append("Multi-phase plan with no explicit dependency list")
        score -= 2
    return max(0, min(10, round(score))), issues


def score_acceptance_clarity(data):
    """Score whether acceptance criteria are specific and testable."""
    issues = []
    score = 10
    criteria = data.get("acceptance_criteria", [])
    if not criteria:
        issues.append("No overall acceptance criteria")
        score -= 4
    phases = data.get("execution_phases", [])
    phases_without = 0
    for p in phases:
        if isinstance(p, dict):
            pc = p.get("acceptance_criteria", [])
            if not pc:
                phases_without += 1
    if phases_without:
        issues.append(f"{phases_without} phase(s) without acceptance criteria")
        score -= phases_without * 1.5
    return max(0, min(10, round(score))), issues


def score_rollback_readiness(data):
    """Score rollback planning."""
    issues = []
    score = 10
    if not data.get("rollback_notes"):
        issues.append("No rollback notes")
        score -= 5
    mode = data.get("planning_mode", "standard")
    if mode == "high-risk" and not data.get("risk_mitigations"):
        issues.append("High-risk mode with no mitigations")
        score -= 3
    return max(0, min(10, round(score))), issues


def score_plan(plan):
    data = plan.get("planner_handoff", plan)
    dims = {
        "completeness": score_completeness(data),
        "feasibility": score_feasibility(data),
        "sequencing": score_sequencing(data),
        "dependency_clarity": score_dependency_clarity(data),
        "acceptance_clarity": score_acceptance_clarity(data),
        "rollback_readiness": score_rollback_readiness(data),
        "risk_coverage": score_risk(data),
    }
    # Equal weights across 7 dimensions
    weights = {k: 100 / 7 for k in dims}
    overall = sum(dims[d][0] * weights[d] / 10 for d in weights)
    return {
        "dimensions": {k: {"score": v[0], "issues": v[1]} for k, v in dims.items()},
        "overall_score": round(overall),
        "max_score": 100,
        "recommendation": "accept" if overall >= 75 else "revise" if overall >= 50 else "re-explore",
    }


def main():
    text = ""
    if len(sys.argv) > 1:
        try:
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: {sys.argv[1]} not found", file=sys.stderr)
            sys.exit(1)
    else:
        text = sys.stdin.read()
    if not text.strip():
        print("Usage: score_plan.py <plan.yaml>", file=sys.stderr)
        sys.exit(1)
    plan = load_input(text)
    if not plan:
        print("Error: Could not parse input", file=sys.stderr)
        sys.exit(1)
    results = score_plan(plan)
    print("=" * 60)
    print("PLAN QUALITY SCORE")
    print("=" * 60)
    for name, dim in results["dimensions"].items():
        bar = "█" * dim["score"] + "░" * (10 - dim["score"])
        print(f"\n{name.replace('_', ' ').title()}: {dim['score']}/10  [{bar}]")
        for issue in dim["issues"]:
            print(f"  ⚠ {issue}")
    print(f"\n{'=' * 60}")
    print(f"OVERALL: {results['overall_score']}/{results['max_score']}")
    print(f"RECOMMENDATION: {results['recommendation'].upper()}")
    print(f"{'=' * 60}")
    print(f"\n{json.dumps(results, indent=2)}")
    return 0 if results["recommendation"] == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
