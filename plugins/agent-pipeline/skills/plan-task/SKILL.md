---
name: plan-task
description: "Create an execution plan with strategy comparison, phased implementation, dependency graph, and acceptance criteria."
version: 3.0.0
---

# plan-task

Generate a strategy and phased execution plan for a task.

## When to Use

- A task needs strategy before implementation
- Multiple approaches are possible
- Sequencing, dependencies, or risks matter

## Inputs

- **exploration_report**: Exploration findings
- **task_description**: Original request
- **mode**: Planning depth (quick/standard/deep/high-risk)
- **revision_guidance** (optional): Feedback if revising a plan

## Process

1. Absorb exploration findings. If blocking unknowns remain, request re-exploration.
2. Consult `knowledge/planning-patterns.md` and `knowledge/lessons-learned.md`
3. Choose perspectives relevant to this task (2-6 depending on complexity)
4. Generate strategies — one for quick/standard, compare 2-3 for deep/high-risk
5. Compare on alignment, feasibility, risk, complexity, maintainability, speed
6. Choose one and explain why
7. Design execution phases with dependencies and acceptance criteria
8. Define non-goals
9. Document mitigations and rollback

## Output

A plan covering: planning mode, chosen strategy with rationale, alternatives considered, execution phases with dependencies and acceptance criteria, non-goals, risk mitigations, rollback notes. Follow `knowledge/handoff-schemas.md` for structure.

## Escalation

- Critical unknowns block planning → request re-exploration
- No viable strategy → report to user
