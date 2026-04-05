# Deliver Pipeline

An adversarial delivery pipeline plugin for GitHub Copilot CLI. The planner creates strategy; the critic challenges the plan before code is written; the implementer executes; the verifier provides ground truth through external checks. The loop iterates until verification passes or stop conditions are met.

## Loop

```
deliver skill (orchestrator)
  ├── Step 1: Frame         → contract (goals, constraints, testable criteria)
  ├── Step 2: Explore       → explorer agent (once; targeted re-explore on signal)
  └── Step 3: Loop (max 3 iterations)
      ├── 3a: Plan          → planner agent (strategy + phased execution)
      ├── 3b: Critic        → critic agent (adversarial plan review)
      ├── 3c: Implement     → implementer agent (execute plan)
      ├── 3d: Verify        → verifier agent (external checks + test gaps)
      └── 3e: Decide        → orchestrator (accept / iterate / escalate)
```

### Why Critic Before Code

The critic challenges the plan **before implementation begins**. This catches strategy flaws, missing edge cases, and constraint violations before any code is written — preventing wasted implementation churn. A `revise-plan` signal costs nothing. A `revise-plan` signal after implementation costs an entire iteration.

### Key Rules

- **Contract-first.** Goals, constraints, testable success criteria. All steps reference the contract.
- **Critic before code.** Plan is adversarially challenged before implementation.
- **External verification is ground truth.** Tests, build, types — not reasoning.
- **Escalate, don't auto-accept.** Stalled loops go to the user.

## File Structure

```
deliver/
├── plugin.json                          # Plugin manifest (v6.0.0)
├── README.md                            # This file
├── AGENTS.md                            # Lean TOC and key rules
├── OPERATING-RULES.md                   # Stop conditions, loop routing, handoff schema
├── hooks.json                           # Hook configuration
├── agents/
│   ├── explorer.agent.md               # Discovery — files, constraints, risks, unknowns
│   ├── planner.agent.md                # Strategy + phased execution planning
│   ├── critic.agent.md                 # Adversarial plan review
│   ├── implementer.agent.md            # Phase-by-phase implementation
│   └── verifier.agent.md                 # External checks + write tests for gaps
├── skills/
│   ├── deliver/
│   │   ├── SKILL.md                    # Loop orchestrator
│   │   └── reference/
│   │       └── plans-and-exec-plans.md # Execution plan standard
│   ├── explore-task/SKILL.md           # Structured exploration
│   ├── plan-task/SKILL.md              # Strategy and execution planning
│   ├── critique-plan/SKILL.md          # Adversarial critique
│   ├── implement-task/SKILL.md         # Phase-by-phase implementation
│   ├── test-task/SKILL.md              # External verification
│   └── build-execution-graph/SKILL.md  # Dependency DAG validation
├── scripts/
│   ├── score_plan.py                   # Plan quality scoring
│   └── render_dag.py                   # Execution graph rendering
└── knowledge/
    ├── planning-patterns.md            # Proven patterns, anti-patterns, and learning log
    ├── eval-guide.md                   # Pipeline evaluation methodology
    └── observability.md                # Structured logging and trace format
```

## Usage

### Start a delivery pipeline

```
Use the deliver skill to add pagination to the /api/users endpoint
```

### Use individual skills

Skills work standalone for focused work:

```
Use the explore-task skill to understand the payments module
Use the plan-task skill to plan a database migration
Use the critique-plan skill to evaluate this plan
```

### Utility scripts

```bash
python scripts/score_plan.py plan.yaml
python scripts/render_dag.py plan.yaml -f mermaid
```

## Example Workflow

**Task**: "Add rate limiting to the public API endpoints"

1. **Frame** — Goals: rate limiting on public endpoints. Constraints: no breaking changes, use existing Redis. Criteria: above-limit requests return 429, existing tests pass, new tests cover enforcement.

2. **Explore** — 12 public endpoints, existing middleware pattern, Redis available, no existing rate limiting.

3. **Loop iteration 1**:
   - **Plan** — Redis sliding window middleware, apply to 12 routes, add tests
   - **Critic** — Finds: no Redis failure handling (blocking), no per-route config (high)
   - **Plan revised** (addresses critic) — Adds fallback-allow on Redis failure, per-route config
   - **Critic** — Accepts
   - **Implement** — Middleware + config + tests
   - **Verify** — All tests pass, all criteria met, confidence 95%
   - **Decide** — **Accept**
