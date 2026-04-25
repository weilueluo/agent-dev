# Observability Specification

Structured logging format for the deliver issue-resolution loop. Every step emits events; the orchestrator collects them into a `loop_trace` governed by `../schemas/loop-trace.schema.json`. Validate JSON traces with `python ../scripts/validate_artifacts.py --type loop-trace`.

## Event Format (JSON Lines)

Each step emits one event per phase:

```json
{
  "timestamp": "2026-04-25T10:30:00Z",
  "step": "plan",
  "iteration": 1,
  "duration_ms": 45000,
  "token_estimate": 2800,
  "artifact_size_tokens": 1200,
  "signal": null,
  "decision": null,
  "metadata": {}
}
```

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| timestamp | ISO 8601 | When the step started |
| step | string | One of: frame, explore, plan, review_plan, verify_review, work, review_work, decide |
| iteration | int | Current loop iteration (0 for frame/explore) |
| duration_ms | int | Wall clock time for this step |
| token_estimate | int | Approximate tokens consumed |
| artifact_size_tokens | int | Size of the produced artifact |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| signal | string | Plan-review signal: accept, revise-plan, re-explore |
| decision | string | Decide outcome: accept, iterate, escalate |
| blocking_issues | int | From review_work step |
| confidence | string | From review_work step: high, medium, low |
| metadata | object | Step-specific data (files changed, issues found, criteria status, sources cited, etc.) |

## Loop Trace

At loop completion, the orchestrator aggregates all events:

```json
{
  "trace_id": "deliver-2026-04-25-abc123",
  "issue_summary": "Generalize deliver into plan-work-review issue resolution",
  "started_at": "2026-04-25T10:00:00Z",
  "completed_at": "2026-04-25T10:45:00Z",
  "disposition": "accept",
  "iterations": 2,
  "total_tokens": 45000,
  "events": [ ]
}
```

Ordinary runs may return the `loop_trace` in the final response. Write workspace- or task-local trace artifact files only when the user or workflow explicitly asks for files. Ordinary runs must not mutate plugin knowledge files.

## What This Enables

- Debugging slow loops (which step takes longest?)
- Identifying failure patterns (which step fails most?)
- Measuring convergence across versions
- Tracking cost per issue resolution
- Feeding eval systems with real loop traces
- Auditing protected actions and escalation decisions

## Reference

- Google Agent Factory: evaluate final outcome, reasoning, tool utilization, memory/context retention, and traces
- Anthropic evals: "A transcript is the complete record of a trial"
- Cloudflare Agents: durable state, workflow orchestration, and human-in-the-loop approvals
