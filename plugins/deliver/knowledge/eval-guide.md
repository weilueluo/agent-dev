# Pipeline Evaluation Guide

How to evaluate whether the deliver pipeline itself works well.

## Eval Types

### Capability evals (pass@k)
"What can this pipeline do well?" Start at low pass rate, target tasks the pipeline struggles with.

Run the same task k times, pass if ANY trial succeeds: pass@k = 1 - (1 - p)^k.
Use during development to measure ceiling.

### Regression evals (pass^k)
"Does the pipeline still handle what it used to?" Should have ~100% pass rate.

Run the same task k times, pass only if ALL trials succeed: pass^k = p^k.
Use before releases to catch regressions.

## Benchmark Task Categories

Build 10-20 tasks across these categories:

1. **Single-file bug fix** — known failing test, fix the code (expect: 1 iteration)
2. **Multi-file refactor** — rename + restructure across 3-5 files (expect: 1-2 iterations)
3. **New feature** — add endpoint with tests (expect: 1-2 iterations)
4. **Migration** — schema change with data migration (expect: 2-3 iterations)
5. **Escalation test** — impossible task that should escalate, not loop forever

## Grading

Per Anthropic's eval taxonomy, use three grader types:

### Code-based graders (primary)
- Do tests pass? (fail-to-pass for bugs, pass-to-pass for regressions)
- Does it build/typecheck/lint?
- Were the right files changed?

### Model-based graders (secondary)
- Plan quality rubric: completeness, sequencing, acceptance clarity
- Code quality rubric: conventions, simplicity, test coverage
- Use `scripts/score_plan.py` as a code-based plan grader

### Human graders (calibration)
- Periodic expert review of pipeline traces
- Calibrate model-based graders against human judgment

## Tracked Metrics

For each trial:
- Iteration count (1, 2, or 3)
- Total token estimate
- Wall clock time
- Critic signals per iteration
- Blocking failure count trajectory (should decrease)
- Final disposition (accept / escalate)

## When to Eval

- After changing any agent or skill SKILL.md
- After model upgrades
- After changing the loop structure
- Monthly regression runs on the full benchmark suite

## Reference

- Anthropic, "Demystifying evals for AI agents" — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- LangChain, "State of Agent Engineering" — https://www.langchain.com/state-of-agent-engineering
