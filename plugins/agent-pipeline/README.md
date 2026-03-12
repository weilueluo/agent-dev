# Agent Pipeline

A production multi-stage delivery pipeline plugin for GitHub Copilot CLI. Handles complex software tasks through structured exploration, adaptive planning, incremental implementation, validation, and review — with strict handoff contracts, quality gates, and explicit correction paths.

## Architecture

```
Orchestrator → Explorer → Planner → Plan Critic → Implementer → Tester → Reviewer → Replanner
```

The orchestrator selects an execution mode, dispatches to each stage in sequence, enforces quality gates between stages, and routes failures to the correct recovery path (revise or replan).

### Why This Architecture

**Small stable agent set + reusable skills** instead of many specialist agents:
- 7 agents handle durable roles (exploration, planning, implementation, etc.)
- 9 skills provide the reusable execution logic each agent follows
- The planner dynamically generates task-specific perspectives at prompt time — no hardcoded "security planner" or "performance planner" agents needed
- This matches how Copilot CLI plugins work: agents are stable identities, skills are invokable capabilities

**Strict handoff contracts** between every stage:
- Every stage produces a YAML artifact with a defined schema
- Downstream stages validate their inputs before proceeding
- This prevents the common failure mode of stages making assumptions about what the previous stage did

**Explicit correction paths**:
- **Revise** = implementation issue, strategy still valid → goes back to implementer
- **Replan** = strategy is flawed → goes back to planner with failure analysis
- These are fundamentally different recovery paths. Mixing them wastes cycles.

## File Structure

```
agent-pipeline/
├── plugin.json                          # Plugin manifest with component paths
├── README.md                            # This file
├── CLAUDE.md                            # Persistent operating rules
├── hooks.json                           # Hook configuration (session start, pre/post tool)
├── agents/
│   ├── orchestrator.agent.md            # Pipeline controller — mode selection, stage dispatch
│   ├── explorer.agent.md               # Discovery engine — files, constraints, risks, unknowns
│   ├── planner.agent.md                # Strategy engine — perspectives, strategies, phased plan
│   ├── plan-critic.agent.md            # Validation engine — 8-dimension scoring, accept/revise/re-explore
│   ├── implementer.agent.md            # Execution engine — incremental changes, deviation tracking
│   ├── tester.agent.md                 # Validation engine — checks, coverage, confidence, residual risk
│   └── reviewer.agent.md              # Judgment engine — approve / approve-with-follow-ups / revise / replan
├── skills/
│   ├── deliver/SKILL.md                 # Primary entry point — runs the full pipeline
│   ├── explore-task/SKILL.md            # Structured repository exploration
│   ├── plan-task/SKILL.md               # Strategy generation and execution planning
│   ├── build-execution-graph/SKILL.md   # Dependency DAG validation and visualization
│   ├── critique-plan/SKILL.md           # Plan quality assessment (8 dimensions)
│   ├── implement-task/SKILL.md          # Phase-by-phase implementation with self-check
│   ├── test-task/SKILL.md               # Acceptance criteria validation and confidence estimation
│   ├── review-task/SKILL.md             # Quality review and explicit disposition
│   └── replan-task/SKILL.md             # Strategy revision after failure
├── hooks/
│   └── settings.example.json            # Hook customization examples for different stacks
├── scripts/
│   ├── score_plan.py                    # Plan quality scoring (completeness, feasibility, etc.)
│   └── render_dag.py                    # Execution graph rendering (ASCII or Mermaid)
└── knowledge/
    ├── handoff-schemas.md               # Strict YAML schemas for every stage handoff
    └── planning-patterns.md             # Proven patterns, heuristics, and anti-patterns
```

## Installation

### From local path
```bash
copilot plugin install ./plugins/agent-pipeline
```

### From GitHub
```bash
copilot plugin install OWNER/REPO:plugins/agent-pipeline
```

### Verify
```bash
copilot plugin list
```

In a session:
```
/plugin list
/agent          # check 7 agents loaded
/skills list    # check 9 skills loaded
```

## Usage

### Start a delivery pipeline

The `deliver` skill is the main entry point:

```
Use the deliver skill to add pagination to the /api/users endpoint
```

Or specify a mode:
```
Use the deliver skill in deep mode to refactor the authentication module
```

### Use individual stages

```
Use the explore-task skill to understand the payments module
Use the plan-task skill to plan a database migration
Use the critique-plan skill to evaluate this plan
```

### Use agents directly

```
@orchestrator deliver a new search feature
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

The orchestrator auto-selects mode based on task analysis. When in doubt, it chooses the more cautious mode.

## Revise vs Replan

| | Revise | Replan |
|---|--------|--------|
| **What's wrong** | Implementation has bugs or issues | Strategy itself is flawed |
| **Strategy** | Still valid | Needs fundamental change |
| **Goes back to** | Implementer | Planner |
| **Example** | "The endpoint works but returns wrong status code" | "Cursor pagination won't work because the DB doesn't support it" |
| **Max cycles** | 2 | 1 |

## Quality Gates

Every stage has explicit conditions that must be met:

- **Explorer**: Relevant areas known, constraints stated, unknowns acknowledged
- **Planner**: Strategy chosen with rationale, criteria testable, phases ordered, non-goals stated
- **Plan Critic**: Clear accept/revise/re-explore with justification and scores
- **Implementer**: Changes documented, deviations explained, no unrelated changes
- **Tester**: Checks run, confidence stated, failures classified, residual risk documented
- **Reviewer**: Exactly one disposition, assessment scores, actionable issues

## Example Workflow

**Task**: "Add rate limiting to the public API endpoints"

1. **Orchestrator** classifies as `standard` mode (normal feature, moderate complexity, some exploration needed)

2. **Explorer** discovers:
   - 12 public endpoints in `src/routes/public/`
   - Existing middleware pattern in `src/middleware/`
   - Redis already in the stack (potential rate limit store)
   - No existing rate limiting anywhere
   - Risk: middleware ordering affects all endpoints

3. **Planner** generates perspectives:
   - "Request Pattern Analysis" — What traffic patterns matter?
   - "Storage Strategy" — Where to track rate limits?
   - "Client Impact" — How should limited clients be informed?
   - Generates 2 strategies: Redis-backed sliding window vs in-memory token bucket
   - Recommends Redis sliding window (aligns with existing infra)
   - Plans 3 phases: middleware → route integration → tests

4. **Implementer** executes phase by phase:
   - Phase 1: Creates rate limit middleware with Redis backend
   - Phase 2: Integrates with all 12 public routes
   - Phase 3: Adds configuration and documentation
   - Documents: followed existing middleware pattern, no deviations

5. **Tester** validates:
   - Runs existing test suite (all pass)
   - Adds rate limit tests: happy path, limit exceeded, Redis unavailable
   - Reports 88% confidence, one gap: no load testing
   - Recommends: proceed to review

6. **Reviewer** assesses:
   - Correctness: 8/10, Design: 9/10, Maintainability: 8/10
   - Decision: **approve-with-follow-ups**
   - Follow-up: "Add monitoring dashboard for rate limit metrics"

## Key Design Decisions

1. **Domain-agnostic**: Works for software delivery, migrations, research tasks, operational work — not just simple code changes.

2. **Adaptive planning**: The planner generates perspectives fresh per task. A database migration gets "Data Integrity" and "Rollback Safety" perspectives. A UI feature gets "User Experience" and "Accessibility" perspectives. No hardcoded lists.

3. **Every stage is substantial**: Each stage has internal reasoning steps, not just a thin wrapper. The explorer reasons through 8 steps. The tester reasons through 8 steps. The reviewer reasons through 8 steps. This depth is what makes the pipeline reliable.

4. **Strict contracts**: YAML handoff schemas prevent stages from making assumptions. If the explorer doesn't produce a valid handoff, the planner can't proceed. This catches problems early.

5. **Explicit correction**: Revise and replan are separate paths with different destinations and cycle limits. This prevents infinite loops and ensures the right problem gets fixed.
