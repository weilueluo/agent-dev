---
name: explore-task
description: "Structured exploration. Use before planning to map relevant files, artifacts, sources, constraints, unknowns, and risks."
version: 7.0.0
---

# explore-task

Explore a repository or artifact set to build context for planning. Used as the Explore step in the deliver loop, or standalone.

## When to Use

- At the start of the deliver issue-resolution loop
- When plan review signals `re-explore` for a specific gap (targeted re-explore)
- Standalone: when asked to explore or understand a codebase, document set, or system

## Inputs

- **contract**: issue, desired outcome, constraints, verifiable success criteria
- **task_description**: what needs to be resolved
- **re_explore_guidance** (optional): specific gaps to investigate. When present, do targeted investigation only.

## Process

1. Frame the issue from the contract. What does "done" look like?
2. Orient — structure, tech stack or domain, conventions, AGENTS.md, relevant docs.
3. Map relevant files, artifacts, tools, or sources — role and risk for each.
4. Surface constraints — explicit (contract, CI, docs, policies) and implicit (conventions, patterns).
5. Catalog known facts for planning.
6. Identify unknowns — classify as blocking, important, or minor.
7. Flag risk hotspots.
8. Note investigation gaps.

For targeted re-exploration: skip broad orientation, focus on the specific gap, and return only new findings.

## Output

Exploration report: objective, task type, relevant files/artifacts/sources with roles and risk, constraints, known facts, unknowns (classified), risk hotspots, gaps.

## Escalation

- Task too vague -> request clarification
- Critical unknowns that block all planning -> state them explicitly
