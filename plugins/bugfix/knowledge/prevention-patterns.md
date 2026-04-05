---
title: Prevention Patterns
description: Systemic prevention strategies for the hardener agent — type-level, validation, test, and process guards to prevent bug recurrence.
last_updated: 2026-04-05
---

# Prevention Patterns

Reference for the hardener agent. After a bug is fixed, use these patterns to prevent recurrence of the same class of bug.

## Type-Level Prevention

Use the type system to make illegal states unrepresentable.

- **Branded types for IDs** — `UserId` vs `OrderId` prevents mixing identifiers.
- **NonEmpty collections** — `NonEmptyArray<T>` prevents accessing elements of empty arrays.
- **Result types** — `Result<T, E>` forces callers to handle errors instead of catching exceptions.
- **Discriminated unions** — model state machines explicitly so invalid transitions are compile-time errors.
- **Readonly/frozen** — prevent accidental mutation of shared data structures.
- **Narrowing parameters** — use `string & { brand: 'email' }` instead of `string` for validated inputs.

## Validation-Level Prevention

Validate at system boundaries. Trust nothing from outside.

- **Parse, don't validate** — transform raw input into typed domain objects at the boundary. Code after the boundary works with validated types.
- **Fail fast with clear errors** — validation failures should produce actionable error messages, not silent defaults.
- **Validate at every entry point** — API handlers, CLI args, file reads, env vars, database results, message queue payloads.
- **Validate shapes, not just types** — check ranges, lengths, patterns, relationships between fields.
- **Never trust IDs** — always verify the referenced entity exists and the caller has access.

## Test-Level Prevention

Write tests that would have caught the bug and similar bugs.

- **Regression test for every fix** — a test that fails before the fix and passes after. Name it descriptively: `test_deleted_user_profile_returns_404`.
- **Boundary tests** — empty, zero, negative, max, Unicode, special characters, null.
- **Property-based tests** — for pure logic, generate random inputs and verify invariants hold.
- **Integration tests for boundaries** — test the actual API/database/service boundary, not mocks.
- **Snapshot tests** — for serialization stability, prevent accidental format changes.
- **Mutation testing** — verify test quality by checking that mutated code is caught by tests.

## Process-Level Prevention

Prevent the class of bug from being introduced again.

- **Linter rules** — encode team knowledge as automated checks. Examples: no-floating-point-equality, require-null-check-after-find, no-raw-sql-strings.
- **CI gates** — enforce invariants in the build pipeline. Type checking, test coverage thresholds, security scanning.
- **PR review checklists** — for common bug patterns: "Does this handle null returns?", "Are all error paths covered?", "Is this thread-safe?"
- **Documentation of invariants** — add doc comments near the code they protect: "This function assumes non-null user. Callers must check existence first."
- **Architecture decision records** — document why a pattern was chosen so future developers don't accidentally break the contract.

## Guard Patterns (Immediate Actions)

These are safe to implement immediately after a bug fix:

| Guard | When to Use | Example |
|-------|-------------|---------|
| Assertion at function entry | Invariant assumed but not checked | `assert(user != null, "user must exist")` |
| Type annotation narrowing | Parameter too broad | `email: Email` instead of `email: string` |
| Input validation | Untrusted data enters the system | `if (!isValid(input)) throw new ValidationError(...)` |
| Doc comment on invariant | Non-obvious requirement | `/** Caller must ensure user is not deleted */` |
| Regression test | Bug could recur | Test that reproduces the exact scenario |
| Edge case test | Boundary not covered | Test with empty input, max length, special chars |

## Anti-Patterns in Prevention

Avoid these common mistakes when hardening:

- **Over-engineering** — adding 10 checks for a typo fix. Match the guard to the risk.
- **Defensive programming everywhere** — catch-all error handlers swallow real bugs. Be specific.
- **Tests that test the mock** — mocking the thing you're testing proves nothing. Test real behavior.
- **Guards that duplicate business logic** — validation and business rules should be in one place, not scattered.
- **Process without automation** — "developers should remember to check X" will be forgotten. Automate it.

## Prevention Naming Convention

Name prevention patterns for knowledge base reference. Use the format:

```
{root-weakness}-{location}
```

Examples:
- `unchecked-null-from-query` — database query can return null, caller doesn't check
- `missing-boundary-validation` — input enters system without validation
- `shared-mutable-state` — concurrent access to mutable data without synchronization
- `stale-cache-on-write` — cache not invalidated when underlying data changes
- `copied-query-wrong-context` — query copied from different context with different requirements
