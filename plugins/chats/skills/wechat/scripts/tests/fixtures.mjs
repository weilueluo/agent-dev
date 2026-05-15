/**
 * Shared protobuf fixtures for tests.
 *
 * These are crafted to exercise the protobuf parser without depending on real
 * WeChat data. The "real" sample is taken verbatim from a captured BytesExtra
 * for a group message in WeChat 4.x.
 */

import { Buffer } from 'node:buffer';

/** Encode a single varint for tag/length values. */
export function encodeVarint(n) {
  const out = [];
  let v = BigInt(n);
  while (v > 0x7fn) {
    out.push(Number((v & 0x7fn) | 0x80n));
    v >>= 7n;
  }
  out.push(Number(v));
  return Buffer.from(out);
}

/** Build a length-delimited (wire type 2) field with the given field number. */
export function fieldLengthDelim(fieldNumber, payload) {
  const tag = (fieldNumber << 3) | 2;
  const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  return Buffer.concat([encodeVarint(tag), encodeVarint(buf.length), buf]);
}

/** Build a varint (wire type 0) field with the given field number. */
export function fieldVarint(fieldNumber, value) {
  const tag = (fieldNumber << 3) | 0;
  return Buffer.concat([encodeVarint(tag), encodeVarint(value)]);
}

/**
 * Inner sender message: { field_1: varint=1, field_2: bytes=wxid }
 */
export function buildInnerSender(wxid) {
  return Buffer.concat([
    fieldVarint(1, 1),
    fieldLengthDelim(2, Buffer.from(wxid, 'utf-8')),
  ]);
}

/**
 * Real captured BytesExtra hex for a group text message — sender wxid_k9toj60b46kx21.
 * Includes the sender field-3, the <msgsource> XML field-3, and a trailing field-3
 * with a 32-byte hash. Captured verbatim from a WeChat 4.x MSG.db.
 */
export const REAL_BYTES_EXTRA_HEX = '0a04081010001a1708011213777869645f6b39746f6a36306234366b7832311af403080712ef033c6d7367736f757263653e0a202020203c6174757365726c6973743e777869645f69757a726473757a6a37613732312c777869645f636c6579616773743963623631313c2f6174757365726c6973743e0a202020203c62697a666c61673e303c2f62697a666c61673e0a202020203c7075613e313c2f7075613e0a202020203c616c6e6f64653e0a20202020202020203c696e6c656e6c6973743e31303c2f696e6c656e6c6973743e0a202020203c2f616c6e6f64653e0a202020203c656767496e636c756465643e313c2f656767496e636c756465643e0a202020203c73696c656e63653e303c2f73696c656e63653e0a202020203c6d656d626572636f756e743e373c2f6d656d626572636f756e743e0a202020203c7369676e61747572653e4e305f56315f4b51792b635875597c76315f54354d77763051413c2f7369676e61747572653e0a202020203c746d705f6e6f64653e0a20202020202020203c7075626c69736865722d6964202f3e0a202020203c2f746d705f6e6f64653e0a202020203c7365635f6d73675f6e6f64653e0a20202020202020203c616c6e6f64653e0a2020202020202020202020203c66723e313c2f66723e0a20202020202020203c2f616c6e6f64653e0a202020203c2f7365635f6d73675f6e6f64653e0a3c2f6d7367736f757263653e0a1a24080212206238393964613239376335646635653831393665643832396166386634383565';

export function realBytesExtra() {
  return Buffer.from(REAL_BYTES_EXTRA_HEX, 'hex');
}
