---
name: test-task
description: "Review completed work against acceptance criteria. Classifies failures, estimates confidence, reports residual risk."
version: 7.0.0
---

# test-task

Review completed work through external checks and inspectable evidence. Ground truth, not reasoning.

## When to Use

- As the Review Work step in the deliver loop (after Work)
- Standalone: when asked to validate, test, or review completed work

## Inputs

- **contract**: issue, desired outcome, constraints, verifiable success criteria
- **plan**: the accepted plan with acceptance criteria
- **work_report**: what changed and where to focus
- **plan_review_report**: what plan review found (may highlight areas to test harder)

## Process

1. Map each success criterion to a verification method: existing test, new test, type check, lint, build, command output, trace, artifact inspection, source citation, or human approval. Report untested criteria.
2. Establish baseline before changes if practical.
3. For code work, run checks in order when available: build -> typecheck -> lint -> existing tests.
4. Add tests or mechanical checks for uncovered criteria following project conventions.
5. Run the relevant full check set including new checks.
6. For non-code work, inspect the artifact against the contract, cited sources, consistency, audience needs, and stated non-goals.
7. Classify failures: blocking (must fix) / degraded (should fix) / cosmetic (defer).
8. Map results to contract criteria: pass / partial / fail / untested.
9. Estimate confidence: high (>90%) / medium (70-90%) / low (<70%).
10. Report residual risk and blocking issue count.

## Output

Review report: checks run + results, criteria status, failures classified, coverage gaps, residual risk, confidence, blocking issue count.
