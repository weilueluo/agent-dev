---
title: Debugging Patterns
description: Methodologies and strategies for systematic bug diagnosis — 5-whys, reproduction, hypothesis testing, and common patterns.
last_updated: 2026-04-05
---

# Debugging Patterns

Reference for diagnostician and reproducer agents. Use these patterns when investigating and diagnosing bugs.

## 5-Whys Methodology

Start with the observed symptom. Ask "why?" and answer with code evidence. Repeat until you reach an actionable root cause — a specific code defect that can be fixed.

**Worked example:**

```
Symptom: API returns 500 on user profile request

Why 1: NullPointerException in ProfileHandler.getProfile()
  Evidence: stack trace shows line 42 of ProfileHandler.java

Why 2: user object is null when accessing user.getName()
  Evidence: ProfileHandler.java:40 — user = userRepo.findById(id) returns null

Why 3: userRepo.findById() returns null for deleted users
  Evidence: UserRepository.java:28 — query has no filter on deleted_at

Why 4: query was copied from AdminRepository which intentionally includes deleted users
  Evidence: git blame shows AdminRepository.java:15 copied to UserRepository.java:28

Why 5: no test covers the "request profile of deleted user" scenario
  Evidence: ProfileHandlerTest.java has no test with deleted user fixture

Root cause: UserRepository.findById() missing WHERE deleted_at IS NULL filter
Fix: Add soft-delete filter to the query + add test for deleted user case
```

**When to stop:** Stop when you reach something directly fixable in code. If you're asking "why was this code written this way?" you've likely reached the root cause.

## Reproduction Strategies

### Binary Search (Bisect)
Narrow the failure to a specific commit using git bisect. Works best for regressions with a known last-good state.

### Input Minimization
Start with the full failing input and remove pieces until you find the smallest input that still triggers the bug.

### Environment Isolation
Run in a clean environment to rule out local state. Fresh clone, clean database, default config.

### State Inspection
Add logging or use a debugger to inspect variable state at key points. Compare actual vs expected values.

### Timing Manipulation
For race conditions: add delays between operations, increase concurrency, reduce timeouts. Make the timing window larger to reproduce reliably.

### Boundary Probing
Test at boundaries: empty input, max-length input, zero, negative, null, Unicode, special characters.

## Common Bug Patterns

| Pattern | Typical Symptom | Root Cause |
|---------|----------------|------------|
| Null/undefined access | TypeError, NullPointerException | Missing null check, unexpected return value |
| Off-by-one | Wrong count, missing item, index error | `<` vs `<=`, 0-indexed vs 1-indexed |
| Race condition | Intermittent failure, data corruption | Shared mutable state without synchronization |
| Resource leak | Memory growth, connection exhaustion | Missing close/cleanup in error paths |
| Encoding mismatch | Garbled text, wrong characters | UTF-8 vs Latin-1, missing charset header |
| Timezone error | Wrong dates, off-by-hours | UTC vs local, DST transitions, missing timezone |
| Floating-point comparison | Flaky assertions, wrong calculations | `==` on floats, rounding errors |
| State mutation | Unexpected side effects | Shared reference modified in-place |
| Missing error handling | Silent failure, corrupted state | Swallowed exception, missing catch clause |
| Stale cache | Old data served, inconsistent state | Cache not invalidated on write |

## Diagnosis Heuristics

1. **Start from the error, not the code.** Read the error message literally before reading code.
2. **Follow data flow, not control flow.** Track the value that's wrong from its origin.
3. **Check recent changes first.** `git log --oneline -20` on affected files.
4. **Look for boundary conditions.** The bug is often at the edge of valid input.
5. **Verify assumptions about input.** Log actual input shapes and values.
6. **Check the test that should have caught this.** If it exists but passed, the test may be wrong.
7. **Read the documentation of APIs you're calling.** The bug may be in the caller's assumptions.

## When Diagnosis Stalls

- **Rubber-duck the 5-whys chain.** Explain each step aloud. Gaps become obvious.
- **Check if the reproduction is actually minimal.** Extra complexity hides the root cause.
- **Look for a second bug masking the first.** Two bugs can produce confusing symptoms.
- **Try the opposite hypothesis.** If you've been assuming X, what if it's not-X?
- **Check the environment.** Different versions, config, or data than expected?
- **Escalate.** Ask the user for domain knowledge you might be missing.
