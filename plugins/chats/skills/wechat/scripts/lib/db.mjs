/**
 * SQLite index database layer for the WeChat skill.
 * Manages the local index at ~/.wechat/index.db
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.wechat');
const DB_PATH = join(DATA_DIR, 'index.db');

let _db = null;

export function getDataDir() {
  return DATA_DIR;
}

export function getDbPath() {
  return DB_PATH;
}

export function openDb() {
  if (_db) return _db;

  mkdirSync(DATA_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  migrate(_db);
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function migrate(db) {
  createSchema(db);
}

/**
 * Create the full schema (messages table, indexes, FTS5 mirror, imports table).
 * Idempotent — safe to call repeatedly, also exported so tests can build a
 * production-shape DB without going through the openDb() singleton.
 */
export function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id   TEXT,
      timestamp   INTEGER,
      sender      TEXT,
      sender_id   TEXT,
      room        TEXT,
      room_id     TEXT,
      type        TEXT,
      text        TEXT,
      filename    TEXT,
      mime_type   TEXT,
      media_path  TEXT,
      media_size  INTEGER,
      source_db   TEXT,
      imported_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    CREATE INDEX IF NOT EXISTS idx_messages_source_id ON messages(source_id);
  `);

  ensureUniqueSourceIndex(db);

  // FTS5 virtual table for full-text search
  const hasFts = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'"
  ).get();

  if (!hasFts) {
    db.exec(`
      CREATE VIRTUAL TABLE messages_fts USING fts5(
        sender, room, text, filename,
        content=messages, content_rowid=id
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, sender, room, text, filename)
        VALUES (new.id, new.sender, new.room, new.text, new.filename);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, sender, room, text, filename)
        VALUES ('delete', old.id, old.sender, old.room, old.text, old.filename);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, sender, room, text, filename)
        VALUES ('delete', old.id, old.sender, old.room, old.text, old.filename);
        INSERT INTO messages_fts(rowid, sender, room, text, filename)
        VALUES (new.id, new.sender, new.room, new.text, new.filename);
      END;
    `);
  }

  // Import tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'wechat-db',
      msg_count   INTEGER DEFAULT 0,
      started_at  TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
  `);
}

/**
 * Create the unique (source_id, source_db) index used for idempotent inserts.
 * If pre-existing duplicates block creation, dedupe (keep lowest id) and retry.
 * Exported so callers can run it explicitly after a custom import path; the
 * normal `openDb()` path calls it during migration.
 */
export function ensureUniqueSourceIndex(db) {
  const sql = `CREATE UNIQUE INDEX IF NOT EXISTS uniq_messages_source ON messages(source_id, source_db) WHERE source_id IS NOT NULL AND source_db IS NOT NULL`;
  try {
    db.exec(sql);
    return { dedupedRows: 0 };
  } catch (err) {
    if (!/UNIQUE constraint failed/i.test(err.message)) throw err;
  }
  // Fallback: drop dupes (keep lowest id), retry. Bound the work in a tx.
  const dedupe = db.prepare(`
    DELETE FROM messages
    WHERE id NOT IN (
      SELECT MIN(id) FROM messages
      WHERE source_id IS NOT NULL AND source_db IS NOT NULL
      GROUP BY source_id, source_db
    )
    AND source_id IS NOT NULL AND source_db IS NOT NULL
  `);
  const result = db.transaction(() => dedupe.run())();
  db.exec(sql);
  return { dedupedRows: result.changes };
}

/**
 * Insert a batch of messages efficiently using a transaction.
 *
 * Two-pass dedupe semantics:
 *   1. INSERT OR IGNORE on the (source_id, source_db) partial unique index —
 *      brand-new rows land here and count toward `inserted`.
 *   2. For rows that conflicted, if the incoming row provides a non-null
 *      `sender_id` and the stored row's `sender_id` is still NULL, we UPDATE
 *      `sender` and `sender_id` in place. These count toward `healed`.
 *      Everything else counts toward `skipped`.
 *
 * Heal exists because earlier importer versions stored group messages with
 * `sender_id=NULL` (BytesExtra protobuf parsing was missing/buggy). A plain
 * INSERT OR IGNORE on re-import would skip them forever; this lets a refresh
 * with a now-working parser repair stale rows. The heal predicate is scoped
 * deliberately tight — only NULL → non-null upgrades, never overwrites — so
 * already-resolved rows are never disturbed.
 *
 * Invariant: inserted + healed + skipped === messages.length.
 *
 * Rows with a NULL source_id or source_db fall through the partial index and
 * are always inserted; callers that care about idempotency must populate both.
 */
export function insertMessages(db, messages) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO messages (source_id, timestamp, sender, sender_id, room, room_id, type, text, filename, mime_type, media_path, media_size, source_db)
    VALUES (@source_id, @timestamp, @sender, @sender_id, @room, @room_id, @type, @text, @filename, @mime_type, @media_path, @media_size, @source_db)
  `);

  const heal = db.prepare(`
    UPDATE messages
       SET sender = @sender, sender_id = @sender_id
     WHERE source_id = @source_id
       AND source_db = @source_db
       AND sender_id IS NULL
  `);

  const tx = db.transaction((msgs) => {
    let inserted = 0;
    let skipped = 0;
    let healed = 0;
    for (const msg of msgs) {
      const result = insert.run(msg);
      if (result.changes > 0) {
        inserted++;
        continue;
      }
      // Conflict path. Try to heal NULL sender_id rows when we now have a real one.
      if (
        msg.sender_id != null &&
        msg.source_id != null &&
        msg.source_db != null
      ) {
        const healResult = heal.run(msg);
        if (healResult.changes > 0) {
          healed++;
          continue;
        }
      }
      skipped++;
    }
    return { inserted, skipped, healed };
  });

  return tx(messages);
}

/**
 * Get a message by its row ID.
 */
export function getMessageById(db, id) {
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

/**
 * Get DB stats for status command.
 */
export function getStats(db) {
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM messages GROUP BY type ORDER BY count DESC').all();
  const byRoom = db.prepare('SELECT room, COUNT(*) as count FROM messages WHERE room IS NOT NULL GROUP BY room ORDER BY count DESC LIMIT 20').all();
  const dateRange = db.prepare('SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM messages').get();
  const lastImport = db.prepare('SELECT * FROM imports ORDER BY id DESC LIMIT 1').get();
  const importCount = db.prepare('SELECT COUNT(*) as count FROM imports').get().count;

  return {
    totalMessages,
    byType,
    byRoom,
    dateRange,
    lastImport,
    importCount,
    dbPath: DB_PATH,
  };
}
