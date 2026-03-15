# Agent Pipeline

A production multi-stage delivery pipeline plugin for GitHub Copilot CLI. The deliver skill orchestrates the full pipeline — delegating each phase to a specialist agent in sequence, with quality gates and explicit correction paths.

## Architecture

```
deliver skill (orchestrator)
  ├── Phase 1: Exploration     → explorer agent
  ├── Phase 2: Planning        → planner agent
  ├── Phase 3: Plan Critique   → plan-critic agent  (deep/high-risk only)
  ├── Phase 4: Implementation  → implementer agent
  ├── Phase 5: Testing         → tester agent       (standard/deep/high-risk)
  └── Phase 6: Review          → reviewer agent
```

The deliver skill is the pipeline orchestrator. It manages the workflow directly — classifying tasks, choosing modes, running phases in order, and delegating each phase to the corresponding specialist agent. The orchestrator agent is not used by the pipeline; it exists only as a legacy standalone alternative.

### Why This Architecture

**Linear orchestration with explicit delegation**:
- The deliver skill is the single orchestrator — no nested agent chains
- Each phase is delegated to a dedicated specialist agent
- Clear phase markers (Phase 1-6) make the pipeline easy to follow

**Specialist agents as dedicated phase handlers**:
- 6 specialist agents handle focused roles (exploration, planning, critique, implementation, testing, review)
- 9 skills provide reusable execution logic
- Each agent is purpose-built for its phase

**Adaptive planning** with dynamic perspectives:
- The planner generates perspectives fresh per task — no hardcoded specialist agents needed
- A database migration gets "Data Integrity" and "Rollback Safety" perspectives
- A UI feature gets "User Experience" and "Accessibility" perspectives

**Explicit correction paths**:
- **Revise** = implementation issue, strategy still valid → goes back to implementation
- **Replan** = strategy is flawed → goes back to planning with failure analysis
- These are fundamentally different recovery paths. Mixing them wastes cycles.

## File Structure

```
deliver/
├── plugin.json                          # Plugin manifest
├── README.md                            # This file
├── CLAUDE.md                            # Persistent operating rules
├── hooks.json                           # Hook configuration
├── agents/
│   ├── orchestrator.agent.md            # Legacy standalone coordinator (not used by deliver pipeline)
│   ├── explorer.agent.md               # Discovery — files, constraints, risks, unknowns
│   ├── planner.agent.md                # Strategy — perspectives, strategies, phased plan
│   ├── plan-critic.agent.md            # Validation — scoring, accept/revise/re-explore
│   ├── implementer.agent.md            # Execution — incremental changes, deviation tracking
│   ├── tester.agent.md                 # Verification — checks, coverage, confidence, risk
│   └── reviewer.agent.md              # Judgment — approve / approve-with-follow-ups / revise / replan
├── skills/
│   ├── deliver/SKILL.md                 # Primary entry point — orchestrates the full pipeline
│   ├── explore-task/SKILL.md            # Structured repository exploration
│   ├── plan-task/SKILL.md               # Strategy generation and execution planning
│   ├── build-execution-graph/SKILL.md   # Dependency DAG validation and visualization
│   ├── critique-plan/SKILL.md           # Plan quality assessment
│   ├── implement-task/SKILL.md          # Phase-by-phase implementation with self-check
│   ├── test-task/SKILL.md               # Acceptance criteria validation and confidence estimation
│   ├── review-task/SKILL.md             # Quality review and explicit disposition
│   └── replan-task/SKILL.md             # Strategy revision after failure
├── scripts/
│   ├── score_plan.py                    # Plan quality scoring
│   └── render_dag.py                    # Execution graph rendering (ASCII or Mermaid)
└── knowledge/
    ├── handoff-schemas.md               # YAML schemas for stage outputs
    ├── planning-patterns.md             # Proven patterns and anti-patterns
    └── lessons-learned.md               # Lessons from past pipeline runs
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
/skills list    # check 9 skills loaded
```

## Usage

### Start a delivery pipeline

The `deliver` skill is the main entry point and orchestrator:

```
Use the deliver skill to add pagination to the /api/users endpoint
```

Or specify a mode:
```
Use the deliver skill in deep mode to refactor the authentication module
```

### Use individual skills

Skills can be used independently for focused work:

```
Use the explore-task skill to understand the payments module
Use the plan-task skill to plan a database migration
Use the critique-plan skill to evaluate this plan
```

### Use agents directly

Agents can be invoked directly when you want focused specialist work:

```
@explorer map the codebase for the billing module
@planner create a strategy for migrating from REST to GraphQL
@reviewer review these changes
```

### Utility scripts

```bash
python scripts/score_plan.py plan.yaml        # Score plan quality
python scripts/render_dag.py plan.yaml         # ASCII DAG
python scripts/render_dag.py plan.yaml -f mermaid  # Mermaid diagram
```

## Pipeline Modes

| Mode | When | Stages |
|------|------|--------|
| **quick** | Single-file, low risk, obvious path | explore → plan → implement → review |
| **standard** | Normal bug/feature, moderate complexity | explore → plan → implement → test → review |
| **deep** | Multiple strategies, significant refactor, cross-cutting | explore → plan → critique → implement → test → review |
| **high-risk** | Migration, auth/security, infra, wide blast radius | explore → plan → critique → implement → test → review |

Quick mode skips plan critique and testing. Standard mode skips plan critique. Deep and high-risk run all phases — they differ in the depth expected within each phase. The deliver skill auto-selects mode based on task analysis. When in doubt, it chooses the more cautious mode.

## Revise vs Replan

| | Revise | Replan |
|---|--------|--------|
| **What's wrong** | Implementation has bugs or issues | Strategy itself is flawed |
| **Strategy** | Still valid | Needs fundamental change |
| **Goes back to** | Implementation phase | Planning phase |
| **Example** | "The endpoint works but returns wrong status code" | "Cursor pagination won't work because the DB doesn't support it" |
| **Max cycles** | 2 | 1 |

## Example Workflow

**Task**: "Add rate limiting to the public API endpoints"

1. **Deliver skill** classifies as `standard` mode (normal feature, moderate complexity)

2. **Phase 1 — Exploration** (→ explorer agent) discovers:
   - 12 public endpoints in `src/routes/public/`
   - Existing middleware pattern in `src/middleware/`
   - Redis already in the stack (potential rate limit store)
   - No existing rate limiting anywhere
   - Risk: middleware ordering affects all endpoints

3. **Phase 2 — Planning** (→ planner agent) produces:
   - Considers Redis-backed sliding window vs in-memory token bucket
   - Recommends Redis sliding window (aligns with existing infra)
   - Plans 3 phases: middleware → route integration → tests

4. **Phase 4 — Implementation** (→ implementer agent) executes:
   - Phase 1: Creates rate limit middleware with Redis backend
   - Phase 2: Integrates with all 12 public routes
   - Phase 3: Adds configuration and documentation

5. **Phase 5 — Testing** (→ tester agent) validates:
   - Runs existing test suite (all pass)
   - Adds rate limit tests: happy path, limit exceeded, Redis unavailable
   - Reports 88% confidence, one gap: no load testing

6. **Phase 6 — Review** (→ reviewer agent) assesses:
   - Correctness: 8/10, Design: 9/10, Maintainability: 8/10
   - Decision: **approve-with-follow-ups**
   - Follow-up: "Add monitoring dashboard for rate limit metrics"

## Key Design Decisions

1. **Deliver is the orchestrator**: The deliver skill manages the pipeline directly, delegating each phase to a specialist agent. No recursive agent spawning. The orchestrator agent is not used by the pipeline.

2. **Explicit phase delegation**: Each phase is delegated to a named specialist agent (explorer → planner → plan-critic → implementer → tester → reviewer). The deliver skill handles sequencing and feedback routing.

3. **Domain-agnostic**: Works for software delivery, migrations, research tasks, operational work — not just simple code changes.

4. **Adaptive planning**: The planner generates perspectives fresh per task. No hardcoded "security planner" or "performance planner" agents needed.

5. **Explicit correction**: Revise and replan are separate paths with different destinations and cycle limits. This prevents infinite loops and ensures the right problem gets fixed.
