---
name: implement-task
description: "Execute plan phases incrementally with self-checks, deviation tracking, and clean handoff to testing."
version: 5.0.0
---

# implement-task

Turn a plan into working changes. Used as the implementation step within the deliver loop, or standalone.

## When to Use

- As the Implement step in the deliver loop (after critic accepts the plan)
- Standalone: when asked to implement an existing plan

## Inputs

- **plan**: the plan to execute (phases, criteria, dependencies)
- **exploration_report**: codebase conventions and context
- **contract**: goals, constraints, testable success criteria
- **critic_report** (optional): previous critic feedback if revising
- **verify_report** (optional): previous verifier results if revising
- **iteration**: which loop iteration (1, 2, or 3)

## Process

1. Read the plan — files, criteria, dependencies, phases.
2. If iteration 2+: address every blocking issue from critic/verifier before proceeding.
3. Check prerequisites — dependency phases done? Files exist? Conventions understood?
4. Plan minimal change set before editing.
5. Implement incrementally following existing conventions.
6. Verify locally — build, typecheck, lint. Walk acceptance criteria. Check diff for unintended changes.
7. Document — files changed, deviations, unresolved issues, verification focus areas.

## Output

Implementation report: phase status, files changed with summaries, deviations (minor/significant/blocking), unresolved issues, verification focus areas.

## Deviations

- **Minor** (different approach, same goal): document and continue.
- **Significant** (extra files, different data flow): document with rationale, flag for critic.
- **Blocking** (plan assumption wrong): stop, document, signal to orchestrator.
