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
 * Insert a batch of messages efficiently using a transaction.
 * Skips duplicates based on source_id + source_db.
 */
export function insertMessages(db, messages) {
  const insert = db.prepare(`
    INSERT INTO messages (source_id, timestamp, sender, sender_id, room, room_id, type, text, filename, mime_type, media_path, media_size, source_db)
    VALUES (@source_id, @timestamp, @sender, @sender_id, @room, @room_id, @type, @text, @filename, @mime_type, @media_path, @media_size, @source_db)
  `);

  const checkDup = db.prepare(
    'SELECT 1 FROM messages WHERE source_id = ? AND source_db = ?'
  );

  const tx = db.transaction((msgs) => {
    let inserted = 0;
    let skipped = 0;
    for (const msg of msgs) {
      if (msg.source_id && msg.source_db) {
        const dup = checkDup.get(msg.source_id, msg.source_db);
        if (dup) { skipped++; continue; }
      }
      insert.run(msg);
      inserted++;
    }
    return { inserted, skipped };
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
