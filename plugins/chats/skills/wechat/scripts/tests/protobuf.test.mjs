import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import {
  readVarint,
  parseProtobufFields,
  isSenderCandidate,
  extractSenderWxid,
} from '../lib/protobuf.mjs';
import {
  encodeVarint,
  fieldLengthDelim,
  fieldVarint,
  buildInnerSender,
  realBytesExtra,
} from './fixtures.mjs';

test('readVarint round-trips small and large values', () => {
  for (const n of [0, 1, 127, 128, 300, 16384, 1234567890]) {
    const enc = encodeVarint(n);
    const [v, pos] = readVarint(enc, 0);
    assert.equal(Number(v), n);
    assert.equal(pos, enc.length);
  }
});

test('readVarint throws on truncated input', () => {
  assert.throws(() => readVarint(Buffer.from([0x80]), 0), /Truncated varint/);
});

test('parseProtobufFields decodes mixed wire types', () => {
  const buf = Buffer.concat([
    fieldVarint(1, 42),
    fieldLengthDelim(2, Buffer.from('hello')),
    fieldVarint(1, 7),
  ]);
  const fields = parseProtobufFields(buf);
  assert.deepEqual(fields.get(1).map(Number), [42, 7]);
  assert.equal(fields.get(2)[0].toString(), 'hello');
});

test('parseProtobufFields throws on unsupported wire type', () => {
  // Wire type 3 (start group) is not supported.
  const tag = (1 << 3) | 3;
  assert.throws(() => parseProtobufFields(Buffer.from([tag])), /wire type/);
});

test('isSenderCandidate accepts wxid_ and clean aliases, rejects junk', () => {
  assert.equal(isSenderCandidate('wxid_k9toj60b46kx21'), true);
  assert.equal(isSenderCandidate('alice_bob-2024'), true);
  assert.equal(isSenderCandidate('1starts-with-digit'), false);
  assert.equal(isSenderCandidate('has space'), false);
  assert.equal(isSenderCandidate('<msgsource>...'), false);
  assert.equal(isSenderCandidate(''), false);
  assert.equal(isSenderCandidate(null), false);
  assert.equal(isSenderCandidate('a'.repeat(100)), false);
});

test('extractSenderWxid pulls wxid from real captured BytesExtra', () => {
  const wxid = extractSenderWxid(realBytesExtra());
  assert.equal(wxid, 'wxid_k9toj60b46kx21');
});

test('extractSenderWxid prefers wxid_ over generic alias', () => {
  // Two field-3 entries: first contains a generic alias, second contains a wxid.
  const buf = Buffer.concat([
    fieldVarint(1, 0),
    fieldLengthDelim(3, buildInnerSender('alice_bob')),
    fieldLengthDelim(3, buildInnerSender('wxid_real_user_001')),
  ]);
  assert.equal(extractSenderWxid(buf), 'wxid_real_user_001');
});

test('extractSenderWxid falls back to alias when no wxid_ present', () => {
  const buf = Buffer.concat([
    fieldVarint(1, 0),
    fieldLengthDelim(3, buildInnerSender('alice_bob_22')),
  ]);
  assert.equal(extractSenderWxid(buf), 'alice_bob_22');
});

test('extractSenderWxid ignores XML-bearing field-3 entries', () => {
  // Field-3 with field-2 = an XML blob — must not be misclassified as a wxid.
  const xmlInner = Buffer.concat([
    fieldVarint(1, 7),
    fieldLengthDelim(2, Buffer.from('<msgsource>...</msgsource>')),
  ]);
  const buf = Buffer.concat([
    fieldVarint(1, 0),
    fieldLengthDelim(3, xmlInner),
  ]);
  assert.equal(extractSenderWxid(buf), null);
});

test('extractSenderWxid returns null on empty / malformed input', () => {
  assert.equal(extractSenderWxid(null), null);
  assert.equal(extractSenderWxid(Buffer.alloc(0)), null);
  // Random garbage: tag byte that decodes as unsupported wire type.
  assert.equal(extractSenderWxid(Buffer.from([0xff, 0xff, 0xff])), null);
});

test('extractSenderWxid skips system-message BytesExtra (no field-3 sender)', () => {
  // System message: only field-1 entries and a field-3 with XML, no wxid in inner field-2.
  const xmlInner = Buffer.concat([
    fieldVarint(1, 7),
    fieldLengthDelim(2, Buffer.from('<msgsource><silence>0</silence></msgsource>')),
  ]);
  const buf = Buffer.concat([
    fieldLengthDelim(1, Buffer.from([0x08, 0x10, 0x10, 0x00])),
    fieldLengthDelim(1, Buffer.from([0x08, 0x05, 0x10, 0x01])),
    fieldLengthDelim(3, xmlInner),
  ]);
  assert.equal(extractSenderWxid(buf), null);
});
