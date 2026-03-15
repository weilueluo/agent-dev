---
name: explore-task
description: "Structured repository exploration. Use before planning to map relevant files, surface constraints, identify unknowns and risks."
version: 3.0.0
---

# explore-task

Explore a repository to build context for informed planning.

## When to Use

- Before planning any nontrivial change
- When entering an unfamiliar codebase area
- When re-exploration is needed due to gaps

## Inputs

- **task_description**: What needs to be done
- **mode**: Exploration depth (quick/standard/deep/high-risk)
- **focus_guidance** (optional): Specific areas to investigate if re-exploring

## Process

Work through these areas, spending more time on each as the mode gets deeper:

1. Frame the task — what does "done" look like?
2. Orient — project structure, tech stack, conventions
3. Map relevant files — what matters and how risky is each?
4. Surface constraints — explicit and implicit
5. Catalog known facts needed for planning
6. Identify unknowns — classify as blocking, important, or minor
7. Flag risk hotspots
8. Note investigation gaps

In deep/high-risk modes, also check git history for recent changes.

## Output

An exploration report covering: objective, task type, relevant files with roles and risk, constraints, known facts, unknowns (classified by severity), risk hotspots, investigation gaps. Use `knowledge/handoff-schemas.md` as a guide.

## Escalation

- Task too vague → request clarification
- Critical unknowns that block all planning → state them explicitly
