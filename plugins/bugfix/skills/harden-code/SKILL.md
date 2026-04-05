---
name: harden-code
description: "Systemic prevention after a bug fix. Use when a bug has been fixed and verified, to prevent recurrence. Don't use before the fix is confirmed or for general code improvement."
version: 1.0.0
---

# harden-code

Prevent this class of bug from recurring. Analyze the systemic weakness, implement guards, and recommend process improvements.

## When to Use

Use after a bug has been fixed and verified. The fix addresses the specific instance; hardening addresses the class of bugs it belongs to.

**Don't use** before the fix is confirmed (use bugfix orchestrator for the full loop), for general refactoring (use deliver), or for code improvement unrelated to a specific bug.

## Inputs

- `diagnosis_report` (root cause, 5-whys chain, affected code paths)
- `fix_report` (files changed, fix explanation)
- `verify_report` (test results, regression status)

## Process

1. **Analyze systemic weakness** — what allowed this bug? Missing type constraint? Missing validation? Missing test? Missing documentation of an invariant? Unclear specification?
2. **Categorize prevention** — separate immediate actions (safe to do now) from future recommendations (needs team decision or larger scope).
3. **Implement immediate guards:**
   - Type annotations narrowing parameters
   - Input validation with descriptive errors
   - Assertions at function entry points
   - Doc comments explaining non-obvious invariants
   - Additional test cases covering the edge case
4. **Scan for similar patterns** — search the codebase for the same anti-pattern using grep/glob. Report all instances found with file paths.
5. **Document future recommendations:**
   - Linter rules that would catch this pattern
   - CI checks or PR review checklists
   - Architectural guards (stronger types, better abstractions)
   - Test patterns (property-based tests, boundary tests)
6. **Name the prevention pattern** — create a reusable label for this class of bug (e.g., "unchecked-null-from-query", "missing-boundary-validation").

## Output

`harden_report`:
- Root weakness analysis (what systemic gap allowed the bug)
- Immediate actions taken (file paths, what was added)
- Future recommendations (priority-ordered)
- Similar-risk locations in codebase (file paths, pattern description)
- Prevention pattern name

## Rules

- **Don't refactor.** That's deliver's job. Add guards at boundaries.
- **Immediate actions must be minimal and safe** — annotations, assertions, validation, tests. Not architectural changes.
- **Separate do-now from recommend-later.** Team decisions belong in recommendations, not immediate actions.
- **Check for similar patterns elsewhere.** The same bug likely exists in analogous code.

Reference `knowledge/prevention-patterns.md` for guard patterns and strategies.
