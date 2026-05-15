/**
 * Refresh orchestration: decrypt → import, with throttle and lock.
 *
 * Goals:
 *   - `wechat search` can call this transparently before every query so users
 *     never see stale results.
 *   - Bursty searches don't trigger redundant decryption (throttle).
 *   - Concurrent processes don't clobber each other's decrypted files (lock).
 *   - Refresh failures (no WeChat running, no pywxdump, etc.) degrade
 *     gracefully — the search still runs against the existing index.
 *
 * The decrypt and import implementations are passed in via `decryptFn` and
 * `importFn` so this module can be unit-tested without WeChat / pywxdump.
 */

import { existsSync, openSync, writeSync, closeSync, readFileSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { autoDecrypt, getDecryptedDir } from './decrypt.mjs';
import { importFromDesktop, autoDetectPaths } from './importer.mjs';
import { getDataDir } from './db.mjs';

const LOCK_FILENAME = 'refresh.lock';
const LOCK_STALE_MS = 10 * 60 * 1000;     // 10 minutes
const DEFAULT_THROTTLE_SECONDS = 30;

function lockPath() {
  return join(getDataDir(), LOCK_FILENAME);
}

/**
 * Acquire an exclusive lock by atomically creating a lockfile.
 * If a stale lock exists (older than LOCK_STALE_MS) it is removed and retried.
 *
 * Returns `{ acquired: true, path }` on success, or
 * `{ acquired: false, holder, ageMs }` if another process holds a fresh lock.
 */
export function acquireLock() {
  const path = lockPath();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, 'wx');
      try {
        writeSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
      } finally {
        closeSync(fd);
      }
      return { acquired: true, path };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Existing lock — check staleness
      let info = {};
      let mtimeMs = 0;
      try {
        const stat = statSync(path);
        mtimeMs = stat.mtimeMs;
        info = JSON.parse(readFileSync(path, 'utf-8'));
      } catch {
        // unreadable / corrupt lock — treat as stale
      }
      const age = Date.now() - (mtimeMs || 0);
      if (age > LOCK_STALE_MS) {
        try { unlinkSync(path); } catch { /* race — retry */ }
        continue;
      }
      return { acquired: false, holder: info, ageMs: age };
    }
  }
  return { acquired: false, holder: {}, ageMs: 0 };
}

/**
 * Release a lock previously acquired by acquireLock.
 * Tolerates missing lockfile (e.g., already cleaned up).
 */
export function releaseLock() {
  try { unlinkSync(lockPath()); } catch { /* ignore */ }
}

/**
 * Decide whether a refresh should run for the given source path.
 * Returns `{ should: boolean, reason: string, lastFinishedAt?: string, ageSeconds?: number }`.
 *
 * - If `force` is true → always refresh.
 * - If no successful import recorded for this source → refresh.
 * - If last successful import within `throttleSeconds` → skip.
 */
export function shouldRefresh(db, sourcePath, throttleSeconds = DEFAULT_THROTTLE_SECONDS, opts = {}) {
  const { force = false, now = Date.now() } = opts;
  if (force) return { should: true, reason: 'forced' };

  const row = db.prepare(
    `SELECT finished_at FROM imports
     WHERE source_path = ? AND finished_at IS NOT NULL
     ORDER BY id DESC LIMIT 1`
  ).get(sourcePath);

  if (!row || !row.finished_at) {
    return { should: true, reason: 'no-prior-import' };
  }

  // SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS' in UTC; treat as such.
  const last = Date.parse(row.finished_at + 'Z');
  if (Number.isNaN(last)) {
    return { should: true, reason: 'unparseable-finished-at' };
  }
  const ageSeconds = Math.max(0, Math.floor((now - last) / 1000));
  if (ageSeconds < throttleSeconds) {
    return { should: false, reason: 'throttled', lastFinishedAt: row.finished_at, ageSeconds };
  }
  return { should: true, reason: 'stale', lastFinishedAt: row.finished_at, ageSeconds };
}

/**
 * Orchestrate decrypt + import for the first auto-detected WeChat account.
 *
 * @param {Database} db        Opened index database
 * @param {object}   options
 *   - force:           bypass throttle
 *   - throttleSeconds: skip refresh if last successful import is fresher
 *   - decryptFn:       () => { decryptedDir, wxDir, results } (default: autoDecrypt)
 *   - importFn:        (db, dir, opts) => importResult        (default: importFromDesktop)
 *   - detectFn:        () => string[] of account paths        (default: autoDetectPaths)
 *
 * Returns:
 *   {
 *     refreshed: boolean,
 *     reason: 'ok' | 'throttled' | 'no-account' | 'lock-held' |
 *             'decrypt-failed' | 'import-failed',
 *     error?: string,
 *     imported?: number,
 *     skipped?: number,
 *     decryptedDir?: string,
 *     wxDir?: string,
 *     ageSeconds?: number,
 *     lastFinishedAt?: string,
 *   }
 */
export function refreshIndex(db, options = {}) {
  const {
    force = false,
    throttleSeconds = DEFAULT_THROTTLE_SECONDS,
    decryptFn = autoDecrypt,
    importFn = importFromDesktop,
    detectFn = autoDetectPaths,
    logger = console,
  } = options;

  const accounts = detectFn();
  if (accounts.length === 0) {
    return { refreshed: false, reason: 'no-account', error: 'No WeChat data directory detected.' };
  }

  // Use the decrypted-DB directory as the throttle key — it's the actual import
  // source path recorded in the imports table.
  const sourcePath = getDecryptedDir();
  const decision = shouldRefresh(db, sourcePath, throttleSeconds, { force });
  if (!decision.should) {
    return {
      refreshed: false,
      reason: 'throttled',
      ageSeconds: decision.ageSeconds,
      lastFinishedAt: decision.lastFinishedAt,
    };
  }

  const lock = acquireLock();
  if (!lock.acquired) {
    return {
      refreshed: false,
      reason: 'lock-held',
      error: `Another refresh is in progress (pid=${lock.holder?.pid ?? '?'}, age=${Math.floor((lock.ageMs || 0) / 1000)}s).`,
    };
  }

  try {
    let decryptResult;
    try {
      decryptResult = decryptFn();
    } catch (err) {
      return { refreshed: false, reason: 'decrypt-failed', error: err.message };
    }

    let importResult;
    try {
      importResult = importFn(db, decryptResult.decryptedDir, {
        skipSelf: true,
        mediaDir: decryptResult.wxDir,
      });
    } catch (err) {
      return { refreshed: false, reason: 'import-failed', error: err.message };
    }

    return {
      refreshed: true,
      reason: 'ok',
      imported: importResult.imported,
      skipped: importResult.skipped,
      healed: importResult.healed || 0,
      decryptedDir: decryptResult.decryptedDir,
      wxDir: decryptResult.wxDir,
    };
  } finally {
    releaseLock();
  }
}
