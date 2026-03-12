---
name: test-task
description: "Validate implementation against acceptance criteria. Classifies failures, estimates confidence, reports residual risk."
version: 2.1.0
---

# test-task

Verify the implementation works and assess delivery readiness.

## When to Use

- After implementation completes
- When re-validating after revisions

## Inputs

- **implementer_handoff**: What changed and where to focus
- **planner_handoff**: Acceptance criteria to validate against
- **mode**: Testing depth (quick/standard/deep/high-risk)

## Process

See `agents/tester.agent.md` for the full reasoning framework. Key steps: map criteria to checks → establish baseline → run checks → write tests for gaps → classify failures → assess per-criterion status → estimate confidence → document residual risk.

## Output

A `tester_handoff` per `knowledge/handoff-schemas.md`: validation strategy, checks run with results, failures classified, coverage gaps, residual risk, confidence level, and recommendation (proceed / revise / replan).
