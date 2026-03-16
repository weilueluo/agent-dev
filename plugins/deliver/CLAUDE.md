# Agent Pipeline — Operating Rules

Persistent rules for every pipeline execution.

---

## Core Principles

- **Deliver is the orchestrator.** The deliver skill manages the pipeline directly — classifying tasks, choosing modes, running phases in order, and delegating each phase to the corresponding specialist agent. Do NOT delegate to the orchestrator agent.
- **Delegate each phase to its specialist agent.** Phase 1 → explorer, Phase 2 → 1–4 planners (parallel, different perspectives and models), Phase 3 → 1–4 plan-critics (parallel, different perspectives and models), Phase 4 → implementer, Phase 5 → tester, Phase 6 → 1–4 reviewers (parallel, different perspectives and models). For Phases 2, 3, and 6, the orchestrator synthesizes parallel outputs into a single handoff artifact before proceeding. Phases 1, 4, and 5 remain single-agent.
- **Best-model selection for parallel dispatch.** When spawning parallel agents, always follow the Model Selection Strategy in the deliver SKILL.md: select models dynamically from the environment's available model list — exclude fast/cheap tier, pick the single best model per provider family, dispatch one agent per selected model. Never hardcode model IDs.
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

## Versioning

When making changes to this plugin (skills, agents, knowledge, hooks, or plugin.json), **always bump the version**:
- `plugin.json` → `version` field (the overall plugin version)
- `skills/*/SKILL.md` → `version` in frontmatter (if the specific skill changed)

Use semver: patch for bug fixes, minor for new features or behavioral changes, major for breaking changes to handoff schemas or pipeline structure.

---

## Knowledge References

The planner and critic should consult:
- `knowledge/planning-patterns.md` — proven strategies and anti-patterns
- `knowledge/lessons-learned.md` — lessons from past pipeline runs
