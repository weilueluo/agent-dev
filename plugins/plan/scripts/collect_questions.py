#!/usr/bin/env python3
"""
collect_questions.py — Combine and deduplicate clarification questions from worker outputs.

Reads JSON outputs from ambiguity-reviewer, risk-reviewer, and problem-framing-reviewer,
then produces a prioritized, deduplicated list of questions for the clarification loop.

Usage:
    python collect_questions.py ambiguity.json risk.json framing.json
    cat combined.json | python collect_questions.py
"""

import sys
import json
import argparse
from difflib import SequenceMatcher

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_input(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print("Error: Input is not valid JSON.", file=sys.stderr)
        return None


def extract_questions(data, source):
    """Extract all suggested questions from a worker output."""
    questions = []

    def walk(obj, path=""):
        if isinstance(obj, dict):
            q = obj.get("suggested_question", "")
            if q and isinstance(q, str) and q.strip():
                priority = "should-ask"
                if obj.get("impact") in ("must-include", "blocking"):
                    priority = "must-ask"
                if obj.get("priority"):
                    priority = obj["priority"]

                questions.append({
                    "question": q.strip(),
                    "source": source,
                    "context": obj.get("area", obj.get("scenario", obj.get("risk", obj.get("assumption", "")))),
                    "priority": priority,
                    "path": path,
                })
            for k, v in obj.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk(item, f"{path}[{i}]")

    walk(data)

    # Also extract from priority_summary and framing_questions if present
    priority_summary = data.get("ambiguity_review", {}).get("priority_summary", {})
    if isinstance(priority_summary, dict):
        for q in priority_summary.get("must_resolve", []):
            if isinstance(q, str) and q.strip() and not any(eq["question"] == q for eq in questions):
                questions.append({
                    "question": q.strip(),
                    "source": source,
                    "context": "priority_summary",
                    "priority": "must-ask",
                    "path": "priority_summary.must_resolve",
                })
        for q in priority_summary.get("should_resolve", []):
            if isinstance(q, str) and q.strip() and not any(eq["question"] == q for eq in questions):
                questions.append({
                    "question": q.strip(),
                    "source": source,
                    "context": "priority_summary",
                    "priority": "should-ask",
                    "path": "priority_summary.should_resolve",
                })
        for q in priority_summary.get("can_default", []):
            if isinstance(q, str) and q.strip() and not any(eq["question"] == q for eq in questions):
                questions.append({
                    "question": q.strip(),
                    "source": source,
                    "context": "priority_summary",
                    "priority": "can-default",
                    "path": "priority_summary.can_default",
                })

    framing_questions = data.get("framing_review", {}).get("framing_questions", [])
    for fq in framing_questions:
        if isinstance(fq, dict):
            q = fq.get("question", "")
            if q.strip() and not any(eq["question"] == q for eq in questions):
                questions.append({
                    "question": q.strip(),
                    "source": source,
                    "context": fq.get("purpose", ""),
                    "priority": fq.get("priority", "should-ask"),
                    "path": "framing_questions",
                })

    return questions


def similarity(a, b):
    """Compute string similarity ratio between two questions."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def deduplicate(questions, threshold=0.75):
    """Deduplicate questions by string similarity. Keep the best formulation."""
    groups = []

    for q in questions:
        merged = False
        for group in groups:
            for member in group:
                if similarity(q["question"], member["question"]) >= threshold:
                    group.append(q)
                    merged = True
                    break
            if merged:
                break
        if not merged:
            groups.append([q])

    deduped = []
    for group in groups:
        # Pick the longest (most detailed) question as representative
        best = max(group, key=lambda x: len(x["question"]))
        sources = sorted(set(m["source"] for m in group))
        # Boost priority if multiple agents flagged the same question
        priority = best["priority"]
        if len(sources) > 1 and priority == "should-ask":
            priority = "must-ask"

        deduped.append({
            "question": best["question"],
            "sources": sources,
            "context": best["context"],
            "priority": priority,
            "convergence": len(sources),
        })

    return deduped


def prioritize(questions):
    """Sort questions by priority: must-ask first, then should-ask, then can-default."""
    priority_order = {"must-ask": 0, "should-ask": 1, "can-default": 2}
    return sorted(questions, key=lambda q: (
        priority_order.get(q["priority"], 3),
        -q.get("convergence", 1),
    ))


def format_output(questions):
    """Format questions as a readable summary."""
    lines = ["=" * 60, "CLARIFICATION QUESTIONS", "=" * 60, ""]

    by_priority = {"must-ask": [], "should-ask": [], "can-default": []}
    for q in questions:
        by_priority.get(q["priority"], by_priority["should-ask"]).append(q)

    for priority, label in [("must-ask", "MUST ASK"), ("should-ask", "SHOULD ASK"), ("can-default", "CAN DEFAULT")]:
        items = by_priority[priority]
        if not items:
            continue
        lines.append(f"## {label} ({len(items)} questions)")
        for i, q in enumerate(items, 1):
            sources = ", ".join(q["sources"])
            convergence = f" [convergence: {q['convergence']}]" if q["convergence"] > 1 else ""
            lines.append(f"  {i}. {q['question']}")
            lines.append(f"     Sources: {sources}{convergence}")
            if q.get("context"):
                lines.append(f"     Context: {q['context']}")
        lines.append("")

    lines.append("=" * 60)
    total = len(questions)
    must = len(by_priority["must-ask"])
    should = len(by_priority["should-ask"])
    can_default = len(by_priority["can-default"])
    lines.append(f"Total: {total} | Must-ask: {must} | Should-ask: {should} | Can-default: {can_default}")
    lines.append("=" * 60)

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Collect and deduplicate clarification questions")
    parser.add_argument("files", nargs="*", help="Worker output JSON files (reads stdin if omitted)")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of text")
    parser.add_argument("--threshold", type=float, default=0.75, help="Similarity threshold for dedup (0-1)")
    args = parser.parse_args()

    all_questions = []

    if args.files:
        source_names = {
            "ambiguity": "ambiguity-reviewer",
            "risk": "risk-reviewer",
            "framing": "problem-framing-reviewer",
        }
        for filepath in args.files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
                data = load_input(text)
                if data:
                    source = "unknown"
                    for key, name in source_names.items():
                        if key in filepath.lower():
                            source = name
                            break
                    all_questions.extend(extract_questions(data, source))
            except FileNotFoundError:
                print(f"Warning: {filepath} not found, skipping", file=sys.stderr)
    else:
        text = sys.stdin.read()
        if not text.strip():
            print("Usage: collect_questions.py [ambiguity.json risk.json framing.json]", file=sys.stderr)
            sys.exit(1)
        data = load_input(text)
        if data:
            # Combined input — try to detect source from structure
            if "ambiguity_review" in data:
                all_questions.extend(extract_questions(data, "ambiguity-reviewer"))
            if "risk_review" in data:
                all_questions.extend(extract_questions(data, "risk-reviewer"))
            if "framing_review" in data:
                all_questions.extend(extract_questions(data, "problem-framing-reviewer"))
            if not all_questions:
                all_questions.extend(extract_questions(data, "unknown"))

    if not all_questions:
        print("No questions found in input.", file=sys.stderr)
        sys.exit(0)

    deduped = deduplicate(all_questions, threshold=args.threshold)
    prioritized = prioritize(deduped)

    if args.json:
        print(json.dumps(prioritized, indent=2))
    else:
        print(format_output(prioritized))


if __name__ == "__main__":
    main()
