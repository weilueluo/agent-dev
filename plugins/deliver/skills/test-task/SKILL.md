---
name: test-task
description: "Validate implementation against acceptance criteria. Classifies failures, estimates confidence, reports residual risk."
version: 5.0.0
---

# test-task

Verify implementation through external checks. Ground truth, not reasoning.

## When to Use

- As the Verify step in the deliver loop (after Implement)
- Standalone: when asked to validate/test an implementation

## Inputs

- **contract**: goals, constraints, testable success criteria
- **plan**: the proposed plan with acceptance criteria
- **implementation_report**: what changed and where to focus
- **critic_report**: what the critic found (may highlight areas to test harder)

## Process

1. Map each success criterion to a verification method: existing test, new test, type check, lint, build, or mechanical inspection. Report untested criteria.
2. Establish baseline — run existing tests before changes if practical.
3. Run checks in order: build → typecheck → lint → existing tests.
4. Write tests for gaps — add tests for uncovered criteria following project conventions.
5. Run full test suite including new tests.
6. Classify failures: blocking (must fix) / degraded (should fix) / cosmetic (defer).
7. Map results to contract criteria: pass / partial / fail / untested.
8. Estimate confidence: high (>90%) / medium (70-90%) / low (<70%).
9. Report residual risk and blocking failure count.

## Output

Verify report: checks run + results, criteria status, failures classified, coverage gaps, residual risk, confidence, blocking failure count.
