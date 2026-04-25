# Deliver

Generic issue-resolution loop — plan, work, review, and iterate until acceptance or escalation.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Loop

```
FRAME -> EXPLORE -> LOOP(PLAN -> REVIEW-PLAN -> VERIFY-REVIEW -> WORK -> REVIEW-WORK -> DECIDE)
```

- **Frame**: contract (issue, desired outcome, constraints, verifiable criteria)
- **Explore**: gather targeted context, surface unknowns, identify risks
- **Plan**: machine-checkable artifact following `schemas/plan.schema.json`
- **Review Plan**: adversarial plan review -> signal (accept / revise-plan / re-explore)
- **Verify Review**: validate reviewer findings against evidence, filter phantoms, confirm signal
- **Work**: execute the accepted plan incrementally
- **Review Work**: verify results against criteria with tests, checks, inspection, or cited evidence
- **Decide**: accept (verified) / continue (improving) / escalate (stalled, unsafe, or unclear)

## Structure

- `skills/` — deliver (orchestrator), explore-task, plan-task, critique-plan, implement-task, test-task, build-execution-graph
- `agents/` — explorer, planner, critic, critic-verifier, implementer, verifier
- `knowledge/planning-patterns.md` — Strategy, sequencing, convergence patterns, and learning log
- `schemas/` — Plan and loop trace contracts
- `scripts/` — Validation, plan scoring, DAG rendering

## Key Rules

- **Deliver is the orchestrator.** It drives the loop directly — do NOT delegate to another orchestrator.
- **Contract-first.** Every issue becomes desired outcome, constraints, non-goals, and verifiable criteria before work begins.
- **Plan before work.** The plan is reviewed before substantive or expensive work starts.
- **Schema-check artifacts.** Validate plans/traces with `scripts/validate_artifacts.py` when exact contracts matter.
- **Evidence is ground truth.** Tests, traces, source citations, command output, and artifact inspection outrank model confidence.
- **Stop conditions.** Verified -> accept. Improving -> continue. Stalled, unsafe, or unclear -> escalate.
- **Targeted re-explore only.** On `re-explore`, investigate the specific confirmed gap — do not restart full exploration.

## References

- `OPERATING-RULES.md` — Stop conditions, loop routing, handoff schema, context budget, versioning
- `skills/deliver/reference/skill-standards.md` — Agent Skills standards for maintaining this skill
- `schemas/plan.schema.json`, `schemas/loop-trace.schema.json` — Canonical artifacts
- `knowledge/planning-patterns.md` — Strategy, sequencing, convergence patterns, learning log
- `knowledge/eval-guide.md` — Loop evaluation methodology
- `knowledge/observability.md` — Structured trace format
