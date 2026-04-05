---
name: implement-task
description: "Execute plan phases incrementally with self-checks, deviation tracking, and clean handoff to verification."
version: 4.0.0
---

# implement-task

Turn a plan into working changes. Used as the implementation sub-step within the GAN loop's propose step.

## When to Use

- As the second sub-step of "propose" in the GAN loop (after planning)
- When revising implementation based on critic or verifier feedback

## Inputs

- **plan**: The plan to execute
- **exploration_report**: Codebase conventions and context
- **contract**: Goals, constraints, and testable success criteria
- **critic_report** (optional): Previous critic feedback if revising
- **verify_report** (optional): Previous verifier results if revising
- **iteration**: Which loop iteration (1, 2, or 3)
- **prior_implementation** (optional): What was implemented in previous iterations

## Process

1. Read the plan — files, criteria, dependencies, phases
2. If revising (iteration > 1): read critic report and verify report. Address every blocking issue before proceeding. Do not repeat the same mistake.
3. Check prerequisites — dependency phases completed? Target files exist? Conventions understood?
4. Plan minimal change set — prefer simple, correct, testable changes
5. Implement incrementally, following existing conventions
6. Verify locally — build, typecheck, lint if available; walk acceptance criteria; check for strategy conflict and unrelated changes
7. Document — files changed, deviations, unresolved issues, areas the verifier should focus on

When executing multiple phases, accumulate the file change list across phases for the combined handoff.

## Output

Implementation report: phase status, files changed with summaries, deviations from plan, unresolved issues, verification focus areas.

## Deviations

- **Minor** (different approach, same goal): document and continue.
- **Significant** (extra files, different data flow): document with rationale, flag for critic.
- **Blocking** (plan assumption wrong): stop, document, signal to orchestrator.

## Principles Alignment

- Write or update tests after each phase; prefer property-based tests for pure logic (Test-Centric)
- Enforce typed interfaces; parse inputs, don't validate (Clear Boundary)
- Add structured logging; never log secrets/PII (Observability)
- Leave traces for future agents: comments, specs, decision rationale (Feedback Loop)
- Never commit secrets; prefer reversible changes; pin dependencies (Safe Automation)
- Check latest official docs before using APIs (Tooling over Memory)
- Update AGENTS.md if the change affects project structure (Build for AI)
