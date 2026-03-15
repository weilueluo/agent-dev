---
name: critique-plan
description: "Evaluate a plan before implementation. Checks completeness, feasibility, sequencing, assumptions, risks, and criteria clarity."
version: 3.0.0
---

# critique-plan

Review a plan and catch problems before implementation begins.

## When to Use

- Preferred in deep and high-risk modes
- Recommended for complex plans in standard mode
- When re-evaluating a revised plan

## Inputs

- **plan**: The plan to evaluate
- **exploration_report**: Exploration findings for cross-reference
- **iteration**: Which critique pass (1st, 2nd, etc.)

## Process

1. Cross-reference plan against exploration findings
2. Evaluate dimensions: completeness, feasibility, sequencing, dependency clarity, acceptance clarity, rollback readiness, risk coverage
3. Check against anti-patterns from `knowledge/planning-patterns.md`
4. In deep/high-risk mode, verify multiple strategies were considered
5. Decide: **accept**, **revise-plan**, or **re-explore**

## Output

Critique report with: decision, dimension assessments, specific issues with suggestions, strengths to preserve, and actionable guidance.

## Escalation

- Plan not improving after 2 revisions → escalate to user
