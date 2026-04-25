---
name: critique-plan
description: "Review a plan before work begins. Checks completeness, feasibility, sequencing, assumptions, risks, and criteria clarity."
version: 7.2.0
---

# critique-plan

Adversarial review of a plan. Challenges the plan before work begins.

## When to Use

- As the Review Plan step in the deliver loop (after Plan, before Work)
- Standalone: when asked to review or critique a plan

## Inputs

- **contract**: issue, desired outcome, constraints, verifiable success criteria
- **exploration_report**: exploration findings for cross-reference
- **plan**: the proposed plan
- **iteration**: current loop iteration, if revising
- **previous_plan_review_report** (optional): to avoid repeating yourself

## Process

1. Check contract coverage — every goal, constraint, non-goal, and criterion addressed?
2. Cross-reference exploration — risk hotspots handled? Unknowns resolved?
3. Review plan quality — sequencing, dependencies, acceptance clarity, rollback/recovery.
4. Check anti-patterns from `../../knowledge/planning-patterns.md`.
5. Evaluate against `dev:principles` — test strategy, clear boundaries, observability, safe automation.
6. Optionally run deterministic checks with `../../scripts/score_plan.py` and `../../scripts/validate_artifacts.py` using `--type plan`.
7. If revising: are previous blocking issues fixed? New issues? Improvement?

## Output

Plan review report:
- **Issues**: description, evidence, severity (blocking/high/medium/low), suggested fix.
- **Strengths**: what works well.
- **Improvement assessment** (when revising): better, same, or worse.
- **Signal**: exactly one of:
  - `accept` — plan is sound enough to execute
  - `revise-plan` — strategy, sequencing, criteria, or risk handling has flaws (specify what)
  - `re-explore` — critical context missing (specify the gap)
