---
name: dev-logs
description: "Read and filter dev server logs from .dev.log files. Use when the user mentions dev logs, server logs, dev server output, check logs, what errors, recent build or startup errors, runtime exceptions, or webhook events. Also use when debugging server-side issues."
version: 1.0.0
---

# Dev Server Logs

Read dev server output from a `.dev.log` file in the project root. Supports filtering by log level, module, and keyword search across structured JSON and unstructured plain-text log lines.

## Check for Log File

First, check whether `.dev.log` exists in the current working directory:

```powershell
Test-Path .dev.log
```

- If **True**: proceed to **Reading Logs**.
- If **False**: proceed to **Setup Detection**.

## Reading Logs

### Default: Last N Lines

Read the last 100 lines (or a user-specified count):

```powershell
Get-Content .dev.log -Tail 100
```

Replace `100` with the user's requested count. If the file is empty, report: "The .dev.log file is empty. The dev server may not have produced output yet, or it may have just restarted."

### Filtering by Level

For structured JSON log lines (format: `{"timestamp":"...","level":"info","module":"...","message":"...","data":{...}}`), filter by level:

```powershell
Get-Content .dev.log -Tail 500 | Where-Object {
  try { ($_ | ConvertFrom-Json).level -eq 'error' } catch { $false }
}
```

Replace `'error'` with the requested level: `error`, `warn`, `info`, or `debug`. To include multiple levels (e.g., errors AND warnings):

```powershell
Get-Content .dev.log -Tail 500 | Where-Object {
  try { ($_ | ConvertFrom-Json).level -in @('error','warn') } catch { $false }
}
```

When filtering for errors, increase the tail count to 500 to catch sparse entries.

### Filtering by Module

Filter structured JSON lines by module field:

```powershell
Get-Content .dev.log -Tail 500 | Where-Object {
  try { ($_ | ConvertFrom-Json).module -eq 'stripe' } catch { $false }
}
```

Known modules: `auth`, `stt`, `recording`, `credits`, `stripe`, `ai`, `session`, `ws`, `audio`, `db`.

### Filtering by Keyword

For free-text search across all log lines (both JSON and plain text), use the grep tool:

```
grep pattern="keyword" path=".dev.log" output_mode="content" -n true
```

For case-insensitive search add `-i true`. This works on both structured and unstructured lines.

### Combining Filters

When the user wants multiple filters (e.g., "show me stripe errors"), combine level and module:

```powershell
Get-Content .dev.log -Tail 500 | Where-Object {
  try {
    $obj = $_ | ConvertFrom-Json
    $obj.level -eq 'error' -and $obj.module -eq 'stripe'
  } catch { $false }
}
```

## Output Presentation

When presenting log output to the user:

1. **Parse each line independently.** Try JSON parse per line; if it fails, treat as raw text. Never fail on a single malformed line.
2. **Structured JSON lines**: Present key fields — timestamp, level, module, message. Include `data` only when relevant to the user's question.
3. **Non-JSON lines**: Present as-is. These include Next.js framework messages (compilation, HMR, routes), Stripe CLI events, Node.js warnings, and startup banners.
4. **ANSI escape sequences**: Log files may contain ANSI color codes. Ignore them when parsing; they do not affect content meaning.
5. **Multiline stack traces**: Keep stack traces together with their preceding error line. Stack trace lines typically start with whitespace or `at `.
6. **Summarize when appropriate**: For large output, summarize patterns (e.g., "47 info-level auth logs, 3 errors in stripe module") then show the most relevant entries in full.

## Setup Detection

When `.dev.log` does not exist, help the user set up log-to-file piping. **Do not auto-modify files — always ask for explicit confirmation first.**

### Step 1: Check Project Type

```powershell
Test-Path package.json
```

If no `package.json` exists, tell the user: "This doesn't appear to be a Node.js project. To use dev-logs, pipe your dev server output to a `.dev.log` file in the project root." Stop here.

### Step 2: Read Current Dev Script

```powershell
(Get-Content package.json -Raw | ConvertFrom-Json).scripts.dev
```

Report the current dev script to the user. Explain the proposed changes and **ask for confirmation** before proceeding.

### Step 3: Explain the Proposed Changes

Tell the user what will happen:

1. The current `dev` script will be renamed to `dev:server`
2. A new `scripts/dev-with-logs.mjs` helper will be created that tees output to both the terminal and `.dev.log`
3. The `dev` script will be updated to `node scripts/dev-with-logs.mjs`
4. `.dev.log` will be added to `.gitignore`

**Only proceed to Step 4 after the user agrees.**

### Step 4: Create the Helper Script

Detect the project's package manager by checking for lock files (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, otherwise npm). Create `scripts/dev-with-logs.mjs` in the project root:

```javascript
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

// Truncate log file on each restart
writeFileSync('.dev.log', '');

const log = createWriteStream('.dev.log', { flags: 'a' });

// Detect package manager
const pm = existsSync('pnpm-lock.yaml') ? 'pnpm' : existsSync('yarn.lock') ? 'yarn' : 'npm';
const cmd = process.platform === 'win32' ? `${pm}.cmd` : pm;

const child = spawn(cmd, ['run', 'dev:server'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});

// Tee stdout and stderr to both terminal and log file
child.stdout.on('data', (data) => {
  process.stdout.write(data);
  log.write(data);
});
child.stderr.on('data', (data) => {
  process.stderr.write(data);
  log.write(data);
});

child.on('exit', (code) => process.exit(code ?? 1));
```

### Step 5: Update package.json

Using the edit tool:

1. Rename the existing `"dev"` script to `"dev:server"`
2. Add a new `"dev"` script: `"node scripts/dev-with-logs.mjs"`

### Step 6: Update .gitignore

Add `.dev.log` to `.gitignore` if not already present:

```powershell
$content = if (Test-Path .gitignore) { Get-Content .gitignore -Raw } else { '' }
if ($content -notmatch '\.dev\.log') {
  Add-Content .gitignore "`n# Dev server logs`n.dev.log"
}
```

### Step 7: Confirm to User

Tell the user: "Setup complete. Run `pnpm dev` (or your usual dev command) to start the dev server with logging. Output goes to both your terminal and `.dev.log`. Ask me to 'check dev logs' anytime to see what the server is doing."

## Troubleshooting

**Logs are empty after starting the server**: The server may buffer output. Try adding `--no-buffer` to the `concurrently` command in `dev:server`, or set `NODE_OPTIONS=--max-old-space-size=4096` if the server is crashing silently.

**Only stdout captured, stderr missing**: Verify the helper script pipes both `child.stdout` and `child.stderr`. Both streams must be captured to see compilation errors, warnings, and crash output.

**File grows very large**: The helper script truncates `.dev.log` on each restart. If the server runs for a very long time, use a larger `-Tail` value and keyword filtering to find relevant entries.
