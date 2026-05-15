---
name: git-ship
description: "Commit, push, and monitor the resulting CI/CD run on the current branch. Use whenever the user asks to ship changes — common triggers include 'commit and push', 'commit and push, monitor cicd', 'commit all and push', 'commit and push all', 'ok commit and push', 'monitor cicd', 'monitor ci', 'merge into master', or any close variant. Honors repository-specific commit rules from AGENTS.md / CLAUDE.md and the global no-AI-attribution policy."
version: 1.0.0
---

# Git ship: commit → push → monitor CI

One-step delivery for changes the user has already approved. The user typed
some variant of "commit and push" — they have already decided. Don't ask
for confirmation that they want to commit; do verify what's about to be
committed and run the steps cleanly.

## Hard rules (always apply, regardless of repo)

- **No AI attribution in commit messages.** Never include `Copilot`,
  `GitHub Copilot`, `AI assistant`, `Claude`, `generated with`, or similar.
  Never add `Co-authored-by` trailers referencing any AI.
- **No force-push to protected branches.** `main`, `master`, `release/*`,
  or anything matched by branch protection rules. If the user explicitly
  requests force-push to a feature branch they own, allow it; otherwise
  refuse and explain.
- **No surprise commits.** If `git status` shows uncommitted changes the
  user did NOT explicitly ask to commit, list them and ask before staging.
  This includes generated artifacts, logs, `.env*`, and editor backups.
- **Stop on suspected secrets.** If the staged diff contains anything
  matching common secret patterns (`AKIA[0-9A-Z]{16}`, `sk-[a-zA-Z0-9]{20,}`,
  `ghp_[A-Za-z0-9]{36}`, `xoxb-`, `-----BEGIN.*PRIVATE KEY-----`, lines
  containing `password=`, `api_key=`, `bearer ` followed by a token),
  stop and ask. Do not commit secrets even if the user said "all".

## Inputs the user might give

| Phrase | Stage scope | Push? | Monitor CI? |
|---|---|---|---|
| `commit and push` | tracked changes related to the recent task | yes | no |
| `commit all and push` / `commit and push all` | `git add -A` | yes | no |
| `commit and push, monitor cicd` | tracked changes | yes | yes |
| `monitor cicd` / `monitor ci` (alone) | — | — | yes |
| `merge into master` | — | special: see Merge section | yes |

For anything ambiguous, default to `tracked changes related to the
recent task` (don't sweep up unrelated edits) and confirm if unsure.

## Step 1 — Pre-flight

Read repo-local rules in this order, the first that exists wins:

1. `<repo>/AGENTS.md`
2. `<repo>/CLAUDE.md`
3. `<repo>/.github/copilot-instructions.md`
4. `~/.copilot/copilot-instructions.md`

These typically encode commit-style preferences (conventional commits,
trailer requirements, ticket-id prefixes). Apply them on top of the hard
rules above.

```powershell
git status --porcelain=v1
git rev-parse --abbrev-ref HEAD
git diff --stat                    # unstaged
git diff --cached --stat           # already staged
```

If the working tree is clean and the user said "commit and push", reply
`No changes to commit.` and stop. Do NOT push an empty commit.

## Step 2 — Stage

Resolve scope from the table above. If `all`, `git add -A`. Otherwise
add only the files that relate to the just-completed work. Show a
one-line stat summary back to the user:

```
Staged 7 files: lib/foo.ts (+82,-3), lib/bar.ts (+12,-12), tests/foo.test.ts (+45)…
```

If the staged diff includes generated build artifacts (`.next/`, `dist/`,
`node_modules/`, `*.log`), mention it once and ask before continuing.

## Step 3 — Compose commit message

**Format:** Conventional Commits.

```
<type>(<scope>): <subject ≤72 chars>

<body — explain WHY, not WHAT. Wrap at 72.>
<blank line, then optional trailers like Refs: #123>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`,
`perf`, `style`, `build`, `ci`, `revert`.

Pick the type from the change kind, not the file path:
- new behavior → `feat`
- bug fix → `fix`
- tests-only → `test`
- README/comments-only → `docs`
- dependency / config / tooling → `chore` or `build`
- internal cleanup with no behavior change → `refactor`

Examples that fit this user's style:

```
feat(vault): server-side query with list-summary projection

Replace per-read assignment-reconciliation in /api/vault with a
projected list endpoint. New VaultListItem DTO; full item available
via /api/vault/items/[id]. Tests cover memory + Supabase paths.
```

```
fix(pdf): render Danish characters via embedded Noto Sans

Hand-rolled emitter used Type1 Helvetica which is ASCII-only, so
Løkken became L^,kken. Replace with pdfkit + Noto Sans Regular/Bold.

Refs: #142
```

**Never** include lines like:
- `🤖 Generated with Copilot`
- `Co-authored-by: Copilot <…>`
- `Generated with Claude Code`
- `Authored by AI`

If the repo's `AGENTS.md` ALSO requires a specific co-author trailer,
include only that one. If it requires no trailer, include none.

Run the commit with `-F -` and the message on stdin (avoids shell
quoting issues):

```powershell
$msg = @'
feat(scope): subject

Body explaining why.
'@
$msg | git commit -F -
```

## Step 4 — Push

```powershell
$branch = git rev-parse --abbrev-ref HEAD
git push origin $branch
```

If push is rejected:
- Non-fast-forward → run `git pull --rebase`, resolve, then push again.
  If conflicts, stop and surface the file list.
- Pre-receive hook → surface the hook's stderr verbatim and stop.
- Permission denied → check `git remote -v` and surface; do not retry.

If the current branch is `main` or `master` and origin protects it,
DO NOT force-push. Suggest the user open a feature branch instead.

## Step 5 — Monitor CI (only if the user asked)

Triggers: `monitor cicd`, `monitor ci`, suffix `, monitor cicd` on a
ship request, or follow-up "is CI green?".

Use the GitHub CLI:

```powershell
$branch = git rev-parse --abbrev-ref HEAD
$sha = git rev-parse HEAD

# Wait for the run associated with this commit to start, then watch it.
gh run list --branch $branch --limit 1 --json databaseId,status,conclusion,createdAt
```

Once a run id is known, follow it:

```powershell
gh run watch <run-id> --exit-status
```

`--exit-status` makes the command exit non-zero if the run fails, which
is convenient for chained automation.

On success, report concisely:

```
✅ CI green for <short-sha> on <branch> (3m 14s, 4 jobs)
```

On failure:

```
❌ CI failed for <short-sha> on <branch>
   Failed job: build (60s)
   <last 30 lines of the failing step>
```

Get the failed-step log with:

```powershell
gh run view <run-id> --log-failed
```

If the repo doesn't have GH Actions configured, say so once and stop.

## Merge into master (special)

When the user asks `merge into master` or `merge to main`:

1. Confirm CI is green on the current feature branch.
2. Confirm the PR exists (`gh pr view --json state,mergeable,reviewDecision`).
3. **Confirm with the user** before merging — this is destructive on the
   default branch. Default to `--squash` unless the repo's CONTRIBUTING.md
   says otherwise.

```powershell
gh pr merge --squash --delete-branch
```

After merge, switch back to the default branch and pull:

```powershell
git switch master 2>$null || git switch main
git pull --ff-only
```

If the user did NOT ask to monitor master's CI after merge, stop here.

## Concise output format

The user types short commands. Match the energy. After every successful
ship, reply with one short status block, e.g.:

```
✅ feat(vault): server-side query with list-summary projection
   7 files, +312 / -98
   Pushed: origin/feat/vault-search → bd9f4a2
   CI: ✅ green (3m 14s)
```

No prose preamble, no closing summary. The user's already moved on.

## When NOT to use this skill

- The user is asking what would change if they committed → just run
  `git diff` / `git status` directly, don't ship.
- The user is in the middle of a multi-step debugging session and
  hasn't reached a known-good state → ask before shipping.
- The user said "commit" without "push" — commit only, don't push.
- Repo has a husky/lefthook pre-commit hook that the user disabled
  (HUSKY=0 or similar) → respect it but flag the gap once.
