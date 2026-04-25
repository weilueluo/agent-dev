# Deliver — Operating Rules

## Iteration Definition

An **iteration** is one complete pass through Plan -> Review Plan -> Verify Review -> Work -> Review Work -> Decide. A `revise-plan` signal loops within the current iteration and does **not** increment the iteration counter. If plan revisions repeat without adding new evidence or reducing risk, escalate instead of spinning.

## Stop Conditions

- **Accept**: success criteria pass review AND no confirmed blocking plan-review issues remain AND evidence is sufficient for the contract.
- **Continue**: blocking issues remain AND the next pass has a concrete path to improve the result.
- **Escalate**: the loop is not improving, the next step is unclear or unsafe, or a human-only decision is required.

## Loop Routing

- Plan reviewer signals `revise-plan` -> verified by critic-verifier -> if confirmed, return to Plan
- Plan reviewer signals `re-explore` -> verified by critic-verifier -> if confirmed, targeted re-exploration of the specific gap
- Plan reviewer signals `accept` -> verified by critic-verifier -> if confirmed, proceed to Work
- Critic-verifier may override signal if phantom issues are dismissed
- Work review finds blocking failures -> feed details into the next iteration's Plan step

## Handoff Artifacts

Each step produces a named artifact consumed by downstream steps. Legacy aliases are kept for compatibility with older prompts and traces.

- `contract` — issue, desired outcome, constraints, non-goals, verifiable criteria (Frame -> all)
- `exploration_report` — context, files/artifacts, constraints, unknowns, risks (Explore -> planner, plan reviewer)
- `plan` — strategy, phases with per-phase `depends_on` + acceptance criteria, mitigations, rollback/recovery (Plan -> reviewer, worker, verifier). Canonical schema: `schemas/plan.schema.json`; validate with `scripts/validate_artifacts.py --type plan`.
- `plan_review_report` / `critic_report` — issues with severity + evidence, strengths, signal (Review Plan -> critic-verifier)
- `verified_plan_review` / `verified_critic_report` — verified issues with verdicts, verified signal, confidence (Verify Review -> decide, planner)
- `work_report` / `implementation_report` — phases completed, files/artifacts changed, deviations, review focus (Work -> verifier)
- `review_report` / `verify_report` — criteria status, failures classified, confidence, blocking count (Review Work -> decide, planner)
- `loop_trace` / `pipeline_trace` — all events with timing, artifacts or summaries, decisions (Loop end -> post-mortem, learning log). Canonical artifact name is `loop_trace`; `pipeline_trace` is a legacy alias. Canonical schema: `schemas/loop-trace.schema.json`; validate with `scripts/validate_artifacts.py --type loop-trace`.

The canonical plan artifact may be wrapped as `planner_handoff` for compatibility. Phase dependencies are represented only by each phase's `depends_on` list. Do not add or require a top-level `dependencies` list.

## Context Management

Prevent context rot on multi-iteration runs using threshold-based clearing and recency-based retention — not fixed token budgets.

### Retention priority (highest to lowest)

1. `contract` — always in full (small, never changes)
2. Current iteration artifacts — always in full
3. Current `plan` — always in full
4. Previous iteration `plan` — keep if strategy context still matters
5. Previous iteration `plan_review_report`, `verified_plan_review`, and `review_report` — summarize to blocking issues + signal only
6. Previous iteration `exploration_report` — summarize to file/artifact list + key constraints
7. Previous iteration `work_report` — drop once superseded by current state

### Compression trigger

Compress when accumulated artifacts exceed **50% of available context**. The orchestrator estimates artifact sizes and triggers summarization before starting a new iteration.

### Summarization rules

On later iterations:
- Replace previous iteration artifacts with compact digests following the retention priority above
- Current iteration artifacts remain in full
- The `contract` and current `plan` are never compressed
- Preserve: blocking issues, decisions made, files/artifacts changed, verification outcomes
- Drop: tool output details, exploration prose, step-by-step work narrative
- Never alter identifiers (commit hashes, file paths, URLs, PR numbers, issue IDs, UUIDs)

### Why not fixed token budgets

Issue scope varies — a small fix needs a short exploration report, a broad migration needs more context, and a research rewrite may need source URLs more than file lists. Fixed per-artifact limits either over-constrain large issues or waste budget on small ones. Use proportional thresholds instead.

## Subsequent Iteration Requirements

The planner must address every blocking issue from the previous plan-review and work-review reports. It must show what changed and why. Do not restate the previous plan unchanged.

## Protected Actions and Paths

Do not perform destructive, externally visible, sensitive, or hard-to-reverse actions without explicit approval. This includes modifying generated files, lock files, secrets/credentials, migration history, vendored code, production settings, external services, or user data.

Before any protected mutation, obtain explicit human approval and record a structured `protected_action_ack` with:

- `path` — protected file, service, or resource
- `action` — intended mutation
- `reason` — why this protected action is necessary
- `risk` — what could go wrong and how it is bounded
- `approval_source` — the human approval message, ticket, or workflow gate authorizing the action

Plan acknowledgment alone is insufficient unless it includes an explicit human approval source for the protected action.

## Versioning

When making changes to this plugin, **always bump the version**:
- `plugin.json` -> `version` field
- `skills/*/SKILL.md` -> `version` in frontmatter (if the specific skill changed)

Use semver: patch for bug fixes, minor for new features or non-breaking behavior, major for breaking changes to loop semantics.
