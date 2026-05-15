import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSchema, insertMessages } from '../lib/db.mjs';
import { exportMessages } from '../lib/exporter.mjs';

test('exportMessages writes structured files and transcript', () => {
  const db = new Database(':memory:');
  const tmpDir = mkdtempSync(join(tmpdir(), 'wechat-export-'));
  try {
    createSchema(db);
    insertMessages(db, [
      {
        source_id: '1',
        timestamp: 1700000000,
        sender: 'Alice',
        sender_id: 'wxid_alice',
        room: 'Project Room',
        room_id: 'room@chatroom',
        type: 'text',
        text: 'hello export',
        filename: null,
        mime_type: null,
        media_path: null,
        media_size: null,
        source_db: 'MSG0.db',
      },
    ]);

    const summary = exportMessages(db, null, {
      outDir: tmpDir,
      room: 'Project Room',
      includeMedia: false,
    });

    assert.equal(summary.messages, 1);
    assert.equal(existsSync(join(tmpDir, 'messages.json')), true);
    assert.equal(existsSync(join(tmpDir, 'messages.csv')), true);
    assert.equal(existsSync(join(tmpDir, 'transcript.md')), true);
    assert.match(readFileSync(join(tmpDir, 'transcript.md'), 'utf8'), /hello export/);
  } finally {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
