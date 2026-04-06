#!/usr/bin/env node
'use strict';

// Browser Console Log Capture — CDP-based read-only log collector
// Connects to a running Chrome instance, captures console output, exceptions,
// and failed network requests from localhost pages. Outputs structured JSON.

// ─── Section 1: Argument Parsing ────────────────────────────────────────────

function parseArgs(argv) {
  const args = { port: 9222, duration: null, limit: 100 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--port':
        args.port = parseInt(argv[++i], 10);
        if (isNaN(args.port) || args.port < 1 || args.port > 65535) {
          console.error('Error: --port must be a number between 1 and 65535');
          process.exit(1);
        }
        break;
      case '--duration':
        args.duration = parseInt(argv[++i], 10);
        if (isNaN(args.duration) || args.duration < 1) {
          console.error('Error: --duration must be a positive number of seconds');
          process.exit(1);
        }
        break;
      case '--limit':
        args.limit = parseInt(argv[++i], 10);
        if (isNaN(args.limit) || args.limit < 1) {
          console.error('Error: --limit must be a positive number');
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        console.error('Usage: node capture.js [--port PORT] [--duration SECONDS] [--limit N]');
        console.error('');
        console.error('Options:');
        console.error('  --port PORT        Chrome remote debugging port (default: 9222)');
        console.error('  --duration SECONDS Timed capture mode (omit for 2s snapshot)');
        console.error('  --limit N          Max entries to return (default: 100)');
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(1);
    }
  }
  return args;
}

// ─── Section 2: Target Discovery ────────────────────────────────────────────

async function findLocalhostTarget(port) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/json`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/;
          const match = targets.find(
            (t) => t.type === 'page' && localhostPattern.test(t.url)
          );
          resolve(match || null);
        } catch (err) {
          reject(new Error(`Failed to parse CDP targets: ${err.message}`));
        }
      });
    });
    req.on('error', (err) => {
      reject(new Error(`Cannot reach Chrome DevTools on port ${port}: ${err.message}`));
    });
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout connecting to Chrome DevTools on port ${port}`));
    });
  });
}

// ─── Section 3: Main ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Connect to Chrome via CDP using Playwright
  let chromium;
  try {
    chromium = require('playwright').chromium;
  } catch (err) {
    console.log(JSON.stringify({
      error: true,
      message: 'Playwright is not installed. Run: npm install playwright'
    }, null, 2));
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${args.port}`);
  } catch (err) {
    console.log(JSON.stringify({
      error: true,
      message: `Failed to connect to Chrome DevTools on port ${args.port}. Is Chrome running with --remote-debugging-port=${args.port}?`,
      autoLaunchCommands: {
        windows: `& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${args.port}`,
        macos: `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${args.port}`,
        linux: `google-chrome --remote-debugging-port=${args.port}`
      }
    }, null, 2));
    process.exit(1);
  }

  try {
    // Find a localhost page across all browser contexts
    const contexts = browser.contexts();
    let targetPage = null;
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/;

    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        if (localhostPattern.test(page.url())) {
          targetPage = page;
          break;
        }
      }
      if (targetPage) break;
    }

    if (!targetPage) {
      console.log(JSON.stringify({
        error: true,
        message: 'No localhost tab found. Open your dev app in Chrome first (e.g., http://localhost:3000).'
      }, null, 2));
      process.exit(1);
    }

    console.error(`Found localhost page: ${targetPage.url()}`);

    // Create a CDP session on the target page
    const cdp = await targetPage.context().newCDPSession(targetPage);

    const entries = [];
    const requestMap = new Map(); // requestId -> { url, method }

    // Enable CDP domains (read-only listeners only)
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // ── Network request tracking ──
    // Track request URLs via Network.requestWillBeSent so we can correlate
    // with responseReceived and loadingFailed events
    cdp.on('Network.requestWillBeSent', (params) => {
      requestMap.set(params.requestId, {
        url: params.request.url,
        method: params.request.method
      });
    });

    // ── Console API events ──
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (entries.length >= args.limit * 2) return; // soft cap to avoid runaway memory

      const message = params.args
        .map((a) => (a.value !== undefined ? String(a.value) : (a.description || '')))
        .join(' ');

      const entry = {
        type: 'console',
        level: params.type, // 'log', 'warn', 'error', 'debug', 'info'
        message: message,
        timestamp: params.timestamp
      };

      if (params.stackTrace && params.stackTrace.callFrames && params.stackTrace.callFrames.length > 0) {
        const frame = params.stackTrace.callFrames[0];
        entry.source = frame.url || null;
        entry.line = frame.lineNumber || null;
        entry.column = frame.columnNumber || null;
        entry.stackTrace = params.stackTrace.callFrames
          .map((f) => `  at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`)
          .join('\n');
      }

      entries.push(entry);
    });

    // ── Uncaught exception events ──
    cdp.on('Runtime.exceptionThrown', (params) => {
      if (entries.length >= args.limit * 2) return;

      const ex = params.exceptionDetails;
      let message = ex.text || '';
      if (ex.exception && ex.exception.description) {
        message = ex.exception.description;
      }

      const entry = {
        type: 'exception',
        message: message,
        timestamp: params.timestamp
      };

      if (ex.stackTrace && ex.stackTrace.callFrames) {
        entry.stackTrace = ex.stackTrace.callFrames
          .map((f) => `  at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`)
          .join('\n');
      }

      entries.push(entry);
    });

    // ── Network error responses (4xx / 5xx) ──
    cdp.on('Network.responseReceived', (params) => {
      if (params.response.status >= 400) {
        if (entries.length >= args.limit * 2) return;

        const req = requestMap.get(params.requestId) || {};
        entries.push({
          type: 'network',
          method: req.method || 'GET',
          url: params.response.url || req.url || '',
          status: params.response.status,
          statusText: params.response.statusText || '',
          timestamp: params.timestamp
        });
      }
    });

    // ── Network loading failures (CORS, connection refused, DNS, etc.) ──
    cdp.on('Network.loadingFailed', (params) => {
      if (entries.length >= args.limit * 2) return;

      const req = requestMap.get(params.requestId) || {};
      entries.push({
        type: 'network',
        method: req.method || 'GET',
        url: req.url || '',
        status: 0,
        statusText: params.errorText || 'Loading failed',
        timestamp: params.timestamp
      });
    });

    // ── Wait for events ──
    const duration = args.duration;
    const waitMs = duration ? duration * 1000 : 2000;
    console.error(`Capturing browser logs (${duration ? duration + 's timed' : 'snapshot'} mode)...`);
    await new Promise((r) => setTimeout(r, waitMs));

    // ── Truncation ──
    let truncated = false;
    let outputEntries = entries;
    if (entries.length > args.limit) {
      outputEntries = entries.slice(entries.length - args.limit);
      truncated = true;
    }

    // ── Build summary ──
    const summary = {
      total: outputEntries.length,
      errors: outputEntries.filter((e) => e.type === 'console' && e.level === 'error').length,
      warnings: outputEntries.filter((e) => e.type === 'console' && (e.level === 'warn' || e.level === 'warning')).length,
      exceptions: outputEntries.filter((e) => e.type === 'exception').length,
      networkFailures: outputEntries.filter((e) => e.type === 'network').length
    };

    // ── Output structured JSON to stdout ──
    const output = {
      url: targetPage.url(),
      capturedAt: new Date().toISOString(),
      mode: duration ? 'timed' : 'snapshot',
      duration: duration || null,
      entries: outputEntries,
      summary: summary,
      truncated: truncated
    };

    console.log(JSON.stringify(output, null, 2));

    // Cleanly detach the CDP session
    await cdp.detach();
  } finally {
    // disconnect() does NOT close the user's Chrome — it only drops the CDP connection
    if (browser) {
      await browser.disconnect();
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
