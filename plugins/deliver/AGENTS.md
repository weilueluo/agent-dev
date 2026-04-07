# Deliver

Adversarial delivery pipeline — planner vs critic, grounded by external verification.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Loop

```
FRAME → EXPLORE → LOOP(PLAN → CRITIC → VERIFY-CRITIC → IMPLEMENT → VERIFY → DECIDE)
                                                                          max 3
```

- **Frame**: contract (goals, constraints, testable success criteria)
- **Explore**: map system, surface constraints, identify risks
- **Plan**: strategy + phased execution following `reference/plans-and-exec-plans.md`
- **Critic**: adversarial plan review → signal (accept / revise-plan / re-explore)
- **Verify Critic**: validate critic findings against evidence, filter phantoms, confirm signal
- **Implement**: execute plan incrementally
- **Verify**: external checks (build, test, lint, typecheck) + write tests for gaps
- **Decide**: accept (verified) / iterate (improving) / escalate (stalled or max)

## Structure

- `skills/` — deliver (orchestrator), explore-task, plan-task, critique-plan, implement-task, test-task, build-execution-graph
- `agents/` — explorer, planner, critic, critic-verifier, implementer, verifier
- `knowledge/planning-patterns.md` — Strategy and sequencing patterns
- `scripts/` — Plan scoring, DAG rendering

## Key Rules

- **Deliver is the orchestrator.** It drives the loop directly — do NOT delegate to another orchestrator.
- **Contract-first.** Every task becomes goals, constraints, and testable success criteria before work begins.
- **Critic before code.** Plan is adversarially challenged before implementation begins.
- **External verification is ground truth.** Tests, types, builds — not reasoning.
- **Stop conditions.** Verified → accept. No improvement after 2 iterations → escalate. Max 3 → escalate.
- **Targeted re-explore only.** On `re-explore` signal, investigate the specific gap — do not restart full exploration.

## References

- `OPERATING-RULES.md` — Stop conditions, loop routing, handoff schema, context budget, versioning
- `knowledge/planning-patterns.md` — Strategy and sequencing patterns, learning log
- `knowledge/eval-guide.md` — Pipeline evaluation methodology
- `knowledge/observability.md` — Structured logging and trace format
