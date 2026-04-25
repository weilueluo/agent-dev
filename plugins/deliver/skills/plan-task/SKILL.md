---
name: plan-task
description: "Create an issue-resolution plan with strategy comparison, phased work, dependency graph, and acceptance criteria."
version: 7.2.0
---

# plan-task

Generate a strategy and phased work plan. Used as the planning step within the deliver loop, or standalone for plan-only tasks.

## When to Use

- As the Plan step in the deliver issue-resolution loop
- When revising a plan based on plan-review or work-review feedback
- Standalone: when asked to plan without doing the work

## Inputs

- **contract**: issue, desired outcome, constraints, verifiable success criteria
- **exploration_report**: exploration findings
- **task_description**: original request
- **plan_review_report** (optional): previous plan-review feedback if revising
- **review_report** (optional): previous work-review results if revising
- **iteration**: current loop iteration, if revising

## Process

1. Absorb the contract. Every success criterion must trace to a verifiable check. Flag untestable criteria.
2. Absorb exploration findings. Request targeted re-exploration if blocking unknowns remain.
3. If revising: address every blocking issue from prior reviews. Show what changed and why.
4. Consult `../../knowledge/planning-patterns.md`.
5. Prefer simple, correct, testable solutions. Extra process or coordination must earn its keep.
6. Generate strategy — compare alternatives briefly if warranted. Choose one with rationale.
7. Design work phases with phase-level `depends_on` and acceptance criteria. Follow `../deliver/reference/plans-and-exec-plans.md` and `../../schemas/plan.schema.json`. Each criterion must be externally or mechanically verifiable.
8. Define non-goals.
9. Document mitigations and rollback/recovery.

## Output

Plan artifact aligned to `../../schemas/plan.schema.json`: `planning_mode`, `chosen_strategy` (`name`, `summary`, `rationale`), `alternatives_considered`, `execution_phases`, `acceptance_criteria`, `non_goals`, `risk_mitigations`, and `rollback_notes`. Each phase includes `id`, `name`, `depends_on`, `files_affected`, `description`, `exact_changes`, `acceptance_criteria`, and `verification_commands`.

Use phase-level `depends_on` only; do not emit a top-level `dependencies` list. Each criterion traces to the contract.

## Escalation

- Blocking unknowns -> request targeted re-exploration
- No viable strategy -> report to user
- Untestable criterion -> flag to orchestrator
