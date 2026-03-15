# Agent Pipeline — Operating Rules

Persistent rules for every pipeline execution.

---

## Core Principles

- **Deliver is the orchestrator.** The deliver skill manages the pipeline directly — classifying tasks, choosing modes, working through phases, and routing feedback loops. Specialist agents are optional helpers for focused delegation.
- **Inline by default, delegate when useful.** Each phase can be performed inline by the deliver skill or delegated to a specialist agent. The pipeline works correctly either way.
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

The deliver skill manages all feedback routing:

| Signal | Source | Routes To | Max Cycles |
|--------|--------|-----------|------------|
| `revise-plan` | Critic | Planning phase | 2 |
| `re-explore` | Critic | Exploration phase | 1 |
| `revise` | Reviewer | Implementation phase | 2 |
| `replan` | Reviewer | Replanning → Planning | 1 |
| `revise` | Tester | Implementation phase | 2 |
| `replan` | Tester | Replanning → Planning | 1 |

If cycles exhaust, escalate to the user.

---

## Knowledge References

The planner and critic should consult:
- `knowledge/planning-patterns.md` — proven strategies and anti-patterns
- `knowledge/lessons-learned.md` — lessons from past pipeline runs
