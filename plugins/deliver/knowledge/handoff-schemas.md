# Handoff Schemas

Every stage in the deliver pipeline MUST emit its handoff artifact using these exact schemas. Downstream stages MUST validate that they received a conforming artifact before proceeding. All handoffs are YAML blocks emitted in code fences.

---

## Explorer → Planner

```yaml
explorer_handoff:
  objective: <clear, precise statement of what the task aims to achieve — not a paraphrase of the user's words>
  task_type: <bug-fix | feature | refactor | migration | infrastructure | documentation | investigation | operational | research>
  relevant_files:
    - path: <file path relative to project root>
      role: <specific explanation of why this file matters to the task>
      risk: <low | medium | high>
  constraints:
    explicit:
      - <constraint stated in user request, project rules, CI config, or documentation>
    implicit:
      - <convention, pattern, or architectural decision discovered in the codebase>
  known_facts:
    - <verified information about the system relevant to planning — versions, patterns, coverage, etc.>
  unknowns:
    - item: <what is unknown>
      impact: <blocking | risky | minor — how this gap affects planning>
      suggested_investigation: <concrete step to resolve this unknown>
  risk_hotspots:
    - area: <file, module, system component, or concept>
      risk: <what could go wrong if this area is touched>
      severity: <low | medium | high | critical>
  investigation_gaps:
    - <area that could be explored further but wasn't — helps planner decide if re-explore is needed>
```

**Required fields**: All. Use "none found after analysis" rather than omitting a section.

---

## Planner → Implementer

```yaml
planner_handoff:
  planning_mode: <quick | standard | deep | high-risk>
  chosen_strategy:
    name: <descriptive, distinguishable strategy name>
    summary: <1-3 sentence description of the approach>
    rationale: <why this strategy was chosen — must reference alternatives if they were considered>
  alternatives_considered:
    - name: <strategy name>
      summary: <brief description>
      rejected_reason: <specific reason — not "less good">
  execution_phases:
    - id: <unique phase identifier, e.g. phase-1-model-changes>
      name: <human-readable phase name>
      description: <what this phase accomplishes and why it matters>
      files_affected:
        - <file path>
      depends_on:
        - <phase-id that must complete first — empty list if no dependencies>
      acceptance_criteria:
        - <specific, testable criterion — two people should agree on pass/fail>
      estimated_risk: <low | medium | high>
  dependencies:
    - from: <phase-id>
      to: <phase-id>
      type: <blocks | informs | optional>
  acceptance_criteria:
    - criterion: <specific, testable condition for the entire task>
      verification: <how to verify — test command, manual check, etc.>
  non_goals:
    - <explicitly out-of-scope item — prevents scope creep>
  risk_mitigations:
    - risk: <identified risk>
      mitigation: <concrete, actionable mitigation — not "be careful">
  rollback_notes: <how to undo the changes — even if just "revert the commits">
```

**Required fields**: All. `alternatives_considered` may be empty only in quick mode.

---

## Planner → Plan Critic

```yaml
plan_for_review:
  planning_mode: <quick | standard | deep | high-risk>
  exploration_summary: <key findings from the explorer, not the full report>
  chosen_strategy:
    name: <strategy name>
    summary: <description>
    rationale: <justification>
  alternatives_considered:
    - name: <name>
      rejected_reason: <why>
  execution_phases:
    - id: <phase-id>
      name: <phase name>
      depends_on: [<phase-ids>]
      acceptance_criteria: [<criteria>]
  acceptance_criteria: [<overall criteria with verification>]
  non_goals: [<out-of-scope items>]
  risk_mitigations: [<risk + mitigation pairs>]
  rollback_notes: <rollback approach>
```

---

## Plan Critic → Deliver Skill

```yaml
critic_handoff:
  decision: <accept | revise-plan | re-explore>
  scores:
    completeness: <0-10>
    feasibility: <0-10>
    sequencing: <0-10>
    hidden_assumptions: <0-10>
    dependency_awareness: <0-10>
    risk_coverage: <0-10>
    rollback_readiness: <0-10>
    acceptance_criteria_clarity: <0-10>
  overall_score: <0-100>
  issues:
    - category: <completeness | feasibility | sequencing | assumptions | dependencies | risk | rollback | criteria>
      severity: <minor | moderate | major | critical>
      description: <specific problem — not vague>
      suggestion: <concrete, actionable fix>
  strengths:
    - <what the plan does well — preserve these during revision>
  revision_guidance: <specific instructions for the planner if decision is revise-plan — must be actionable>
  re_exploration_guidance: <specific investigation targets if decision is re-explore — must explain what's missing and why>
```

---

## Implementer → Tester

```yaml
implementer_handoff:
  phase_executed:
    id: <phase-id from the plan>
    name: <phase name>
    status: <completed | partial | blocked>
  files_changed:
    - path: <file path>
      change_type: <created | modified | deleted | renamed>
      summary: <what changed and why — not just "updated file">
  change_summary: <overall description of what was done in this phase>
  deviations_from_plan:
    - planned: <what the plan specified>
      actual: <what was actually done>
      reason: <why the deviation was necessary>
  unresolved_issues:
    - issue: <description of the problem>
      impact: <how it affects the deliverable>
      recommendation: <suggested resolution — revise, replan, defer, or accept>
  test_focus_areas:
    - area: <what the tester should focus on>
      priority: <high | medium | low>
      rationale: <why this area needs attention>
```

**Required fields**: All. Use "no deviations" / "no unresolved issues" rather than omitting.

---

## Tester → Reviewer

```yaml
tester_handoff:
  validation_strategy: <description of the overall testing approach and why it was chosen>
  checks_run:
    - name: <descriptive check name>
      type: <existing-test | new-test | lint | type-check | build | manual-verification>
      scope: <what this check covers>
      result: <pass | fail | skip | error>
      details: <additional context — failure message, skip reason, etc.>
  results:
    total: <number of checks run>
    passed: <number>
    failed: <number>
    skipped: <number>
    errors: <number>
  failures:
    - check: <check name>
      classification: <blocking | degraded | cosmetic>
      description: <what failed and how>
      root_cause: <analysis of why it failed>
      recommendation: <revise | replan | acceptable-risk>
  coverage_gaps:
    - area: <untested area>
      risk: <low | medium | high>
      reason: <why it's not covered>
  residual_risk:
    - risk: <what could still go wrong>
      likelihood: <low | medium | high>
      impact: <low | medium | high>
  confidence_level: <high | medium | low>
  confidence_percentage: <0-100>
  recommendation: <proceed-to-review | revise | replan>
```

---

## Reviewer → Deliver Skill (Final Disposition)

```yaml
reviewer_handoff:
  decision: <approve | approve-with-follow-ups | revise | replan>
  assessment:
    correctness: <0-10>
    design_quality: <0-10>
    maintainability: <0-10>
    plan_adherence: <0-10>
    test_adequacy: <0-10>
    overall_quality: <0-10>
  issues_found:
    - category: <correctness | design | maintainability | plan-adherence | testing | security | performance>
      severity: <minor | moderate | major | critical>
      description: <specific problem>
      location: <file path or area>
      suggestion: <concrete fix>
  follow_ups:
    - description: <what needs doing later — only for approve-with-follow-ups>
      priority: <high | medium | low>
      rationale: <why this is a follow-up, not a blocker>
  summary: <1-3 sentence overall assessment>
```

---

## Reviewer → Replanner (on replan decision)

```yaml
replan_handoff:
  decision: replan
  issues_found:
    - category: <strategy | sequencing | assumptions | scope | risk>
      severity: <major | critical>
      description: <what's wrong>
  strategy_flaws:
    - flaw: <description of the strategy-level problem>
      evidence: <what demonstrated the flaw — test failure, impossible implementation, etc.>
  implementation_flaws:
    - flaw: <description>
      root_cause: <strategy-level | implementation-level>
  required_changes:
    - change: <what needs to change>
      scope: <strategy | plan | implementation>
  replanning_reason: <clear statement of why the current strategy cannot succeed>
```

---

## Replanner → Deliver Skill

```yaml
replanner_handoff:
  original_strategy: <name of the failed strategy>
  failure_analysis: <concise explanation of what went wrong and why>
  new_strategy:
    name: <new strategy name — must be distinguishable from the failed one>
    summary: <description>
    rationale: <why this addresses the specific failures identified>
    key_differences: [<what changed from the original approach>]
  revised_phases: [<execution phases following the planner_handoff phase format>]
  preserved_work: [<files/changes from original implementation that remain valid>]
  discarded_work: [<files/changes that must be redone or reverted>]
  risk_adjustments: [<new or updated risk mitigations informed by the failure>]
```
