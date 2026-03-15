---
name: implement-task
description: "Execute plan phases incrementally with self-checks, deviation tracking, and clean handoff to testing."
version: 3.0.0
---

# implement-task

Turn an approved plan into working changes.

## When to Use

- After a plan is accepted
- When revising after feedback

## Inputs

- **plan**: The approved plan
- **current_phase**: Phase id to execute (or all phases)
- **exploration_report**: Codebase conventions and context
- **revision_context** (optional): Issues to fix if revising

## Process

1. Read the phase — files, criteria, dependencies
2. Check prerequisites — dependency phases completed? Target files exist?
3. Plan minimal change set — what implicit steps are needed?
4. Implement incrementally, following existing conventions
5. Verify — build, typecheck, lint if available; walk acceptance criteria; check for strategy conflict and unrelated changes
6. Document — files changed, deviations, unresolved issues, test focus areas

## Output

Implementation report: phase status, files changed with summaries, deviations from plan, unresolved issues, test focus areas. Follow `knowledge/handoff-schemas.md` for structure.

## Escalation

- Plan assumption wrong → report blocked, recommend replan
- New requirement discovered → document as unresolved, don't implement it
