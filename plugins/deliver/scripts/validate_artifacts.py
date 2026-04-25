#!/usr/bin/env python3
"""Validate deliver plan and loop-trace JSON artifacts.

JSON is always supported. Input may be a bare artifact or a compatibility
wrapper: planner_handoff for plans, loop_trace or pipeline_trace for traces.

Usage:
    python validate_artifacts.py --type plan plan.json
    python validate_artifacts.py --type loop-trace < trace.json
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


PLAN_REQUIRED = [
    "planning_mode",
    "chosen_strategy",
    "alternatives_considered",
    "execution_phases",
    "acceptance_criteria",
    "non_goals",
    "risk_mitigations",
    "rollback_notes",
]
STRATEGY_REQUIRED = ["name", "summary", "rationale"]
PHASE_REQUIRED = [
    "id",
    "name",
    "depends_on",
    "files_affected",
    "description",
    "exact_changes",
    "acceptance_criteria",
    "verification_commands",
]
TRACE_REQUIRED = [
    "trace_id",
    "issue_summary",
    "started_at",
    "completed_at",
    "disposition",
    "iterations",
    "events",
]
EVENT_REQUIRED = [
    "timestamp",
    "step",
    "iteration",
    "duration_ms",
    "token_estimate",
    "artifact_size_tokens",
]
VALID_STEPS = {
    "frame",
    "explore",
    "plan",
    "review_plan",
    "verify_review",
    "work",
    "review_work",
    "decide",
}
VALID_DISPOSITIONS = {"accept", "iterate", "escalate", "abandoned", "blocked"}


def load_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}") from exc


def read_input(path: str | None) -> str:
    if path:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read()
    return sys.stdin.read()


def is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def add_missing(errors: list[str], obj: dict[str, Any], required: list[str], prefix: str) -> None:
    for field in required:
        if field not in obj:
            errors.append(f"{prefix}: missing required field '{field}'")


def normalize_plan(value: Any) -> Any:
    if isinstance(value, dict) and "planner_handoff" in value:
        return value["planner_handoff"]
    return value


def normalize_trace(value: Any) -> Any:
    if isinstance(value, dict):
        if "loop_trace" in value:
            return value["loop_trace"]
        if "pipeline_trace" in value:
            return value["pipeline_trace"]
    return value


def detect_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    state: dict[str, str] = {}
    stack: list[str] = []

    def visit(node: str) -> list[str] | None:
        state[node] = "visiting"
        stack.append(node)
        for dep in graph.get(node, []):
            dep_state = state.get(dep)
            if dep_state == "visiting":
                start = stack.index(dep)
                return stack[start:] + [dep]
            if dep_state is None:
                cycle = visit(dep)
                if cycle:
                    return cycle
        stack.pop()
        state[node] = "visited"
        return None

    for node in graph:
        if state.get(node) is None:
            cycle = visit(node)
            if cycle:
                return cycle
    return None


def validate_plan(value: Any) -> list[str]:
    data = normalize_plan(value)
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["plan: expected a JSON object or planner_handoff wrapper"]

    add_missing(errors, data, PLAN_REQUIRED, "plan")
    for field in ["planning_mode", "rollback_notes"]:
        if field in data and not is_non_empty_string(data[field]):
            errors.append(f"plan.{field}: expected non-empty string")
    for field in ["alternatives_considered", "execution_phases", "acceptance_criteria", "non_goals", "risk_mitigations"]:
        if field in data and not isinstance(data[field], list):
            errors.append(f"plan.{field}: expected list")

    strategy = data.get("chosen_strategy")
    if not isinstance(strategy, dict):
        if "chosen_strategy" in data:
            errors.append("plan.chosen_strategy: expected object")
    else:
        add_missing(errors, strategy, STRATEGY_REQUIRED, "plan.chosen_strategy")
        for field in STRATEGY_REQUIRED:
            if field in strategy and not is_non_empty_string(strategy[field]):
                errors.append(f"plan.chosen_strategy.{field}: expected non-empty string")

    phases = data.get("execution_phases")
    if not isinstance(phases, list):
        return errors
    if not phases:
        errors.append("plan.execution_phases: expected at least one phase")
        return errors

    ids: set[str] = set()
    graph: dict[str, list[str]] = {}
    for index, phase in enumerate(phases):
        prefix = f"plan.execution_phases[{index}]"
        if not isinstance(phase, dict):
            errors.append(f"{prefix}: expected object")
            continue
        add_missing(errors, phase, PHASE_REQUIRED, prefix)
        pid = phase.get("id")
        if not is_non_empty_string(pid):
            errors.append(f"{prefix}.id: expected unique non-empty string")
            continue
        if pid in ids:
            errors.append(f"{prefix}.id: duplicate phase id '{pid}'")
        ids.add(pid)
        deps = phase.get("depends_on")
        if not isinstance(deps, list):
            errors.append(f"{prefix}.depends_on: expected list")
            graph[pid] = []
        else:
            bad_deps = [dep for dep in deps if not is_non_empty_string(dep)]
            for dep in bad_deps:
                errors.append(f"{prefix}.depends_on: dependency values must be non-empty strings (got {dep!r})")
            graph[pid] = [dep for dep in deps if is_non_empty_string(dep)]
        for field in ["name", "description"]:
            if field in phase and not is_non_empty_string(phase[field]):
                errors.append(f"{prefix}.{field}: expected non-empty string")
        for field in ["files_affected", "exact_changes", "acceptance_criteria", "verification_commands"]:
            if field in phase and not isinstance(phase[field], list):
                errors.append(f"{prefix}.{field}: expected list")

    for pid, deps in graph.items():
        for dep in deps:
            if dep not in ids:
                errors.append(f"plan.execution_phases: phase '{pid}' depends on unknown phase '{dep}'")
    if not any("depends on unknown" in error for error in errors):
        cycle = detect_cycle(graph)
        if cycle:
            errors.append(f"plan.execution_phases: dependency cycle detected: {' -> '.join(cycle)}")
    return errors


def validate_trace(value: Any) -> list[str]:
    data = normalize_trace(value)
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["loop_trace: expected a JSON object or loop_trace/pipeline_trace wrapper"]

    add_missing(errors, data, TRACE_REQUIRED, "loop_trace")
    for field in ["trace_id", "issue_summary", "started_at", "completed_at"]:
        if field in data and not is_non_empty_string(data[field]):
            errors.append(f"loop_trace.{field}: expected non-empty string")
    if "disposition" in data and data["disposition"] not in VALID_DISPOSITIONS:
        errors.append(f"loop_trace.disposition: expected one of {sorted(VALID_DISPOSITIONS)}")
    if "iterations" in data and (not isinstance(data["iterations"], int) or data["iterations"] < 0):
        errors.append("loop_trace.iterations: expected non-negative integer")
    events = data.get("events")
    if not isinstance(events, list):
        if "events" in data:
            errors.append("loop_trace.events: expected list")
        return errors

    for index, event in enumerate(events):
        prefix = f"loop_trace.events[{index}]"
        if not isinstance(event, dict):
            errors.append(f"{prefix}: expected object")
            continue
        add_missing(errors, event, EVENT_REQUIRED, prefix)
        if "timestamp" in event and not is_non_empty_string(event["timestamp"]):
            errors.append(f"{prefix}.timestamp: expected non-empty string")
        if "step" in event and event["step"] not in VALID_STEPS:
            errors.append(f"{prefix}.step: expected one of {sorted(VALID_STEPS)}")
        for field in ["iteration", "duration_ms", "token_estimate", "artifact_size_tokens"]:
            if field in event and (not isinstance(event[field], int) or event[field] < 0):
                errors.append(f"{prefix}.{field}: expected non-negative integer")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate deliver plan or loop-trace JSON artifacts")
    parser.add_argument("--type", required=True, choices=["plan", "loop-trace"], help="Artifact type to validate")
    parser.add_argument("file", nargs="?", help="JSON file path; reads stdin when omitted")
    args = parser.parse_args(argv)

    try:
        data = load_json(read_input(args.file))
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    errors = validate_plan(data) if args.type == "plan" else validate_trace(data)
    if errors:
        for error in errors:
            print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"OK: valid {args.type} artifact")
    return 0


if __name__ == "__main__":
    sys.exit(main())
