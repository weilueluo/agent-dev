#!/usr/bin/env node

/**
 * wechat.mjs — CLI entry point for the WeChat skill.
 *
 * Commands:
 *   import   Import messages from WeChat desktop DB
 *   search   Search the local message index (auto-refreshes by default)
 *   download Look up a message/media by row ID
 *   export   Export messages and associated cached media
 *   status   Show index stats
 *   decrypt  Decrypt WeChat DBs to ~/.wechat/decrypted_db
 *   refresh  Decrypt + import in one step (with throttle)
 */

import { program } from 'commander';
import { existsSync } from 'fs';
import { openDb, closeDb, getStats } from './lib/db.mjs';
import { importFromDesktop, autoDetectPaths } from './lib/importer.mjs';
import { searchMessages, formatResults, formatResultsJson } from './lib/search.mjs';
import { lookupMedia, formatLookup } from './lib/media.mjs';
import { exportMessages, formatExportSummary } from './lib/exporter.mjs';
import { autoDecrypt, getDecryptedDir } from './lib/decrypt.mjs';
import { refreshIndex } from './lib/refresh.mjs';
import dayjs from 'dayjs';

program
  .name('wechat')
  .description('WeChat local message index — import, search, and download')
  .version('1.0.0');

// ─── import ─────────────────────────────────────────────────────────
program
  .command('import')
  .description('Import messages from WeChat desktop database files')
  .option('--path <dir>', 'Path to WeChat data or decrypted DB directory')
  .option('--auto-detect', 'Auto-detect WeChat data directories')
  .option('--media-dir <dir>', 'Original WeChat dir for locating media files (when using decrypted DBs)')
  .option('--include-self', 'Include self-sent messages')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    try {
      const db = openDb();

      let paths = [];
      if (opts.path) {
        paths = [opts.path];
      } else if (opts.autoDetect) {
        paths = autoDetectPaths();
        if (paths.length === 0) {
          const msg = 'No WeChat data directories found. Use --path to specify manually.';
          if (opts.json) {
            console.log(JSON.stringify({ error: msg }));
          } else {
            console.error(msg);
          }
          process.exit(1);
        }
        console.error(`Found ${paths.length} WeChat account(s): ${paths.join(', ')}`);
      } else {
        const msg = 'Specify --path <dir> or --auto-detect';
        if (opts.json) {
          console.log(JSON.stringify({ error: msg }));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      const results = [];
      for (const p of paths) {
        console.error(`\nImporting from: ${p}`);
        const result = importFromDesktop(db, p, {
          skipSelf: !opts.includeSelf,
          mediaDir: opts.mediaDir,
        });
        results.push(result);
      }

      if (opts.json) {
        console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
      } else {
        for (const r of results) {
          console.log(`\nImport complete: ${r.path}`);
          const healedSeg = r.healed ? `, ${r.healed} healed` : '';
          console.log(`  ${r.imported} messages imported, ${r.skipped} duplicates skipped${healedSeg}, ${r.errors} errors`);
          console.log(`  ${r.databases} DB file(s), ${r.contacts} contacts loaded`);
        }
      }

      closeDb();
    } catch (err) {
      console.error(`Import failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── search ─────────────────────────────────────────────────────────
program
  .command('search [query]')
  .description('Search the local message index (auto-refreshes by default)')
  .option('--type <type>', 'Filter by message type (text, image, file, video, voice, link, sticker)')
  .option('--room <name>', 'Filter by room/group name')
  .option('--limit <n>', 'Max results', '50')
  .option('--offset <n>', 'Skip first N results', '0')
  .option('--no-refresh', 'Skip the auto pull-then-search refresh step')
  .option('--force-refresh', 'Bypass the refresh throttle and re-decrypt + import')
  .option('--refresh-throttle <seconds>', 'Skip refresh if last import is fresher than this', '30')
  .option('--json', 'Output as JSON')
  .action((query, opts) => {
    try {
      const db = openDb();

      if (!query && !opts.type && !opts.room) {
        const msg = 'Provide a search query, --type, or --room filter';
        if (opts.json) {
          console.log(JSON.stringify({ error: msg }));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      // Refresh first (unless explicitly disabled). Failures are surfaced but
      // do not block search — the existing index is still queryable.
      let refreshInfo = { refreshed: false, reason: 'disabled' };
      if (opts.refresh !== false) {
        const throttle = parseInt(opts.refreshThrottle, 10);
        refreshInfo = refreshIndex(db, {
          force: !!opts.forceRefresh,
          throttleSeconds: Number.isFinite(throttle) ? throttle : 30,
        });
        if (refreshInfo.reason !== 'ok' && refreshInfo.reason !== 'throttled') {
          console.error(`  refresh: ${refreshInfo.reason}${refreshInfo.error ? ' — ' + refreshInfo.error : ''}`);
        } else if (refreshInfo.refreshed) {
          const healedSeg = refreshInfo.healed ? `, healed ${refreshInfo.healed}` : '';
          console.error(`  refresh: imported ${refreshInfo.imported}, skipped ${refreshInfo.skipped}${healedSeg}`);
        }
      }

      const results = searchMessages(db, query, {
        type: opts.type,
        room: opts.room,
        limit: parseInt(opts.limit, 10),
        offset: parseInt(opts.offset, 10),
      });

      if (opts.json) {
        console.log(JSON.stringify({
          refresh: refreshInfo,
          results: formatResultsJson(results),
        }, null, 2));
      } else {
        console.log(formatResults(results));
      }

      closeDb();
    } catch (err) {
      console.error(`Search failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── download ───────────────────────────────────────────────────────
program
  .command('download')
  .description('Look up a message/media file by row ID')
  .requiredOption('--id <id>', 'Message row ID from search results')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    try {
      const db = openDb();

      const result = lookupMedia(db, parseInt(opts.id, 10));

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatLookup(result));
      }

      closeDb();
    } catch (err) {
      console.error(`Download lookup failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── export ──────────────────────────────────────────────────────────
program
  .command('export [query]')
  .description('Export messages plus associated cached media files')
  .requiredOption('--out <dir>', 'Destination directory for messages, transcript, manifests, and media/')
  .option('--room <name>', 'Filter by room/group name')
  .option('--type <type>', 'Filter by message type (text, image, file, video, voice, link, sticker)')
  .option('--limit <n>', 'Max messages to export (use 0 for no cap)', '1000')
  .option('--offset <n>', 'Skip first N results', '0')
  .option('--all', 'Allow exporting without a query, room, or type filter')
  .option('--media-dir <dir>', 'Original WeChat account dir used to resolve cached media files')
  .option('--source-db-dir <dir>', 'Decrypted DB directory used to recover media paths from BytesExtra')
  .option('--no-media', 'Export messages only; do not copy media files')
  .option('--no-refresh', 'Skip the auto pull-then-export refresh step')
  .option('--force-refresh', 'Bypass the refresh throttle and re-decrypt + import before export')
  .option('--refresh-throttle <seconds>', 'Skip refresh if last import is fresher than this', '30')
  .option('--json', 'Output as JSON')
  .action((query, opts) => {
    try {
      if (!query && !opts.type && !opts.room && !opts.all) {
        const msg = 'Provide a search query, --type, --room, or --all to export.';
        if (opts.json) console.log(JSON.stringify({ error: msg }));
        else console.error(msg);
        process.exit(1);
      }

      const db = openDb();
      let refreshInfo = { refreshed: false, reason: 'disabled' };
      if (opts.refresh !== false) {
        const throttle = parseInt(opts.refreshThrottle, 10);
        refreshInfo = refreshIndex(db, {
          force: !!opts.forceRefresh,
          throttleSeconds: Number.isFinite(throttle) ? throttle : 30,
        });
        if (refreshInfo.reason !== 'ok' && refreshInfo.reason !== 'throttled') {
          console.error(`  refresh: ${refreshInfo.reason}${refreshInfo.error ? ' — ' + refreshInfo.error : ''}`);
        } else if (refreshInfo.refreshed) {
          const healedSeg = refreshInfo.healed ? `, healed ${refreshInfo.healed}` : '';
          console.error(`  refresh: imported ${refreshInfo.imported}, skipped ${refreshInfo.skipped}${healedSeg}`);
        }
      }

      const detectedAccounts = opts.mediaDir ? [] : autoDetectPaths();
      const sourceDbDir = opts.sourceDbDir
        || refreshInfo.decryptedDir
        || (existsSync(getDecryptedDir()) ? getDecryptedDir() : null);
      const mediaDir = opts.mediaDir
        || refreshInfo.wxDir
        || detectedAccounts[0]
        || null;

      const result = exportMessages(db, query, {
        outDir: opts.out,
        room: opts.room,
        type: opts.type,
        limit: parseInt(opts.limit, 10),
        offset: parseInt(opts.offset, 10),
        includeMedia: opts.media !== false,
        mediaDir,
        sourceDbDir,
      });
      result.refresh = refreshInfo;
      result.sources = {
        media_dir: mediaDir,
        source_db_dir: sourceDbDir,
      };

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatExportSummary(result));
      }

      closeDb();
    } catch (err) {
      console.error(`Export failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── status ─────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show index database stats')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    try {
      const db = openDb();
      const stats = getStats(db);

      if (opts.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('WeChat Index Status');
        console.log(`  Database:     ${stats.dbPath}`);
        console.log(`  Messages:     ${stats.totalMessages}`);

        if (stats.dateRange.earliest) {
          console.log(`  Date range:   ${dayjs.unix(stats.dateRange.earliest).format('YYYY-MM-DD')} — ${dayjs.unix(stats.dateRange.latest).format('YYYY-MM-DD')}`);
        }

        console.log(`  Imports:      ${stats.importCount}`);

        if (stats.lastImport) {
          console.log(`  Last import:  ${stats.lastImport.finished_at || stats.lastImport.started_at} (${stats.lastImport.msg_count} messages)`);
        }

        if (stats.byType.length > 0) {
          console.log('\n  By type:');
          for (const t of stats.byType) {
            console.log(`    ${t.type}: ${t.count}`);
          }
        }

        if (stats.byRoom.length > 0) {
          console.log('\n  Top rooms:');
          for (const r of stats.byRoom) {
            console.log(`    ${r.room}: ${r.count}`);
          }
        }
      }

      closeDb();
    } catch (err) {
      console.error(`Status check failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── refresh ────────────────────────────────────────────────────────
program
  .command('refresh')
  .description('Decrypt and import the latest WeChat messages (with throttle).')
  .option('--force', 'Bypass the throttle window')
  .option('--throttle <seconds>', 'Skip if last successful import is fresher than this', '30')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    try {
      const db = openDb();
      const throttle = parseInt(opts.throttle, 10);
      const result = refreshIndex(db, {
        force: !!opts.force,
        throttleSeconds: Number.isFinite(throttle) ? throttle : 30,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.refreshed) {
        const healedSeg = result.healed ? `, healed ${result.healed}` : '';
        console.log(`Refreshed: imported ${result.imported}, skipped ${result.skipped}${healedSeg}`);
        console.log(`  decrypted dir: ${result.decryptedDir}`);
        console.log(`  WeChat dir:    ${result.wxDir}`);
      }else {
        console.log(`Skipped: ${result.reason}${result.error ? ' — ' + result.error : ''}`);
        if (result.lastFinishedAt) {
          console.log(`  last successful import: ${result.lastFinishedAt} (${result.ageSeconds}s ago)`);
        }
      }

      closeDb();
      // Non-zero exit if refresh was attempted and failed (helps shell scripts).
      const failed = !result.refreshed && /failed|no-account|lock-held/.test(result.reason);
      if (failed) process.exit(2);
    } catch (err) {
      console.error(`Refresh failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── decrypt ─────────────────────────────────────────────────────────
program
  .command('decrypt')
  .description('Decrypt WeChat desktop DBs (requires running WeChat + pywxdump)')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    try {
      console.error('Extracting key from running WeChat process...');
      const result = autoDecrypt();

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Decrypted to: ${result.decryptedDir}`);
        for (const r of result.results) {
          const status = r.status === 'ok' ? '✓' : '✗';
          console.log(`  ${status} ${r.file}: ${r.status}`);
        }
        console.log(`\nNow run: import --path "${result.decryptedDir}" --media-dir "${result.wxDir}"`);
      }
    } catch (err) {
      console.error(`Decrypt failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
