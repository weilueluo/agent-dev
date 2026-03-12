---
name: explore-task
description: "Structured repository exploration. Use before planning to map relevant files, surface constraints, identify unknowns and risks."
version: 2.1.0
---

# explore-task

Explore a repository to build context for informed planning.

## When to Use

- Before planning any nontrivial change
- When entering an unfamiliar codebase area
- When the critic requests re-exploration

## Inputs

- **task_description**: What needs to be done
- **mode**: Exploration depth (quick/standard/deep/high-risk)
- **focus_guidance** (optional): Specific areas to investigate if re-exploring

## Process

See `agents/explorer.agent.md` for the full reasoning framework. Key steps: frame task → orient to system → map files → surface constraints → catalog facts → identify unknowns → flag risks → note gaps.

## Output

An `explorer_handoff` artifact per `knowledge/handoff-schemas.md`: objective, task type, relevant files with roles and risk, constraints, known facts, unknowns (classified by severity), risk hotspots, investigation gaps.

## Escalation

- Task too vague → request clarification
- Critical unknowns that block all planning → state them explicitly
