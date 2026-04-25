---
name: implement-task
description: "Execute accepted plan phases incrementally with self-checks, deviation tracking, and clean handoff to review."
version: 7.1.0
---

# implement-task

Turn an accepted plan into completed work. Used as the Work step within the deliver loop, or standalone.

## When to Use

- As the Work step in the deliver loop (after plan review accepts the plan)
- Standalone: when asked to execute an existing plan

## Inputs

- **plan**: the accepted plan to execute (phases, criteria, dependencies)
- **exploration_report**: conventions and context
- **contract**: issue, desired outcome, constraints, verifiable success criteria
- **plan_review_report** (optional): previous plan-review feedback if revising
- **review_report** (optional): previous work-review results if revising
- **iteration**: current loop iteration, if revising

## Process

1. Read the plan — phases, criteria, dependencies, expected artifacts.
2. If revising: address every blocking issue from prior reviews before proceeding.
3. Check prerequisites — dependency phases done? Files/artifacts exist? Conventions understood?
4. Plan the minimal work set before editing or taking actions.
5. Execute incrementally following existing conventions.
6. Self-check locally — run appropriate quick checks, inspect changed artifacts, walk acceptance criteria, and check diff for unintended changes.
7. Document — phase status, files/artifacts changed, deviations, unresolved issues, review focus areas.

## Output

Work report: phase status, files/artifacts changed with summaries, deviations (minor/significant/blocking), unresolved issues, review focus areas.

## Deviations

- **Minor** (different approach, same goal): document and continue.
- **Significant** (extra files, different data flow, materially different artifact): document with rationale, flag for review.
- **Blocking** (plan assumption wrong): stop, document, signal to orchestrator.
