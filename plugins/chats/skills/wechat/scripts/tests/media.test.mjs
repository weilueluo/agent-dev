import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { copyAssociatedMedia, extractRelativeMediaPaths } from '../lib/media.mjs';
import { fieldLengthDelim, fieldVarint } from './fixtures.mjs';

function buildBytesExtraWithPath(relativePath) {
  const inner = Buffer.concat([
    fieldVarint(1, 3),
    fieldLengthDelim(2, Buffer.from(relativePath, 'utf8')),
  ]);
  return fieldLengthDelim(3, inner);
}

function createSourceDb(dbPath, bytesExtra) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE MSG (
      localId INTEGER, MsgSvrID INTEGER, Type INTEGER, SubType INTEGER,
      IsSender INTEGER, CreateTime INTEGER, StrTalker TEXT, StrContent TEXT,
      BytesExtra BLOB
    );
  `);
  db.prepare(
    `INSERT INTO MSG (localId, MsgSvrID, Type, SubType, IsSender, CreateTime, StrTalker, StrContent, BytesExtra)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(1, 12345, 3, 0, 0, 1700000000, 'room@chatroom', '', bytesExtra);
  db.close();
}

test('extractRelativeMediaPaths reads nested BytesExtra media paths', () => {
  const relativePath = 'FileStorage\\MsgAttach\\abc\\Image\\2026-05\\photo.dat';
  const paths = extractRelativeMediaPaths(buildBytesExtraWithPath(relativePath));
  assert.deepEqual(paths, [relativePath]);
});

test('copyAssociatedMedia recovers and copies media paths from source BytesExtra', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'wechat-media-'));
  try {
    const relativePath = 'FileStorage\\MsgAttach\\abc\\Image\\2026-05\\photo.dat';
    const mediaRoot = join(tmpDir, 'wechat-root');
    const sourceDbDir = join(tmpDir, 'decrypted');
    const outDir = join(tmpDir, 'export', 'media');
    const sourceFile = join(mediaRoot, ...relativePath.split('\\'));
    mkdirSync(dirname(sourceFile), { recursive: true });
    mkdirSync(sourceDbDir, { recursive: true });
    writeFileSync(sourceFile, 'cached image bytes');

    createSourceDb(join(sourceDbDir, 'MSG0.db'), buildBytesExtraWithPath(relativePath));

    const result = copyAssociatedMedia(
      {
        id: 77,
        source_id: '12345',
        source_db: 'MSG0.db',
        timestamp: 1700000000,
        room_id: 'room@chatroom',
        type: 'image',
        media_path: null,
      },
      {
        outputDir: outDir,
        exportRoot: join(tmpDir, 'export'),
        mediaDir: mediaRoot,
        sourceDbDir,
      },
    );

    assert.equal(result.copied.length, 1);
    assert.equal(result.missing.length, 0);
    assert.equal(result.copied[0].relative_source_path, relativePath);
    assert.match(result.copied[0].exported_path, /^media[\\/]/);
    const exported = join(tmpDir, 'export', result.copied[0].exported_path);
    assert.equal(existsSync(exported), true);
    assert.equal(readFileSync(exported, 'utf8'), 'cached image bytes');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
