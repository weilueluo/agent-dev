# Plan

Transforms vague feature ideas into complete feature requests through structured clarification.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/plan` — Coordinator (entry point, runs in main context)
- `skills/intake-and-scope` — Request normalization
- `skills/clarification-loop` — Iterative Q&A management
- `skills/feature-request-generation` — Final output assembly
- `agents/` — Workers: repo-researcher, ambiguity-reviewer, risk-reviewer, problem-framing-reviewer, testability-reviewer, observability-reviewer
- `templates/` — Decision ledger schema, feature request template
- `scripts/` — Question dedup, evidence summary, output validation

## Key Rules

- **Produce complete feature requests only** — never implementation plans.
- **No novelty claim without repository evidence.**
- **The clarification loop is mandatory** — do not finalize until all material ambiguity is resolved.
- **Ask fewer but better questions.** Batch and prioritize.
- **Challenge wrong-problem framing.**
- **The plan skill is the coordinator** — it stays in main context, never forks.

## References

- `OPERATING-RULES.md` — Decision ledger, worker agents, clarification rules, output format
