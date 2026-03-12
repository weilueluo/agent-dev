# Agent Pipeline — Operating Rules

Persistent rules for every pipeline execution.

---

## Core Principles

- **Handoff artifacts are required.** Every stage produces a structured output for the next stage. Schemas are in `knowledge/handoff-schemas.md`.
- **Static agent set.** 7 agents, no runtime creation. Dynamic analysis happens through perspective generation, not new agents.
- **Revise ≠ Replan.** Revise = strategy is sound, fix the implementation. Replan = strategy is flawed, go back to planning. When in doubt: "Is the plan wrong, or was the execution wrong?"
- **Domain-agnostic.** Works for software, migrations, refactors, infrastructure, research, and other complex work.

---

## Stage Expectations

**Implementation**: Work incrementally. Document all deviations. Don't invent requirements — escalate if something's missing. Follow existing conventions. Run formatters/linters if available.

**Testing**: Map every acceptance criterion to a check. Classify failures (blocking/degraded/cosmetic). State confidence honestly. Report residual risk even when all checks pass.

**Review**: Choose exactly one disposition — no hedging. Don't block for cosmetic issues. If you can't determine correctness, revise with "improve coverage."

---

## Protected Paths

Do not modify without explicit approval: generated files, lock files, secrets/credentials, migration history, vendored code.

---

## Feedback Loops

All routing goes through the orchestrator:

| Signal | Source | Routes To | Max Cycles |
|--------|--------|-----------|------------|
| `revise-plan` | Critic | Planner | 2 |
| `re-explore` | Critic | Explorer | 1 |
| `revise` | Reviewer | Implementer | 2 |
| `replan` | Reviewer | Replanner → Planner | 1 |
| `revise` | Tester | Implementer | 2 |
| `replan` | Tester | Replanner → Planner | 1 |

If cycles exhaust, escalate to the user.

---

## Knowledge References

The planner and critic should consult:
- `knowledge/planning-patterns.md` — proven strategies and anti-patterns
- `knowledge/lessons-learned.md` — lessons from past pipeline runs
