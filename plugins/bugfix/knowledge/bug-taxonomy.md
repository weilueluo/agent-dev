---
title: Bug Taxonomy
description: Bug classification by type, severity, and complexity — used for triage routing and diagnosis approach selection.
last_updated: 2026-04-05
---

# Bug Taxonomy

Reference for the triager agent. Use this to classify bugs consistently and route them through the correct workflow path.

## Bug Types

### Functional
Wrong output, missing behavior, logic error, crash, unhandled exception. The code runs but produces incorrect results or fails entirely.

**Diagnosis approach:** 5-whys on the logic path. Trace from expected output to actual output and find where they diverge.

### Performance
Slow response, memory leak, CPU spike, unnecessary computation, excessive I/O. The code runs correctly but uses too many resources.

**Diagnosis approach:** Profile first, then trace. Identify the hot path or growing allocation. Measure before and after.

### Security
Injection (SQL, XSS, command), authentication bypass, authorization flaw, data exposure, CSRF, SSRF, insecure defaults. The code runs but is exploitable.

**Diagnosis approach:** Trace the untrusted input from entry to use. Find where sanitization or validation is missing. Check OWASP patterns.

### Configuration
Wrong defaults, missing environment variable, path mismatch, version incompatibility, deployment error. The code is correct but misconfigured.

**Diagnosis approach:** Compare working vs broken environment. Check env vars, config files, version constraints, dependency resolution.

### Concurrency
Race condition, deadlock, data corruption under load, non-deterministic failure. The code works under light load but fails under concurrency.

**Diagnosis approach:** Identify shared mutable state. Check locking order. Reproduce with increased concurrency or artificial delays.

### Integration
API contract mismatch, serialization error, protocol error, timeout, version skew between services. The code works in isolation but fails when connected.

**Diagnosis approach:** Check both sides of the boundary. Compare actual vs expected request/response. Check API docs and version compatibility.

## Severity Matrix

| Severity | Impact | Workaround | Response |
|----------|--------|------------|----------|
| **Critical** | Data loss, security breach, total outage | None | Fix immediately |
| **High** | Major feature broken, significant degradation | None or very difficult | Fix within hours |
| **Medium** | Feature degraded, partial functionality | Exists | Fix within days |
| **Low** | Cosmetic, minor inconvenience | Not needed | Fix when convenient |

### Severity Assessment Questions

- Does it cause data loss or corruption? → Critical
- Is it a security vulnerability? → Critical
- Does it prevent a core workflow? → High
- Does it affect all users or a subset? → Affects severity one level
- Is there a workaround? → Reduces severity one level

## Complexity Classification

| Complexity | Characteristics | Routing |
|------------|----------------|---------|
| **Trivial** | Root cause obvious from error, single-line fix, < 2 files | Bugfix orchestrator fixes directly |
| **Standard** | Requires investigation, clear scope, < 5 files | Full bugfix 7-phase loop |
| **Complex** | Systemic cause, multiple components, ≥ 5 files, architectural change | Bugfix INTAKE+REPRODUCE+DIAGNOSE → handoff to deliver |

### Complexity Signals

Signals pointing to **complex**:
- Multiple modules/services involved
- Bug is in a shared utility used by many callers
- Fix requires changing interfaces or data structures
- Root cause is a design flaw, not a code error
- Similar bugs have been fixed before (systemic issue)

## Routing Decision Tree

```
Is it a bug (broken behavior)?
├── No → deliver (feature, refactor, migration)
└── Yes
    ├── Root cause obvious from error? → trivial, fix directly
    └── Needs investigation
        ├── Scope < 5 files? → bugfix standard loop
        └── Scope ≥ 5 files or architectural? → bugfix diagnose → deliver handoff
```

## Not-a-Bug Outcomes

Sometimes investigation reveals the reported behavior is correct:
- **User misunderstanding** — behavior matches spec. Report with evidence, suggest docs improvement.
- **Intended limitation** — feature intentionally doesn't cover this case. Document the limitation.
- **External dependency** — behavior is correct given the dependency's behavior. Propose workaround or upstream report.
