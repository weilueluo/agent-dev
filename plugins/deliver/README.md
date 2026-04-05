# Agent Pipeline

A GAN-style adversarial delivery pipeline plugin for GitHub Copilot CLI. The proposer creates plans and implements them; the critic adversarially challenges every proposal; the verifier provides ground truth through external checks. The loop iterates until verification passes or stop conditions are met.

## Architecture

```
deliver skill (orchestrator)
  ├── Step 1: Frame         → contract (goals, constraints, testable criteria)
  ├── Step 2: Explore       → explorer agent (once; re-explore on signal)
  └── Step 3: GAN Loop (max 3 iterations)
      ├── 3a: Propose       → proposer agent (plan then implement)
      ├── 3b: Critic        → critic agent (adversarial)
      ├── 3c: Verify        → verifier agent (external checks)
      └── 3d: Decide        → orchestrator (accept / iterate / escalate)
```

### Why This Architecture

**GAN-style adversarial loop**:
- The proposer and critic are adversarial — the critic's job is to find real flaws, not confirm
- External verification (tests, build, types) provides ground truth that neither proposer nor critic can argue with
- The loop naturally converges: each iteration must address blocking issues from the previous

**Contract-first**:
- Every task starts as goals + constraints + testable success criteria
- All steps reference the contract — no scope drift
- Success criteria must be externally verifiable

**Simple, correct, testable**:
- Prefer the simpler solution when two meet the contract
- Do not trust reasoning without external verification
- Stop conditions prevent infinite loops and force escalation

## File Structure

```
deliver/
├── plugin.json                          # Plugin manifest (v5.0.0)
├── README.md                            # This file
├── AGENTS.md                            # Lean TOC and key rules
├── OPERATING-RULES.md                   # Loop rules, stop conditions, protected paths
├── hooks.json                           # Hook configuration
├── agents/
│   ├── explorer.agent.md               # Discovery — files, constraints, risks, unknowns
│   ├── planner.agent.md                # Proposer — plan + implement, contract-first
│   ├── plan-critic.agent.md            # Critic — adversarial, evidence-based
│   ├── implementer.agent.md            # Implementation sub-step of propose
│   └── tester.agent.md                 # Verifier — external checks, ground truth
├── skills/
│   ├── deliver/SKILL.md                 # GAN loop orchestrator
│   ├── explore-task/SKILL.md            # Structured exploration
│   ├── plan-task/SKILL.md               # Strategy and execution planning
│   ├── critique-plan/SKILL.md           # Adversarial critique
│   ├── implement-task/SKILL.md          # Phase-by-phase implementation
│   ├── test-task/SKILL.md               # External verification
│   └── build-execution-graph/SKILL.md   # Dependency DAG validation
├── scripts/
│   ├── score_plan.py                    # Plan quality scoring
│   └── render_dag.py                    # Execution graph rendering
└── knowledge/
    └── planning-patterns.md             # Proven patterns and anti-patterns
```

## Installation

### From local path
```bash
copilot plugin install ./plugins/deliver
```

### From GitHub
```bash
copilot plugin install OWNER/REPO:plugins/deliver
```

### Verify
```bash
copilot plugin list
```

In a session:
```
/plugin list
/skills list    # check 7 skills loaded
```

## Usage

### Start a delivery pipeline

The `deliver` skill is the main entry point and orchestrator:

```
Use the deliver skill to add pagination to the /api/users endpoint
```

### Use individual skills

Skills can be used independently for focused work:

```
Use the explore-task skill to understand the payments module
Use the plan-task skill to plan a database migration
Use the critique-plan skill to evaluate this plan
```

### Utility scripts

```bash
python scripts/score_plan.py plan.yaml        # Score plan quality
python scripts/render_dag.py plan.yaml         # ASCII DAG
python scripts/render_dag.py plan.yaml -f mermaid  # Mermaid diagram
```

## GAN Loop

The core delivery mechanism is an adversarial loop:

1. **Frame** — convert task to contract (goals, constraints, testable success criteria)
2. **Explore** — map the system (once; re-explore only on explicit signal)
3. **Loop** (max 3 iterations):
   - **Propose** — plan + implement (addressing all prior feedback)
   - **Critic** — adversarial review (find flaws, don't confirm)
   - **Verify** — external checks (build, test, typecheck, lint)
   - **Decide** — accept / iterate / escalate

### Stop Conditions

- **Accept**: All success criteria verified + no blocking critic issues + confidence ≥ medium
- **Escalate**: Max 3 iterations, or no improvement after 2, or unresolvable issue

### Example Workflow

**Task**: "Add rate limiting to the public API endpoints"

1. **Frame** — Goals: rate limiting on public endpoints. Constraints: no breaking changes, use existing Redis. Criteria: requests above limit return 429, existing tests pass, new tests cover limit enforcement.

2. **Explore** — Finds 12 public endpoints, existing middleware pattern, Redis in stack, no existing rate limiting.

3. **Loop iteration 1**:
   - **Propose** — Plans Redis sliding window middleware, implements it across 12 routes, adds tests
   - **Critic** — Finds: middleware doesn't handle Redis connection failure gracefully (blocking), no configuration for per-route limits (high)
   - **Verify** — Build passes, 2 test failures (Redis timeout not handled), confidence 70%
   - **Decide** — Blocking issues remain → iterate

4. **Loop iteration 2**:
   - **Propose** — Adds Redis failure fallback (allow traffic), per-route config, fixes tests
   - **Critic** — Accepts. Notes: consider adding monitoring (non-blocking)
   - **Verify** — All tests pass, all criteria met, confidence 95%
   - **Decide** — **Accept**

## Key Design Decisions

1. **GAN-style adversarial loop**: Proposer vs critic, grounded by external verification. No self-trust.
2. **Contract-first**: Every task has explicit goals, constraints, and testable success criteria.
3. **Simple over complex**: Given two solutions that meet the contract, choose the simpler one.
4. **Escalate, don't auto-accept**: Stalled loops go to the user, not to "best effort" delivery.
5. **Domain-agnostic**: Works for software delivery, migrations, research tasks, operational work.
