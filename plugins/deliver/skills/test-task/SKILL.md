---
name: test-task
description: "Validate implementation against acceptance criteria. Classifies failures, estimates confidence, reports residual risk."
version: 3.0.0
---

# test-task

Verify the implementation works and assess delivery readiness.

## When to Use

- After implementation completes
- When re-validating after revisions

## Inputs

- **implementation_report**: What changed and where to focus
- **plan**: Acceptance criteria to validate against
- **mode**: Testing depth (quick/standard/deep/high-risk)

## Process

1. Map each acceptance criterion to a verification method
2. Establish baseline — run existing tests first if possible
3. Run checks — build, typecheck, lint, test suite
4. Write tests for gaps following project conventions
5. Classify failures: blocking, degraded, cosmetic
6. Assess per-criterion status: passed, partial, failed, untested, blocked
7. Estimate confidence honestly — high (>90%), medium (70-90%), low (<70%)
8. Report residual risk

## Output

Test report: validation strategy, checks run with results, failures classified, coverage gaps, residual risk, confidence level, and recommendation (proceed / revise / replan).
