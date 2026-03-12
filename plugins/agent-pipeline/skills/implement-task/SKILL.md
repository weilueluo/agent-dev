---
name: implement-task
description: "Execute plan phases incrementally with self-checks, deviation tracking, and clean handoff to testing."
version: 2.1.0
---

# implement-task

Turn an approved plan into working changes.

## When to Use

- After a plan is accepted
- When revising after reviewer/tester feedback

## Inputs

- **planner_handoff**: The approved plan
- **current_phase**: Phase id to execute (or all phases)
- **exploration_report**: Codebase conventions and context
- **revision_context** (optional): Issues to fix if revising

## Process

See `agents/implementer.agent.md` for the full reasoning framework. Key steps: read phase → check prerequisites → plan changes → implement → verify (build/test/lint) → document results.

## Output

An `implementer_handoff` per `knowledge/handoff-schemas.md`: phase status, files changed with summaries, deviations from plan, unresolved issues, test focus areas.

## Escalation

- Plan assumption wrong → report blocked, recommend replan
- New requirement discovered → document as unresolved, don't implement it
