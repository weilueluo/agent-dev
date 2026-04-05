---
name: plan-task
description: "Create an execution plan with strategy comparison, phased implementation, dependency graph, and acceptance criteria."
version: 5.0.0
---

# plan-task

Generate a strategy and phased execution plan. Used as the planning step within the deliver loop, or standalone for plan-only tasks.

## When to Use

- As the Plan step in the deliver loop
- When revising a plan based on critic feedback
- Standalone: when asked to plan without full delivery

## Inputs

- **contract**: goals, constraints, testable success criteria
- **exploration_report**: exploration findings
- **task_description**: original request
- **critic_report** (optional): previous critic feedback if revising
- **verify_report** (optional): previous verifier results if revising
- **iteration**: which loop iteration (1, 2, or 3)

## Process

1. Absorb the contract. Every success criterion must trace to a verifiable check. Flag untestable criteria.
2. Absorb exploration findings. Request re-exploration if blocking unknowns remain.
3. If revising (iteration 2+): address every blocking issue from critic/verifier. Show what changed and why.
4. Consult `knowledge/planning-patterns.md`.
5. Prefer simple, correct, testable solutions. Complexity must be justified.
6. Generate strategy — compare alternatives briefly if warranted. Choose one with rationale.
7. Design execution phases with dependencies and acceptance criteria. Follow `reference/plans-and-exec-plans.md`. Each criterion must be externally verifiable.
8. Define non-goals.
9. Document mitigations and rollback.

## Output

Plan: strategy with rationale, execution phases (id, depends_on, description, acceptance criteria), non-goals, mitigations, rollback. Each criterion traces to the contract.

## Escalation

- Blocking unknowns → request re-exploration
- No viable strategy → report to user
- Untestable criterion → flag to orchestrator
