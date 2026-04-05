---
name: explore-task
description: "Structured repository exploration. Use before planning to map relevant files, surface constraints, identify unknowns and risks."
version: 5.0.0
---

# explore-task

Explore a repository to build context for planning. Used as the Explore step in the deliver loop, or standalone.

## When to Use

- At the start of the deliver loop (Step 2)
- When critic signals `re-explore` for a specific gap (targeted re-explore)
- Standalone: when asked to explore/understand a codebase

## Inputs

- **contract**: goals, constraints, testable success criteria
- **task_description**: what needs to be done
- **re_explore_guidance** (optional): specific gaps to investigate. When present, do targeted investigation only.

## Process

1. Frame the task from the contract. What does "done" look like?
2. Orient — structure, tech stack, conventions, AGENTS.md.
3. Map relevant files — role and risk for each.
4. Surface constraints — explicit (contract, CI, docs) and implicit (conventions, patterns).
5. Catalog known facts for planning.
6. Identify unknowns — classify as blocking, important, or minor.
7. Flag risk hotspots.
8. Note investigation gaps.

For targeted re-exploration: skip 1-3, focus on the specific gap. Return only new findings.

## Output

Exploration report: objective, task type, relevant files with roles and risk, constraints, known facts, unknowns (classified), risk hotspots, gaps.

## Escalation

- Task too vague → request clarification
- Critical unknowns that block all planning → state them explicitly
