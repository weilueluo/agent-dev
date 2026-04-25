# Loop Evaluation Guide

How to evaluate whether the deliver issue-resolution loop works well.

## Eval Types

### Capability evals (pass@k)

"What issues can this loop solve well?" Start at low pass rate, target tasks the loop struggles with.

Run the same task k times, pass if ANY trial succeeds: pass@k = 1 - (1 - p)^k.
Use during development to measure ceiling.

### Regression evals (pass^k)

"Does the loop still handle what it used to?" Should have near-100% pass rate.

Run the same task k times, pass only if ALL trials succeed: pass^k = p^k.
Use before releases to catch regressions.

## Benchmark Task Categories

Build 10-20 tasks across these categories:

1. **Single-file bug fix** — known failing test, fix the code
2. **Multi-file refactor** — rename + restructure across related files
3. **New feature** — add behavior with tests
4. **Migration** — schema, API, or process change with recovery path
5. **Research-backed rewrite** — rewrite a skill/doc based on official sources
6. **Non-code artifact review** — update policy/spec/docs and verify consistency across surfaces
7. **Escalation test** — impossible or unsafe task that should escalate, not loop forever

## Grading

Per Anthropic's eval taxonomy, use three grader types:

### Code-based graders (primary where applicable)

- Do tests pass? (fail-to-pass for bugs, pass-to-pass for regressions)
- Does it build/typecheck/lint?
- Were the right files changed?
- Did the trace include required loop artifacts?

### Evidence-based graders

- Do claims cite official or primary sources when required?
- Are acceptance criteria tied to checks, citations, traces, or artifact inspection?
- Are protected actions gated by approval?

### Model-based graders (secondary)

- Plan quality rubric: completeness, sequencing, acceptance clarity
- Work quality rubric: conventions, simplicity, coverage, consistency
- Use `scripts/score_plan.py` as a code-based plan grader

### Human graders (calibration)

- Periodic expert review of loop traces
- Calibrate model-based graders against human judgment
- Review escalation decisions for whether the loop stopped at the right time

## Tracked Metrics

For each trial:

- Iteration count
- Total token estimate
- Wall clock time
- Plan-review signals per iteration
- Blocking issue count trajectory (should decrease)
- Criteria pass/partial/fail trajectory
- Final disposition (accept / escalate)

## When to Eval

- After changing any agent or skill SKILL.md
- After model upgrades
- After changing loop structure
- After adding new task categories
- Monthly regression runs on the full benchmark suite

## Reference

- Anthropic, "Demystifying evals for AI agents" — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Anthropic, "Building Effective Agents" — https://www.anthropic.com/research/building-effective-agents
- Google Cloud, "Agent Factory Recap" — https://cloud.google.com/blog/topics/developers-practitioners/agent-factory-recap-a-deep-dive-into-agent-evaluation-practical-tooling-and-multi-agent-systems
- OpenAI, "Codex Execution Plans" — https://developers.openai.com/cookbook/articles/codex_exec_plans
- LangChain, "State of Agent Engineering" — https://www.langchain.com/state-of-agent-engineering
