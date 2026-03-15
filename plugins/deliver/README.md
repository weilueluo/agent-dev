# Agent Pipeline

A production multi-stage delivery pipeline plugin for GitHub Copilot CLI. The deliver skill orchestrates the full pipeline — exploration, planning, critique, implementation, testing, and review — with optional delegation to specialist agents, quality gates, and explicit correction paths.

## Architecture

```
deliver skill (orchestrator)
  ├── exploration      ← inline or → explorer agent
  ├── planning         ← inline or → planner agent
  ├── plan critique    ← inline or → plan-critic agent
  ├── implementation   ← inline or → implementer agent
  ├── testing          ← inline or → tester agent
  └── review           ← inline or → reviewer agent
```

The deliver skill is the workflow orchestrator. It manages the pipeline directly — classifying tasks, choosing modes, working through phases in order, and routing feedback loops. Specialist agents are optional helpers that can be invoked for focused delegation when useful, but the pipeline works correctly without them.

### Why This Architecture

**Linear orchestration** instead of recursive agent spawning:
- The deliver skill is the single orchestrator — no nested agent chains
- Each phase runs inline by default, with optional delegation to specialist agents
- This is intentionally simple and reliable

**Specialist agents as optional leaf workers**:
- 7 agents handle focused roles (exploration, planning, implementation, etc.)
- 9 skills provide reusable execution logic
- Agents are useful when invoked directly or when the deliver skill delegates a phase
- The pipeline never depends on agents being invoked — it works inline

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
│   ├── orchestrator.agent.md            # Optional pipeline coordinator (for direct use)
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
| **quick** | Single-file, low risk, obvious path | light explore → minimal plan → implement → smoke test → brief review |
| **standard** | Normal bug/feature, moderate complexity | explore → plan → implement → test → review |
| **deep** | Multiple strategies, significant refactor, cross-cutting | explore → plan → critique → implement → test → review |
| **high-risk** | Migration, auth/security, infra, wide blast radius | deep explore → plan → critique → rollback design → incremental implement → broad test → strict review |

The deliver skill auto-selects mode based on task analysis. When in doubt, it chooses the more cautious mode.

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

2. **Exploration phase** discovers:
   - 12 public endpoints in `src/routes/public/`
   - Existing middleware pattern in `src/middleware/`
   - Redis already in the stack (potential rate limit store)
   - No existing rate limiting anywhere
   - Risk: middleware ordering affects all endpoints

3. **Planning phase** generates perspectives and strategy:
   - Considers Redis-backed sliding window vs in-memory token bucket
   - Recommends Redis sliding window (aligns with existing infra)
   - Plans 3 phases: middleware → route integration → tests

4. **Implementation phase** executes phase by phase:
   - Phase 1: Creates rate limit middleware with Redis backend
   - Phase 2: Integrates with all 12 public routes
   - Phase 3: Adds configuration and documentation

5. **Testing phase** validates:
   - Runs existing test suite (all pass)
   - Adds rate limit tests: happy path, limit exceeded, Redis unavailable
   - Reports 88% confidence, one gap: no load testing

6. **Review phase** assesses:
   - Correctness: 8/10, Design: 9/10, Maintainability: 8/10
   - Decision: **approve-with-follow-ups**
   - Follow-up: "Add monitoring dashboard for rate limit metrics"

## Key Design Decisions

1. **Deliver is the orchestrator**: The deliver skill manages the pipeline directly. No recursive agent spawning. Specialist agents are optional helpers, not required runtime managers.

2. **Domain-agnostic**: Works for software delivery, migrations, research tasks, operational work — not just simple code changes.

3. **Adaptive planning**: The planner generates perspectives fresh per task. No hardcoded "security planner" or "performance planner" agents needed.

4. **Inline by default**: Each phase works without delegation. Specialist agents add value when focused, isolated work is needed — but the pipeline never depends on them.

5. **Explicit correction**: Revise and replan are separate paths with different destinations and cycle limits. This prevents infinite loops and ensures the right problem gets fixed.
