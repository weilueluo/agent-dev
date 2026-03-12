---
name: plan-task
description: "Create an execution plan with strategy comparison, phased implementation, dependency graph, and acceptance criteria."
version: 2.1.0
---

# plan-task

Generate a strategy and phased execution plan for a task.

## When to Use

- A task needs strategy before implementation
- Multiple approaches are possible
- Sequencing, dependencies, or risks matter

## Inputs

- **exploration_report**: Explorer handoff artifact
- **task_description**: Original request
- **mode**: Planning depth (quick/standard/deep/high-risk)
- **revision_guidance** (optional): Critic feedback if revising

## Process

See `agents/planner.agent.md` for the full reasoning framework. Key steps: absorb exploration → check knowledge files → choose perspectives → generate strategies → compare → choose → design phases → define criteria and non-goals → document mitigations.

## Output

A `planner_handoff` artifact per `knowledge/handoff-schemas.md`: planning mode, chosen strategy with rationale, alternatives considered, execution phases with dependencies and acceptance criteria, non-goals, risk mitigations, rollback notes.

## Escalation

- Critical unknowns block planning → return `re-explore`
- No viable strategy → report to orchestrator
