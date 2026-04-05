# Observability Specification

Structured logging format for the deliver pipeline. Every step emits events; the orchestrator collects them into a `pipeline_trace`.

## Event Format (JSON Lines)

Each step emits one event per phase:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
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
| step | string | One of: frame, explore, plan, critic, implement, verify, decide |
| iteration | int | Current loop iteration (0 for frame/explore) |
| duration_ms | int | Wall clock time for this step |
| token_estimate | int | Approximate tokens consumed |
| artifact_size_tokens | int | Size of the produced artifact |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| signal | string | Critic signal: accept, revise-plan, re-explore |
| decision | string | Decide outcome: accept, iterate, escalate |
| blocking_failures | int | From verify step |
| confidence | string | From verify step: high, medium, low |
| metadata | object | Step-specific data (files changed, issues found, etc.) |

## Pipeline Trace

At pipeline completion, the orchestrator aggregates all events:

```json
{
  "trace_id": "deliver-2025-01-15-abc123",
  "task_summary": "Add rate limiting to public API",
  "started_at": "2025-01-15T10:00:00Z",
  "completed_at": "2025-01-15T10:45:00Z",
  "disposition": "accept",
  "iterations": 2,
  "total_tokens": 45000,
  "events": [ ... ]
}
```

## What This Enables

- Debugging slow pipelines (which step takes longest?)
- Identifying failure patterns (which step fails most?)
- Measuring improvement across versions
- Tracking cost per delivery
- Feeding eval systems with real pipeline traces

## Reference

- LangChain survey: "89% of organizations have implemented some form of observability for their agents"
- Anthropic evals: "A transcript is the complete record of a trial"
