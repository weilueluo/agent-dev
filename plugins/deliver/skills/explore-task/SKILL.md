---
name: explore-task
description: "Structured repository exploration. Use before planning to map relevant files, surface constraints, identify unknowns and risks."
version: 4.0.0
---

# explore-task

Explore a repository to build context for informed planning.

## When to Use

- At the start of the GAN loop (Step 2 — Explore)
- When the critic or verifier signals an exploration gap (targeted re-explore)

## Inputs

- **contract**: Goals, constraints, and testable success criteria for the task
- **task_description**: What needs to be done
- **re_explore_guidance** (optional): Specific gaps to investigate if re-exploring. When present, do a targeted investigation — do not re-run full exploration.

## Process

Work through these areas:

1. Frame the task — restate the objective from the contract. What does "done" look like in terms of the success criteria?
2. Orient — project structure, tech stack, conventions
3. Look for AGENTS.md and architecture docs — note if missing or stale (Build for AI). Map layer dependencies and flag violations (Clear Boundary).
4. Map relevant files — what matters and how risky is each?
5. Surface constraints — explicit (from contract, CI, docs) and implicit (conventions, patterns)
6. Catalog known facts needed for planning
7. Identify unknowns — classify as blocking, important, or minor
8. Flag risk hotspots
9. Note investigation gaps

For targeted re-exploration: skip steps 1-3, focus directly on the specific gap identified by the critic or verifier.

## Output

An exploration report covering: objective, task type, relevant files with roles and risk, constraints, known facts, unknowns (classified by severity), risk hotspots, investigation gaps.

## Escalation

- Task too vague → request clarification
- Critical unknowns that block all planning → state them explicitly
