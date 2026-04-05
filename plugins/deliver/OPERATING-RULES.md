# Deliver — Operating Rules

## GAN Loop Rules

**Contract-first**: Every task must be framed as a contract (goals, constraints, testable success criteria) before entering the loop.

**Adversarial critic**: The critic must challenge every proposal. It does not trust the proposer's output. It does not rely on agreement. It finds flaws with evidence.

**External verification**: The verifier runs actual checks (build, typecheck, lint, tests). Ground truth, not reasoning.

**Stop conditions**:
- **Accept**: All success criteria pass in verification AND no blocking critic issues remain AND confidence ≥ medium
- **Escalate**: Max 3 iterations reached, OR no improvement after 2 iterations (fewer blocking verify failures + fewer blocking/high critic issues), OR unresolvable issue detected

**Loop routing**:
- Critic signals `revise-plan` → next iteration revises strategy
- Critic signals `revise-implementation` → next iteration revises code
- Critic signals `re-explore` → targeted re-exploration before next propose
- Verifier finds blocking failures → feed details into next propose

## Propose Step

The propose step has two sub-steps in sequence:
1. **Plan** — create/revise strategy, execution phases, acceptance criteria
2. **Implement** — execute the plan, make code changes

On iteration 2+, the proposer must address every blocking issue from critic and verifier. Must show what changed and why.

## Protected Paths

Do not modify without explicit approval: generated files, lock files, secrets/credentials, migration history, vendored code.

## Versioning

When making changes to this plugin, **always bump the version**:
- `plugin.json` → `version` field
- `skills/*/SKILL.md` → `version` in frontmatter (if the specific skill changed)

Use semver: patch for bug fixes, minor for new features or behavioral changes, major for breaking changes to pipeline structure.

## Knowledge References

The proposer and critic should consult:
- `knowledge/planning-patterns.md` — proven strategies and anti-patterns
