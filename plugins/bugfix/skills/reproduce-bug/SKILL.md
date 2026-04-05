---
name: reproduce-bug
description: "Create minimal bug reproduction. Use when a triaged bug needs reproduction confirmation. Don't use when reproduction is already established or for theoretical issues."
version: 1.0.0
---

# reproduce-bug

Create minimal reproductions that confirm a bug exists. Write executable tests or scripts that trigger the defect reliably.

## When to Use

Use after a bug has been triaged (intake complete) and needs reproduction confirmation before diagnosis.

**Don't use** when a reproduction already exists, when the issue is theoretical, or when you're looking for root cause (use diagnose-bug instead).

## Inputs

- `intake_report` (bug type, symptoms, affected components, reproduction hints)
- User-provided reproduction steps (if any)
- Repository test framework and conventions

## Process

1. **Attempt reproduction** from user's steps or hints. Run the described scenario and observe the failure.
2. **Minimize** — strip away everything not needed to trigger the bug. Find the smallest input, simplest setup.
3. **Write as test** if the project has test infrastructure. The test should fail before the fix and pass after.
4. **If reproduction fails:**
   - Ask user for environment details, exact steps, sample data
   - Retry with new information and variations
   - Attempt static analysis — trace the code path from the reported symptom and prove the defect logically
   - Escalate with all findings if static analysis also fails
5. **Document exact steps** — another agent must be able to repeat the reproduction.
6. **Note environment dependencies** — OS, runtime version, config, data that matter.

**Max reproduction attempts:** 3

## Output

`reproduction_report`:
- Reproduction status (confirmed/partial/static-only/failed)
- Minimal reproduction steps or test
- Failing test file path (if created)
- Environment details
- Static analysis findings (if applicable)

## Escalation

If reproduction is impossible after 3 attempts (including static analysis), produce a report with:
- All attempted approaches
- Static analysis findings (code path analysis, theoretical proof)
- Remaining uncertainty
- Recommendation for the orchestrator (proceed with static proof, or escalate to user)

Reference `knowledge/debugging-patterns.md` for reproduction strategies.
