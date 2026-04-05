---
name: intake-bug
description: "Classify and triage a bug report. Use when a new bug is reported and needs classification. Don't use when the bug is already triaged or when the task is a feature request."
version: 1.0.0
---

# intake-bug

Classify bug reports by type and severity. Extract symptoms, identify affected components, and assess complexity for routing.

## When to Use

Use when a user reports a bug that hasn't been triaged yet. The report may be vague ("it's broken"), detailed (with stack traces), or anywhere in between.

**Don't use** when the bug is already triaged with type/severity/affected components, or when the task is a feature request (use plan instead).

## Inputs

- User's bug report (free text, error messages, stack traces, reproduction steps)
- Repository context (codebase structure, test framework, recent changes)

## Process

1. **Extract symptoms** — error messages, unexpected outputs, stack traces, behavioral descriptions.
2. **Classify bug type** — functional (wrong output, crash, logic error), performance (slow, memory leak), security (injection, auth bypass, data exposure), configuration (wrong defaults, missing env var, path issue).
3. **Assess severity** — critical (data loss, security breach, total failure), high (major feature broken, no workaround), medium (feature degraded, workaround exists), low (cosmetic, minor inconvenience).
4. **Identify affected components** — search codebase for mentioned modules, error origins, related code paths.
5. **Check for known similar issues** — search for related patterns in recent commits, test files, comments.
6. **Extract reproduction hints** — any steps, conditions, or environment details the user mentioned.
7. **Assess complexity** — trivial (obvious fix), standard (needs investigation, < 5 files), complex (systemic, ≥ 5 files → will handoff to deliver).

## Output

`intake_report`:
- Bug type (functional/performance/security/config)
- Severity (critical/high/medium/low)
- Symptoms (concrete observations)
- Affected components (file paths, modules)
- Reproduction hints
- Complexity assessment (trivial/standard/complex)

## Escalation

If the report is too vague to classify, ask the user for:
- What they expected to happen
- What actually happened
- Any error messages or logs
- Steps to trigger the issue

Reference `knowledge/bug-taxonomy.md` for classification guidance.
