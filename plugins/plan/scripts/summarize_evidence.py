#!/usr/bin/env python3
"""
summarize_evidence.py — Normalize repository evidence into concise summaries.

Reads JSON evidence from worker agent outputs (stdin or file) and produces
a deduplicated, categorized summary suitable for the decision ledger.

Usage:
    python summarize_evidence.py evidence.json
    cat evidence.json | python summarize_evidence.py
"""

import sys
import json
import argparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_input(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print("Error: Input is not valid JSON.", file=sys.stderr)
        return None


def deduplicate_by_file(items):
    """Deduplicate evidence entries by file path, keeping the most detailed."""
    seen = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        path = item.get("file", item.get("path", ""))
        if not path:
            continue
        if path not in seen:
            seen[path] = item
        else:
            existing = seen[path]
            if len(item.get("relevance", "")) > len(existing.get("relevance", "")):
                seen[path] = item
    return list(seen.values())


def categorize_evidence(evidence):
    """Categorize evidence entries by type."""
    categories = {
        "code": [],
        "docs": [],
        "config": [],
        "tests": [],
        "schemas": [],
        "other": [],
    }

    related_code = evidence.get("related_code", [])
    related_docs = evidence.get("related_docs", [])
    related_config = evidence.get("related_config", [])
    existing_features = evidence.get("existing_features", [])
    patterns = evidence.get("patterns_to_follow", [])

    for item in related_code:
        if not isinstance(item, dict):
            continue
        path = item.get("file", "")
        if "test" in path.lower() or "spec" in path.lower():
            categories["tests"].append(item)
        elif "schema" in path.lower() or "migration" in path.lower():
            categories["schemas"].append(item)
        else:
            categories["code"].append(item)

    categories["docs"].extend(
        item for item in related_docs if isinstance(item, dict)
    )
    categories["config"].extend(
        item for item in related_config if isinstance(item, dict)
    )

    return {
        "categories": {
            k: deduplicate_by_file(v) for k, v in categories.items() if v
        },
        "existing_features": existing_features if isinstance(existing_features, list) else [],
        "patterns": patterns if isinstance(patterns, list) else [],
        "novelty_assessment": evidence.get("novelty_assessment", {}),
    }


def format_summary(categorized):
    """Format categorized evidence as a readable summary."""
    lines = ["=" * 60, "EVIDENCE SUMMARY", "=" * 60, ""]

    for category, items in categorized["categories"].items():
        lines.append(f"## {category.upper()} ({len(items)} items)")
        for item in items:
            path = item.get("file", item.get("path", "unknown"))
            relevance = item.get("relevance", item.get("summary", "no description"))
            lines.append(f"  - {path}")
            lines.append(f"    {relevance}")
        lines.append("")

    features = categorized["existing_features"]
    if features:
        lines.append(f"## EXISTING FEATURES ({len(features)} found)")
        for feat in features:
            if isinstance(feat, dict):
                name = feat.get("name", "unnamed")
                desc = feat.get("description", "no description")
                overlap = feat.get("overlap", "")
                lines.append(f"  - {name}: {desc}")
                if overlap:
                    lines.append(f"    Overlap: {overlap}")
        lines.append("")

    patterns = categorized["patterns"]
    if patterns:
        lines.append(f"## PATTERNS TO FOLLOW ({len(patterns)} found)")
        for pat in patterns:
            if isinstance(pat, dict):
                name = pat.get("pattern", "unnamed")
                example = pat.get("example", "")
                lines.append(f"  - {name}")
                if example:
                    lines.append(f"    Example: {example}")
        lines.append("")

    novelty = categorized["novelty_assessment"]
    if novelty:
        lines.append("## NOVELTY ASSESSMENT")
        is_new = novelty.get("is_genuinely_new", "unknown")
        evidence_text = novelty.get("evidence", "no evidence provided")
        lines.append(f"  Genuinely new: {is_new}")
        lines.append(f"  Evidence: {evidence_text}")
        lines.append("")

    lines.append("=" * 60)
    total = sum(len(v) for v in categorized["categories"].values())
    lines.append(f"Total evidence items: {total}")
    lines.append(f"Existing features: {len(features)}")
    lines.append(f"Patterns: {len(patterns)}")
    lines.append("=" * 60)

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Summarize repository evidence")
    parser.add_argument("file", nargs="?", help="Evidence JSON file (reads stdin if omitted)")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of text")
    args = parser.parse_args()

    text = ""
    if args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: {args.file} not found", file=sys.stderr)
            sys.exit(1)
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("Usage: summarize_evidence.py <evidence.json>", file=sys.stderr)
        sys.exit(1)

    evidence = load_input(text)
    if not evidence:
        sys.exit(1)

    categorized = categorize_evidence(evidence)

    if args.json:
        print(json.dumps(categorized, indent=2))
    else:
        print(format_summary(categorized))


if __name__ == "__main__":
    main()
