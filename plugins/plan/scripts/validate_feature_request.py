#!/usr/bin/env python3
"""
validate_feature_request.py — Validate a feature request for completeness and quality.

Checks that a feature request markdown file has all required sections,
no forbidden content (TBD, open questions, implementation plans), and
meets quality standards.

Usage:
    python validate_feature_request.py feature-request.md
    cat feature-request.md | python validate_feature_request.py
"""

import sys
import re
import argparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


REQUIRED_SECTIONS = [
    "Problem Statement",
    "User Goal",
    "Context in Current Codebase",
    "Existing Related Functionality",
    "Proposed Feature",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Non-Goals",
    "Constraints",
    "Risks and Considerations",
    "Edge Cases",
    "Acceptance Criteria",
    "Explicit Decisions Made",
]

FORBIDDEN_PATTERNS = [
    (r"\bTBD\b", "Contains 'TBD' — all sections must be complete"),
    (r"\bTODO\b", "Contains 'TODO' — all sections must be complete"),
    (r"\bto be determined\b", "Contains 'to be determined' — resolve before finalizing"),
    (r"\bto be decided\b", "Contains 'to be decided' — resolve before finalizing"),
    (r"\bto be defined\b", "Contains 'to be defined' — resolve before finalizing"),
    (r"(?i)^#+\s*open\s+questions", "Contains 'Open Questions' section — this is forbidden"),
    (r"(?i)^#+\s*implementation\s+plan", "Contains 'Implementation Plan' section — this is forbidden"),
    (r"(?i)^#+\s*technical\s+approach", "Contains 'Technical Approach' section — this is forbidden"),
    (r"(?i)^#+\s*architecture", "Contains 'Architecture' section — feature requests describe what, not how"),
    (r"\[TBD\]", "Contains '[TBD]' placeholder"),
    (r"\[TODO\]", "Contains '[TODO]' placeholder"),
    (r"\[.*to be.*\]", "Contains placeholder with 'to be' — resolve before finalizing"),
]

QUALITY_CHECKS = [
    {
        "section": "Functional Requirements",
        "check": "has_items",
        "message": "Functional Requirements must contain at least one specific requirement",
    },
    {
        "section": "Acceptance Criteria",
        "check": "has_items",
        "message": "Acceptance Criteria must contain at least one verifiable criterion",
    },
    {
        "section": "Non-Goals",
        "check": "has_items",
        "message": "Non-Goals must list at least one explicit exclusion",
    },
    {
        "section": "Problem Statement",
        "check": "not_empty",
        "message": "Problem Statement must contain substantive content",
    },
    {
        "section": "User Goal",
        "check": "not_empty",
        "message": "User Goal must contain substantive content",
    },
    {
        "section": "Proposed Feature",
        "check": "not_empty",
        "message": "Proposed Feature must contain substantive content",
    },
]


def extract_sections(text):
    """Extract sections from markdown by heading."""
    sections = {}
    current_heading = None
    current_content = []

    for line in text.split("\n"):
        heading_match = re.match(r"^#{1,3}\s+(?:\d+\.\s+)?(.+)", line)
        if heading_match:
            if current_heading:
                sections[current_heading] = "\n".join(current_content).strip()
            current_heading = heading_match.group(1).strip()
            current_content = []
        elif current_heading:
            current_content.append(line)

    if current_heading:
        sections[current_heading] = "\n".join(current_content).strip()

    return sections


def check_required_sections(sections):
    """Check that all required sections are present."""
    issues = []
    found = []
    missing = []

    for required in REQUIRED_SECTIONS:
        matched = False
        for section_name in sections:
            if required.lower() in section_name.lower():
                matched = True
                found.append(required)
                break
        if not matched:
            missing.append(required)
            issues.append({
                "severity": "critical",
                "category": "missing_section",
                "message": f"Missing required section: {required}",
            })

    return found, missing, issues


def check_forbidden_content(text):
    """Check for forbidden patterns in the text."""
    issues = []
    for pattern, message in FORBIDDEN_PATTERNS:
        matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
        if matches:
            issues.append({
                "severity": "critical",
                "category": "forbidden_content",
                "message": message,
                "occurrences": len(matches),
            })
    return issues


def check_quality(sections):
    """Run quality checks on section content."""
    issues = []
    for check in QUALITY_CHECKS:
        section_name = check["section"]
        content = None
        for name, text in sections.items():
            if section_name.lower() in name.lower():
                content = text
                break

        if content is None:
            continue

        if check["check"] == "has_items":
            has_list_items = bool(re.search(r"^[\s]*[-*]|\b(FR|NFR|AC)-\d+\b", content, re.MULTILINE))
            has_table_rows = bool(re.search(r"\|[^|]+\|[^|]+\|", content))
            if not has_list_items and not has_table_rows:
                issues.append({
                    "severity": "major",
                    "category": "quality",
                    "message": check["message"],
                })

        elif check["check"] == "not_empty":
            cleaned = re.sub(r"\[.*?\]", "", content).strip()
            if len(cleaned) < 20:
                issues.append({
                    "severity": "major",
                    "category": "quality",
                    "message": check["message"],
                })

    return issues


def check_implementation_leakage(sections):
    """Check if implementation details leaked into the feature request."""
    issues = []
    impl_keywords = [
        r"\bclass\s+\w+",
        r"\bdef\s+\w+",
        r"\bfunction\s+\w+",
        r"\bimport\s+\w+",
        r"\brequire\(",
        r"\bCREATE TABLE\b",
        r"\bALTER TABLE\b",
        r"\bSELECT\s+.+FROM\b",
    ]

    for section_name, content in sections.items():
        if "codebase" in section_name.lower() or "existing" in section_name.lower():
            continue  # Repo context sections may reference code
        for pattern in impl_keywords:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append({
                    "severity": "minor",
                    "category": "implementation_leakage",
                    "message": f"Section '{section_name}' may contain implementation details (matched: {pattern})",
                })
                break

    return issues


def validate(text):
    """Run all validations on a feature request."""
    sections = extract_sections(text)
    all_issues = []

    found, missing, section_issues = check_required_sections(sections)
    all_issues.extend(section_issues)
    all_issues.extend(check_forbidden_content(text))
    all_issues.extend(check_quality(sections))
    all_issues.extend(check_implementation_leakage(sections))

    critical = sum(1 for i in all_issues if i["severity"] == "critical")
    major = sum(1 for i in all_issues if i["severity"] == "major")
    minor = sum(1 for i in all_issues if i["severity"] == "minor")

    passed = critical == 0 and major == 0
    recommendation = "valid" if passed else "needs-revision"

    return {
        "passed": passed,
        "recommendation": recommendation,
        "sections_found": len(found),
        "sections_missing": len(missing),
        "sections_required": len(REQUIRED_SECTIONS),
        "issues": {
            "critical": critical,
            "major": major,
            "minor": minor,
            "total": len(all_issues),
            "details": all_issues,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Validate a feature request")
    parser.add_argument("file", nargs="?", help="Feature request markdown file (reads stdin if omitted)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
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
        print("Usage: validate_feature_request.py <feature-request.md>", file=sys.stderr)
        sys.exit(1)

    results = validate(text)

    if args.json:
        import json
        print(json.dumps(results, indent=2))
    else:
        status = "PASSED ✓" if results["passed"] else "FAILED ✗"
        print("=" * 60)
        print(f"FEATURE REQUEST VALIDATION: {status}")
        print("=" * 60)
        print(f"\nSections: {results['sections_found']}/{results['sections_required']} present")

        if results["issues"]["total"] > 0:
            print(f"\nIssues: {results['issues']['critical']} critical, "
                  f"{results['issues']['major']} major, "
                  f"{results['issues']['minor']} minor")
            for issue in results["issues"]["details"]:
                icon = {"critical": "✗", "major": "⚠", "minor": "○"}[issue["severity"]]
                print(f"\n  {icon} [{issue['severity'].upper()}] {issue['message']}")
        else:
            print("\nNo issues found.")

        print(f"\n{'=' * 60}")
        print(f"RECOMMENDATION: {results['recommendation'].upper()}")
        print(f"{'=' * 60}")

    return 0 if results["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
