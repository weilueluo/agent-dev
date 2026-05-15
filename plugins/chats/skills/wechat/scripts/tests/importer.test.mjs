import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

import {
  resolveType,
  extractTextPreview,
  extractFilename,
  isGroupChat,
  resolveSender,
  importSingleDb,
} from '../lib/importer.mjs';
import { fieldVarint, fieldLengthDelim, buildInnerSender, realBytesExtra } from './fixtures.mjs';

test('resolveType maps base codes', () => {
  assert.equal(resolveType(1), 'text');
  assert.equal(resolveType(3), 'image');
  assert.equal(resolveType(43), 'video');
  assert.equal(resolveType(47), 'sticker');
  assert.equal(resolveType(10000), 'system');
});

test('resolveType resolves type=49 via SubType', () => {
  assert.equal(resolveType(49, 6), 'file');
  assert.equal(resolveType(49, 5), 'link');
  assert.equal(resolveType(49, 19), 'channel');
  assert.equal(resolveType(49, 57), 'reference');
  assert.equal(resolveType(49, 999), 'app'); // unknown subtype falls back to "app"
});

test('resolveType returns unknown-N for unmapped codes', () => {
  assert.equal(resolveType(123), 'unknown-123');
});

test('extractTextPreview returns text for type 1', () => {
  assert.equal(extractTextPreview('hello', 1), 'hello');
});

test('extractTextPreview truncates long text with ellipsis', () => {
  const long = 'x'.repeat(600);
  const preview = extractTextPreview(long, 1);
  assert.equal(preview.length, 501);
  assert.ok(preview.endsWith('…'));
});

test('extractTextPreview pulls <title> from XML payloads', () => {
  assert.equal(
    extractTextPreview('<appmsg><title><![CDATA[Greeting]]></title></appmsg>', 49),
    'Greeting',
  );
  assert.equal(
    extractTextPreview('<appmsg><title>Plain</title></appmsg>', 49),
    'Plain',
  );
});

test('extractTextPreview returns null for empty input', () => {
  assert.equal(extractTextPreview(null, 1), null);
  assert.equal(extractTextPreview('', 49), null);
});

test('extractFilename pulls title from CDATA and plain forms', () => {
  assert.equal(
    extractFilename('<appmsg><title><![CDATA[report.pdf]]></title></appmsg>'),
    'report.pdf',
  );
  assert.equal(
    extractFilename('<appmsg><title>doc.txt</title></appmsg>'),
    'doc.txt',
  );
  assert.equal(extractFilename(null), null);
  assert.equal(extractFilename(''), null);
});

test('isGroupChat detects @chatroom suffix', () => {
  assert.equal(isGroupChat('123456@chatroom'), true);
  assert.equal(isGroupChat('wxid_alice'), false);
  assert.equal(isGroupChat(null), false);
  assert.equal(isGroupChat(''), false);
});

test('resolveSender uses BytesExtra protobuf for 4.x group messages', () => {
  const row = {
    StrTalker: '123@chatroom',
    StrContent: 'hello world',
    BytesExtra: realBytesExtra(),
  };
  const { senderId, content } = resolveSender(row, true);
  assert.equal(senderId, 'wxid_k9toj60b46kx21');
  assert.equal(content, 'hello world'); // content untouched in 4.x path
});

test('resolveSender falls back to legacy wxid:\\n prefix for 3.x group messages', () => {
  const row = {
    StrTalker: '123@chatroom',
    StrContent: 'wxid_alice:\nthe body',
    BytesExtra: null,
  };
  const { senderId, content } = resolveSender(row, true);
  assert.equal(senderId, 'wxid_alice');
  assert.equal(content, 'the body');
});

test('resolveSender returns null sender when neither path matches', () => {
  const row = {
    StrTalker: '123@chatroom',
    StrContent: 'plain content',
    BytesExtra: null,
  };
  const { senderId, content } = resolveSender(row, true);
  assert.equal(senderId, null);
  assert.equal(content, 'plain content');
});

test('resolveSender uses StrTalker for 1-on-1 chats', () => {
  const row = {
    StrTalker: 'wxid_friend',
    StrContent: 'hi',
    BytesExtra: null,
  };
  const { senderId, content } = resolveSender(row, false);
  assert.equal(senderId, 'wxid_friend');
  assert.equal(content, 'hi');
});

test('importSingleDb extracts sender from 4.x BytesExtra end-to-end', () => {
  // Build a synthetic source MSG.db and dest index DB; run importSingleDb.
  const tmpDir = mkdtempSync(join(tmpdir(), 'wechat-test-'));
  try {
    const srcPath = join(tmpDir, 'MSG_TEST.db');
    const src = new Database(srcPath);
    src.exec(`
      CREATE TABLE MSG (
        localId INTEGER, MsgSvrID INTEGER, Type INTEGER, SubType INTEGER,
        IsSender INTEGER, CreateTime INTEGER, StrTalker TEXT, StrContent TEXT,
        BytesExtra BLOB
      );
    `);
    src.prepare(
      `INSERT INTO MSG (localId, MsgSvrID, Type, SubType, IsSender, CreateTime, StrTalker, StrContent, BytesExtra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 12345, 1, 0, 0, 1700000000, '999@chatroom', 'hello group', realBytesExtra());
    src.close();

    const idx = new Database(':memory:');
    idx.exec(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT, timestamp INTEGER, sender TEXT, sender_id TEXT,
        room TEXT, room_id TEXT, type TEXT, text TEXT, filename TEXT,
        mime_type TEXT, media_path TEXT, media_size INTEGER, source_db TEXT,
        imported_at TEXT DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX uniq_messages_source ON messages(source_id, source_db) WHERE source_id IS NOT NULL AND source_db IS NOT NULL;
    `);

    const contacts = new Map([
      ['wxid_k9toj60b46kx21', 'Alice'],
      ['999@chatroom', 'Trip Group'],
    ]);

    const result = importSingleDb(idx, srcPath, contacts, tmpDir);
    assert.equal(result.inserted, 1);

    const row = idx.prepare('SELECT * FROM messages').get();
    assert.equal(row.sender, 'Alice');
    assert.equal(row.sender_id, 'wxid_k9toj60b46kx21');
    assert.equal(row.room, 'Trip Group');
    assert.equal(row.room_id, '999@chatroom');
    assert.equal(row.text, 'hello group');
    assert.equal(row.type, 'text');
    idx.close();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('importSingleDb heals stale NULL sender_id when re-imported with a working parser', () => {
  // Simulates the real-world bug: a previous import (with a missing/buggy
  // BytesExtra parser) recorded the row with sender_id=NULL. The source DB
  // still has the same row with valid BytesExtra, so a re-import with the
  // current parser must repair it in place — INSERT OR IGNORE alone wouldn't.
  const tmpDir = mkdtempSync(join(tmpdir(), 'wechat-heal-'));
  try {
    const srcPath = join(tmpDir, 'MSG_HEAL.db');
    const src = new Database(srcPath);
    src.exec(`
      CREATE TABLE MSG (
        localId INTEGER, MsgSvrID INTEGER, Type INTEGER, SubType INTEGER,
        IsSender INTEGER, CreateTime INTEGER, StrTalker TEXT, StrContent TEXT,
        BytesExtra BLOB
      );
    `);
    // The source row carries valid BytesExtra all along.
    src.prepare(
      `INSERT INTO MSG (localId, MsgSvrID, Type, SubType, IsSender, CreateTime, StrTalker, StrContent, BytesExtra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 7777, 1, 0, 0, 1700000000, '999@chatroom', 'late but real', realBytesExtra());
    src.close();

    const idx = new Database(':memory:');
    idx.exec(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT, timestamp INTEGER, sender TEXT, sender_id TEXT,
        room TEXT, room_id TEXT, type TEXT, text TEXT, filename TEXT,
        mime_type TEXT, media_path TEXT, media_size INTEGER, source_db TEXT,
        imported_at TEXT DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX uniq_messages_source ON messages(source_id, source_db) WHERE source_id IS NOT NULL AND source_db IS NOT NULL;
    `);

    // Pre-seed a stale row mirroring an older importer run that failed to
    // resolve sender. Same source_id + source_db as what the importer will see.
    idx.prepare(
      `INSERT INTO messages (source_id, source_db, timestamp, type, text, room, room_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('7777', 'MSG_HEAL.db', 1700000000, 'text', 'late but real', 'Trip Group', '999@chatroom');

    const contacts = new Map([
      ['wxid_k9toj60b46kx21', 'Alice'],
      ['999@chatroom', 'Trip Group'],
    ]);

    const result = importSingleDb(idx, srcPath, contacts, tmpDir);
    assert.equal(result.inserted, 0, 'no new rows: source_id collides with the stale row');
    assert.equal(result.healed, 1, 'stale row gets healed in place');
    assert.equal(result.skipped, 0);

    // Same row, now with sender resolved.
    const rows = idx.prepare('SELECT source_id, sender, sender_id FROM messages').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sender, 'Alice');
    assert.equal(rows[0].sender_id, 'wxid_k9toj60b46kx21');
    idx.close();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
