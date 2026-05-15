import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

import { createSchema, ensureUniqueSourceIndex, insertMessages } from '../lib/db.mjs';

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT, timestamp INTEGER, sender TEXT, sender_id TEXT,
      room TEXT, room_id TEXT, type TEXT, text TEXT, filename TEXT,
      mime_type TEXT, media_path TEXT, media_size INTEGER, source_db TEXT,
      imported_at TEXT DEFAULT (datetime('now'))
    );
  `);
  ensureUniqueSourceIndex(db);
  return db;
}

/** Production-shape DB built via createSchema — includes FTS triggers. */
function makeFullDb() {
  const db = new Database(':memory:');
  createSchema(db);
  return db;
}

function row(overrides = {}) {
  return {
    source_id: '1', timestamp: 0, sender: null, sender_id: null,
    room: null, room_id: null, type: 'text', text: null, filename: null,
    mime_type: null, media_path: null, media_size: null, source_db: 'MSG.db',
    ...overrides,
  };
}

test('insertMessages dedupes on (source_id, source_db) via INSERT OR IGNORE', () => {
  const db = makeDb();
  const r1 = insertMessages(db, [row({ source_id: '1' }), row({ source_id: '2' })]);
  assert.equal(r1.inserted, 2);
  assert.equal(r1.skipped, 0);
  assert.equal(r1.healed, 0);

  const r2 = insertMessages(db, [row({ source_id: '1' }), row({ source_id: '3' })]);
  assert.equal(r2.inserted, 1);
  assert.equal(r2.skipped, 1);
  assert.equal(r2.healed, 0);

  const total = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  assert.equal(total, 3);
});

test('insertMessages tolerates rows missing source_id (no dedupe applied)', () => {
  const db = makeDb();
  const r = insertMessages(db, [
    row({ source_id: null }),
    row({ source_id: null }),
  ]);
  assert.equal(r.inserted, 2);
  assert.equal(r.skipped, 0);
  assert.equal(r.healed, 0);
});

test('ensureUniqueSourceIndex dedupes pre-existing duplicates and creates the index', () => {
  // Build a DB without the unique index, insert duplicates, then call ensure.
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT, timestamp INTEGER, sender TEXT, sender_id TEXT,
      room TEXT, room_id TEXT, type TEXT, text TEXT, filename TEXT,
      mime_type TEXT, media_path TEXT, media_size INTEGER, source_db TEXT,
      imported_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const insert = db.prepare(
    'INSERT INTO messages (source_id, source_db) VALUES (?, ?)'
  );
  insert.run('1', 'MSG.db');
  insert.run('1', 'MSG.db');
  insert.run('2', 'MSG.db');

  const result = ensureUniqueSourceIndex(db);
  assert.equal(result.dedupedRows, 1);

  const total = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  assert.equal(total, 2);

  // Index now exists; further duplicates are rejected by INSERT OR IGNORE
  const second = insertMessages(db, [row({ source_id: '1' })]);
  assert.equal(second.inserted, 0);
  assert.equal(second.skipped, 1);
  assert.equal(second.healed, 0);
});

test('insertMessages heals NULL sender_id when re-imported with a real sender', () => {
  const db = makeDb();
  // First import — old buggy parser couldn't resolve sender.
  const r1 = insertMessages(db, [row({ source_id: 'A', source_db: 'MSG.db' })]);
  assert.equal(r1.inserted, 1);
  assert.equal(r1.healed, 0);

  // Second import — new parser supplies sender.
  const r2 = insertMessages(db, [
    row({
      source_id: 'A',
      source_db: 'MSG.db',
      sender: 'Alice',
      sender_id: 'wxid_alice',
    }),
  ]);
  assert.equal(r2.inserted, 0);
  assert.equal(r2.skipped, 0);
  assert.equal(r2.healed, 1);

  const stored = db.prepare('SELECT sender, sender_id FROM messages WHERE source_id = ?').get('A');
  assert.equal(stored.sender, 'Alice');
  assert.equal(stored.sender_id, 'wxid_alice');
});

test('insertMessages heal does not overwrite an existing non-null sender_id', () => {
  const db = makeDb();
  const r1 = insertMessages(db, [row({
    source_id: 'B', source_db: 'MSG.db',
    sender: 'Alice', sender_id: 'wxid_alice',
  })]);
  assert.equal(r1.inserted, 1);

  // Try to "heal" with a different sender — must be a no-op.
  const r2 = insertMessages(db, [row({
    source_id: 'B', source_db: 'MSG.db',
    sender: 'Mallory', sender_id: 'wxid_mallory',
  })]);
  assert.equal(r2.inserted, 0);
  assert.equal(r2.skipped, 1);
  assert.equal(r2.healed, 0);

  const stored = db.prepare('SELECT sender, sender_id FROM messages WHERE source_id = ?').get('B');
  assert.equal(stored.sender, 'Alice');
  assert.equal(stored.sender_id, 'wxid_alice');
});

test('insertMessages heal is skipped when incoming sender_id is also null', () => {
  const db = makeDb();
  const r1 = insertMessages(db, [row({ source_id: 'C', source_db: 'MSG.db' })]);
  assert.equal(r1.inserted, 1);

  const r2 = insertMessages(db, [row({ source_id: 'C', source_db: 'MSG.db' })]);
  assert.equal(r2.inserted, 0);
  assert.equal(r2.skipped, 1);
  assert.equal(r2.healed, 0);
});

test('insertMessages: inserted + healed + skipped equals attempted (accounting invariant)', () => {
  const db = makeDb();
  insertMessages(db, [
    row({ source_id: 'X', source_db: 'MSG.db' }),                                              // null sender — will be healed
    row({ source_id: 'Y', source_db: 'MSG.db', sender: 'Bob', sender_id: 'wxid_bob' }),        // already resolved — will be skipped
  ]);

  const batch = [
    row({ source_id: 'X', source_db: 'MSG.db', sender: 'Alice', sender_id: 'wxid_alice' }),    // heal
    row({ source_id: 'Y', source_db: 'MSG.db', sender: 'Mallory', sender_id: 'wxid_mallory' }), // skip (already resolved)
    row({ source_id: 'Z', source_db: 'MSG.db', sender: 'Carol', sender_id: 'wxid_carol' }),    // insert
    row({ source_id: 'Z', source_db: 'MSG.db' }),                                              // skip (incoming has no sender to heal with)
  ];
  const r = insertMessages(db, batch);
  assert.equal(r.inserted + r.healed + r.skipped, batch.length);
  assert.equal(r.inserted, 1);
  assert.equal(r.healed, 1);
  assert.equal(r.skipped, 2);
});

test('insertMessages heal updates FTS so search by healed sender finds the row', () => {
  // Use the production schema so FTS triggers fire on UPDATE.
  const db = makeFullDb();
  insertMessages(db, [row({
    source_id: 'D', source_db: 'MSG.db',
    text: 'hello world',
  })]);

  // Sanity: FTS row exists but sender column is null/empty — search by name finds nothing.
  const beforeHits = db.prepare(
    `SELECT m.source_id FROM messages_fts f JOIN messages m ON m.id = f.rowid WHERE messages_fts MATCH 'sender:Alice'`
  ).all();
  assert.equal(beforeHits.length, 0);

  // Heal the row with a real sender.
  const r = insertMessages(db, [row({
    source_id: 'D', source_db: 'MSG.db',
    sender: 'Alice', sender_id: 'wxid_alice',
    text: 'hello world',
  })]);
  assert.equal(r.healed, 1);

  // FTS update trigger should have re-indexed the row with the new sender.
  const afterHits = db.prepare(
    `SELECT m.source_id FROM messages_fts f JOIN messages m ON m.id = f.rowid WHERE messages_fts MATCH 'sender:Alice'`
  ).all();
  assert.deepEqual(afterHits.map(h => h.source_id), ['D']);
});

test('createSchema is idempotent and produces a query-ready DB', () => {
  const db = new Database(':memory:');
  createSchema(db);
  createSchema(db); // second call must not throw
  // Insert via the schema-aware path and verify FTS is wired up.
  const r = insertMessages(db, [row({
    source_id: 'E', source_db: 'MSG.db',
    sender: 'Eve', text: 'goodbye',
  })]);
  assert.equal(r.inserted, 1);
  const hits = db.prepare(
    `SELECT m.source_id FROM messages_fts f JOIN messages m ON m.id = f.rowid WHERE messages_fts MATCH 'goodbye'`
  ).all();
  assert.deepEqual(hits.map(h => h.source_id), ['E']);
});
