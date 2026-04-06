---
name: browser-logs
description: "Capture browser console logs, JS errors, and failed network requests from a localhost page via Chrome DevTools Protocol. Use when the user mentions browser console logs, JavaScript errors, client-side debugging, browser console output, JS exceptions, or failed network requests from localhost. Don't use when: automated browser testing (use webapp-testing), downloading CodePen projects (use codepen), server-side logs (use dev-logs), building web UI (use frontend-design), or reading dev server logs (use dev-logs)."
version: 1.0.0
---

# Browser Console Log Capture

Connect to a running Chrome instance via the Chrome DevTools Protocol (CDP), capture console output, uncaught exceptions, and failed network requests from a localhost page, and return structured JSON.

## Prerequisites

Chrome must be running with remote debugging enabled. Launch it with:

**Windows (PowerShell):**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222
```

After launching, open your localhost dev app in a tab (e.g., `http://localhost:3000`).

## Playwright Dependency

The capture script requires Playwright. Install if not already available:

```bash
npm ls playwright 2>/dev/null || npm install playwright
```

## Usage

This skill ships with `capture.js` — a ready-to-run Node.js script located alongside this SKILL.md. Find its absolute path relative to this skill's directory, then run it:

```bash
node /path/to/plugins/dev/skills/browser-logs/capture.js
```

### CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--port PORT` | `9222` | Chrome remote debugging port |
| `--duration SECONDS` | *(omit)* | Enables timed capture mode. Omit for snapshot mode (2s window). |
| `--limit N` | `100` | Maximum number of log entries to return (keeps most recent) |

### Examples

**Snapshot mode** — attach, listen for 2 seconds, return what was captured:
```bash
node capture.js
```

**Timed mode** — capture for 30 seconds (useful for reproducing an issue):
```bash
node capture.js --duration 30
```

**Custom port and limit:**
```bash
node capture.js --port 9333 --duration 10 --limit 50
```

## Output Schema

The script outputs JSON to stdout. Diagnostic messages go to stderr.

```json
{
  "url": "http://localhost:3000/dashboard",
  "capturedAt": "2025-01-15T10:30:00.000Z",
  "mode": "snapshot",
  "duration": null,
  "entries": [
    {
      "type": "console",
      "level": "error",
      "message": "TypeError: Cannot read properties of undefined (reading 'map')",
      "timestamp": 1705312200000,
      "source": "http://localhost:3000/static/js/main.js",
      "line": 42,
      "column": 15,
      "stackTrace": "  at renderList (http://localhost:3000/static/js/main.js:42:15)\n  at App (http://localhost:3000/static/js/main.js:10:5)"
    },
    {
      "type": "exception",
      "message": "Uncaught ReferenceError: foo is not defined",
      "timestamp": 1705312201000,
      "stackTrace": "  at <anonymous> (http://localhost:3000/static/js/main.js:55:1)"
    },
    {
      "type": "network",
      "method": "GET",
      "url": "http://localhost:3000/api/users",
      "status": 500,
      "statusText": "Internal Server Error",
      "timestamp": 1705312202000
    }
  ],
  "summary": {
    "total": 3,
    "errors": 1,
    "warnings": 0,
    "exceptions": 1,
    "networkFailures": 1
  },
  "truncated": false
}
```

### Entry Types

| Type | Description |
|------|-------------|
| `console` | `console.log()`, `console.warn()`, `console.error()`, etc. |
| `exception` | Uncaught exceptions and unhandled promise rejections |
| `network` | HTTP responses with status ≥ 400, plus connection failures (CORS, refused, etc.) |

## Important Limitation

**Snapshot mode only captures events that occur AFTER the script attaches.** It cannot retrieve historical console output that was logged before the script connected. The 2-second snapshot window captures whatever happens in real time during those 2 seconds.

For pages that have already loaded and logged errors during startup:
- Use `--duration` mode with a longer window (e.g., `--duration 10`)
- Ask the user to **reload the page** or **interact with the page** while the capture is running
- This ensures the script is listening when the events fire

## Security

The capture script is **strictly read-only**. It uses only these CDP domains:
- `Runtime.enable` — listen for console API calls and exceptions
- `Network.enable` — listen for network responses and failures

It does **not** call any mutation methods (`Page.navigate`, `Runtime.evaluate`, `Input.*`, `DOM.*`, `Page.reload`, etc.). It cannot modify browser state, inject scripts, or navigate pages.

**CDP port security warning:** The `--remote-debugging-port` flag exposes full browser control on that port. On shared or multi-user machines, ensure the port is bound to `localhost` only (Chrome's default behavior). Do not expose it to external networks.

## Troubleshooting

**"Failed to connect to Chrome DevTools on port 9222"**
- Chrome is not running with `--remote-debugging-port=9222`
- Another process is using port 9222
- Chrome was launched without the flag — close all Chrome instances and relaunch with the flag

**"No localhost tab found"**
- Open your dev app in a Chrome tab (e.g., `http://localhost:3000`)
- The script looks for URLs matching `localhost`, `127.0.0.1`, `[::1]`, or `0.0.0.0`
- If using a custom hostname, it won't be detected — use `localhost` instead

**Snapshot mode returns empty entries**
- This is expected if nothing happened during the 2-second window
- Use `--duration` mode for a longer capture window
- Have the user interact with the page or reload it while capturing

**Playwright not installed**
- Run `npm install playwright` in any directory
- The script uses Playwright's CDP connection — no browser download needed since it connects to your existing Chrome

**Network entries missing URLs**
- Some network failures (e.g., CORS preflight blocks) may not have a URL if the request was cancelled before being sent
