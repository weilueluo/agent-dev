---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 2.1.0
---

# deliver

Run the full agent-pipeline for a software task.

## When to Use

When a task benefits from structured exploration, planning, implementation, testing, and review. Not needed for trivial one-line changes.

## Inputs

- **$ARGUMENTS**: Task description from the user
- **mode** (optional): quick, standard, deep, or high-risk. Auto-detected if not specified.

## Process

The orchestrator agent manages the pipeline. See `agents/orchestrator.agent.md` for mode selection and stage sequencing details.

## Recovery

- Reviewer *revise* → back to implementer (max 2)
- Reviewer *replan* → back to planner via replanner (max 1)
- Tester *revise* → back to implementer (max 2)
- Critic *revise-plan* → back to planner (max 2)
- Critic *re-explore* → back to explorer (max 1)

## Output

A delivery report summarizing: task, mode, stages executed, final disposition, files changed, confidence, and follow-ups.
