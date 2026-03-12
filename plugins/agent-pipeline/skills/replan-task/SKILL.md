---
name: replan-task
description: "Revise a failed strategy. Analyzes what went wrong, preserves valid work, and produces a materially different new plan."
version: 2.1.0
---

# replan-task

When the reviewer determines the strategy is fundamentally flawed, analyze the failure and design a new approach.

## When to Use

- Reviewer returned `replan`
- Strategy assumptions proved wrong or approach doesn't work

## Inputs

- **replan_handoff**: Reviewer's failure analysis
- **original_plan**: The plan that failed
- **exploration_report**: Original exploration context
- **implementer_handoff**: What was implemented before failure

## Process

1. **Analyze the failure** — what specifically went wrong and why?
2. **Assess salvageable work** — what from the original implementation is still valid?
3. **Generate a new strategy** — must be materially different from the failed one
4. **Produce revised phases** — accounting for valid completed work

## Output

A `replanner_handoff`: failure analysis, new strategy with rationale, revised phases, preserved vs discarded work, updated risk mitigations.

## Constraints

- Maximum 1 replan per pipeline run
- New strategy must be meaningfully different
- If no viable alternative → escalate to user
