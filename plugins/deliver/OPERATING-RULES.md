# Deliver — Operating Rules

## Iteration Definition

An **iteration** is one complete pass through Plan → Critic → Implement → Verify → Decide. Critic's `revise-plan` signal loops within the current iteration and does **not** increment the iteration counter. Cap revise-plan sub-loops at 2 per iteration. If the plan cannot be accepted after 2 revisions within one iteration, escalate.

## Stop Conditions

- **Accept**: all success criteria pass verification AND no blocking critic issues AND confidence ≥ medium.
- **Iterate**: blocking issues remain AND iteration < max AND improvement observed (fewer blocking failures + fewer blocking critic issues than previous iteration).
- **Escalate**: max iterations reached OR no improvement after 2 iterations OR unresolvable issue detected.

Max iterations: 2 for Standard tasks, 3 for Complex tasks (per complexity routing).

## Loop Routing

- Critic signals `revise-plan` → next iteration revises strategy (back to Plan step)
- Critic signals `re-explore` → targeted re-exploration of the specific gap (back to Explore)
- Critic signals `accept` → proceed to Implement
- Verifier finds blocking failures → feed details into next iteration's Plan step

## Handoff Artifacts

Each step produces a named artifact consumed by downstream steps:

- `contract` — goals, constraints, testable success criteria (Frame → all)
- `exploration_report` — files, constraints, unknowns, risks (Explore → planner, critic)
- `plan` — strategy, execution phases with dependencies + acceptance criteria, non-goals, mitigations, rollback (Plan → critic, implementer, verifier)
- `critic_report` — issues with severity + evidence, strengths, signal (Critic → decide, planner on next iter)
- `implementation_report` — files changed, deviations, verification focus (Implement → verifier)
- `verify_report` — criteria status, failures classified, confidence, blocking count (Verify → decide, planner on next iter)
- `pipeline_trace` — all events with timing, all artifacts or summaries, decisions (Pipeline end → post-mortem, learning log)

## Context Management

Prevent context rot on multi-iteration runs using threshold-based clearing and recency-based retention — not fixed token budgets.

### Retention priority (highest to lowest)

1. `contract` — always in full (small, never changes)
2. Current iteration artifacts — always in full
3. Previous iteration `plan` — keep (strategy context persists)
4. Previous iteration `critic_report` and `verify_report` — summarize to blocking issues + signal only
5. Previous iteration `exploration_report` — summarize to file list + key constraints
6. Previous iteration `implementation_report` — drop (superseded by current code state)

### Compression trigger

Compress when accumulated artifacts exceed **50% of available context**. The orchestrator estimates artifact sizes and triggers summarization before starting a new iteration.

### Summarization rules

On iteration 2+:
- Replace previous iteration artifacts with compact digests following the retention priority above
- Current iteration artifacts remain in full
- The `contract` and current `plan` are never compressed
- Preserve: blocking issues, decisions made, files changed, verification outcomes
- Drop: tool output details, exploration prose, implementation step-by-step narrative
- Never alter identifiers (commit hashes, file paths, PR numbers, UUIDs)

### Why not fixed token budgets

Task complexity varies — a 3-file bug fix needs a 500-token exploration report, a 50-file migration needs 4000 tokens. Fixed per-artifact limits either over-constrain complex tasks or waste budget on simple ones. Use proportional thresholds instead.

## Iteration 2+ Requirements

The planner must address every blocking issue from the previous critic and verifier reports. Must show what changed and why. Do not restate the previous plan unchanged.

## Protected Paths

Do not modify without explicit approval: generated files, lock files, secrets/credentials, migration history, vendored code.

## Versioning

When making changes to this plugin, **always bump the version**:
- `plugin.json` → `version` field
- `skills/*/SKILL.md` → `version` in frontmatter (if the specific skill changed)

Use semver: patch for bug fixes, minor for new features or behavioral changes, major for breaking changes to pipeline structure.
