# Deliver Loop

A generic issue-resolution loop for GitHub Copilot CLI. The orchestrator frames the issue as a contract, explores targeted context, plans the work, reviews the plan before execution, performs the work, reviews the result against evidence, and iterates until acceptance or escalation.

The plugin keeps the historical name `deliver`, but it is no longer delivery-specific. Use it for issues that benefit from plan -> work -> review convergence.

## Loop

```
deliver skill (orchestrator)
  ├── Step 1: Frame         -> contract (issue, outcome, constraints, criteria)
  ├── Step 2: Explore       -> explorer agent (once; targeted re-explore on signal)
  └── Step 3: Loop
      ├── 3a: Plan          -> planner agent (strategy + phased work)
      ├── 3b: Review Plan   -> critic agent (adversarial plan review)
      ├── 3c: Verify Review -> critic-verifier agent (evidence-check reviewer claims)
      ├── 3d: Work          -> implementer agent (execute accepted plan)
      ├── 3e: Review Work   -> verifier agent (checks + criteria mapping)
      └── 3f: Decide        -> orchestrator (accept / iterate / escalate)
```

## Why Review the Plan Before Work

The plan reviewer challenges strategy **before work begins**. This catches flawed sequencing, missing edge cases, untestable criteria, and risky assumptions while the cost of revision is still low. The work reviewer then checks the finished result against the contract with external or inspectable evidence.

## Industry Basis

The loop reflects common practices from current agent engineering guidance:

- Anthropic: start simple, use composable workflows, use evaluator-optimizer loops when criteria are clear, and manage context as a scarce resource.
- OpenAI: use self-contained, outcome-focused execution plans for long-running agent work.
- Google: evaluate agents across final outcome, reasoning trace, tool use, memory/context, and production telemetry.
- Microsoft AutoGen: use specialized agents with clear descriptions, task delegation, and explicit termination conditions.
- Cloudflare Agents: persist state, support workflows, use tools, and require human-in-the-loop approval for sensitive actions.

## Key Rules

- **Contract-first.** Goals, constraints, non-goals, and verifiable criteria anchor every step.
- **Plan -> work -> review.** The loop repeats only while measurable improvement is happening.
- **Review before expensive work.** Substantive plans are challenged before execution.
- **Evidence is ground truth.** Tests, command output, traces, citations, and artifact inspection outrank model confidence.
- **Escalate, don't spin.** Stalled, unsafe, or human-only decisions go back to the user.

## File Structure

```
deliver/
├── plugin.json                          # Plugin manifest (v7.4.0)
├── README.md                            # This file
├── AGENTS.md                            # Lean TOC and key rules
├── OPERATING-RULES.md                   # Stop conditions, loop routing, handoff schema
├── hooks.json                           # Hook configuration
├── agents/
│   ├── explorer.agent.md                # Discovery — context, constraints, risks, unknowns
│   ├── planner.agent.md                 # Strategy + phased work planning
│   ├── critic.agent.md                  # Adversarial plan review
│   ├── critic-verifier.agent.md         # Evidence-checks plan review findings
│   ├── implementer.agent.md             # Phase-by-phase work execution
│   └── verifier.agent.md                # Work review + external checks
├── skills/
│   ├── deliver/
│   │   ├── SKILL.md                     # Loop orchestrator
│   │   ├── evals/
│   │   │   └── evals.json               # Representative skill behavior prompts
│   │   └── reference/
│   │       ├── plans-and-exec-plans.md  # Plan standard
│   │       └── skill-standards.md       # Agent Skills authoring standards
│   ├── explore-task/SKILL.md            # Structured exploration
│   ├── plan-task/SKILL.md               # Strategy and work planning
│   ├── critique-plan/SKILL.md           # Adversarial plan review
│   ├── implement-task/SKILL.md          # Phase-by-phase work execution
│   ├── test-task/SKILL.md               # Work review and validation
│   └── build-execution-graph/SKILL.md   # Dependency DAG validation
├── schemas/
│   ├── plan.schema.json                  # Canonical plan artifact contract
│   └── loop-trace.schema.json            # Canonical loop trace contract
├── scripts/
│   ├── validate_artifacts.py             # JSON artifact validation
│   ├── score_plan.py                    # Plan quality scoring
│   └── render_dag.py                    # Execution graph rendering
├── tests/
│   └── test_deliver_artifacts_and_scripts.py
└── knowledge/
    ├── planning-patterns.md             # Proven patterns, anti-patterns, and learning log
    ├── eval-guide.md                    # Loop evaluation methodology
    └── observability.md                 # Structured trace format
```

## Skill Standards Alignment

The deliver skill follows current Agent Skills guidance: its frontmatter description is discovery-focused and third-person, `SKILL.md` is a concise overview, deeper guidance is loaded through direct references, terminology is consistent, and representative eval prompts live in `skills/deliver/evals/evals.json`.

## Usage

### Start an issue-resolution loop

```
Use the deliver skill to generalize the billing workflow docs around plan -> work -> review convergence
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
python scripts/validate_artifacts.py --type plan plan.json
```

JSON artifacts are supported with Python stdlib only. YAML input for utility scripts requires optional PyYAML.

## Example Workflow

**Issue**: "Add rate limiting to the public API endpoints"

1. **Frame** — Outcome: public endpoints enforce request limits. Constraints: no breaking changes, use existing Redis. Criteria: above-limit requests return 429, existing tests pass, new tests cover enforcement.

2. **Explore** — 12 public endpoints, existing middleware pattern, Redis available, no current rate limiting.

3. **Loop iteration 1**:
   - **Plan** — Redis sliding window middleware, per-route config, route integration, tests
   - **Review Plan** — Finds missing Redis failure behavior (blocking)
   - **Plan revised** — Adds fallback-allow on Redis outage and warning log criteria
   - **Review Plan** — Accepts
   - **Work** — Middleware + config + tests
   - **Review Work** — Tests pass, criteria met, confidence high
   - **Decide** — **Accept**
