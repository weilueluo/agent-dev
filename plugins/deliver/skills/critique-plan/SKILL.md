---
name: critique-plan
description: "Evaluate a plan before implementation. Checks completeness, feasibility, sequencing, assumptions, risks, and criteria clarity."
version: 5.0.0
---

# critique-plan

Adversarial review of a plan. Challenges the plan before implementation begins.

## When to Use

- As the Critic step in the deliver loop (after Plan, before Implement)
- Standalone: when asked to review/critique a plan

## Inputs

- **contract**: goals, constraints, testable success criteria
- **exploration_report**: exploration findings for cross-reference
- **plan**: the proposed plan
- **iteration**: which loop iteration (1, 2, or 3)
- **previous_critic_report** (optional): to avoid repeating yourself

## Process

1. Check contract coverage — every goal, constraint, criterion addressed?
2. Cross-reference exploration — risk hotspots handled? Unknowns resolved?
3. Review plan quality — sequencing, dependencies, acceptance clarity, rollback.
4. Check anti-patterns from `knowledge/planning-patterns.md`.
5. Evaluate against `dev:principles` — test strategy? Typed interfaces? Reversible?
6. On iteration 2+: are previous blocking issues fixed? New issues? Improvement?

## Output

Critic report:
- **Issues**: description, evidence, severity (blocking/high/medium/low), suggested fix.
- **Strengths**: what works well.
- **Improvement assessment** (iteration 2+): better, same, or worse.
- **Signal**: exactly one of:
  - `accept` — plan is sound, proceed to implement
  - `revise-plan` — strategy or structure has flaws (specify what)
  - `re-explore` — critical context missing (specify the gap)
