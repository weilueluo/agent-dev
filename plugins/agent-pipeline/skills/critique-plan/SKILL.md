---
name: critique-plan
description: "Evaluate a plan before implementation. Checks completeness, feasibility, sequencing, assumptions, risks, and criteria clarity."
version: 2.1.0
---

# critique-plan

Review a plan and catch problems before implementation begins.

## When to Use

- Mandatory in deep and high-risk modes
- Recommended in standard mode for complex plans
- When re-evaluating a revised plan

## Inputs

- **plan_artifact**: The planner handoff
- **exploration_report**: Explorer handoff for cross-reference
- **iteration**: Which critique pass (1st, 2nd, etc.)

## Process

See `agents/plan-critic.agent.md` for the full reasoning framework. Key areas: cross-reference with exploration → evaluate dimensions (completeness, feasibility, sequencing, assumptions, risks, rollback, criteria) → check against anti-patterns in planning-patterns.md → decide.

## Output

A `critic_handoff` with: decision (accept / revise-plan / re-explore), dimension assessments, specific issues with suggestions, strengths to preserve, and actionable guidance.

## Escalation

- Plan not improving after 2 revisions → escalate to user
