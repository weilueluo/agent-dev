/**
 * Minimal protobuf reader for WeChat 4.x message metadata.
 *
 * WeChat 4.x stores the group-message sender wxid inside MSG.BytesExtra as a
 * protobuf-encoded blob. The relevant shape (observed empirically):
 *
 *   message {
 *     repeated Inner field_1 = 1;       // varint metadata, ignored
 *     repeated Inner field_3 = 3;       // each is a length-delimited inner message
 *   }
 *   message Inner {
 *     int32  field_1 = 1;               // tag id, e.g. 1 for sender slot
 *     bytes  field_2 = 2;               // payload — wxid string for sender slot,
 *                                       //           XML/<msgsource> for source slot
 *   }
 *
 * Only wire types 0 (varint) and 2 (length-delimited) appear in the relevant
 * fields, but we tolerate types 1/5 by skipping their fixed-size payloads.
 *
 * This is intentionally tiny — no .proto schema, no third-party dependency.
 */

const WXID_RE = /^wxid_[a-zA-Z0-9_-]+$/;
// Looser alias check: WeChat allows custom aliases that may not start with wxid_.
// Stay conservative — only accept alphanumerics + underscore/dash, length >= 3,
// no whitespace or angle-brackets, and reject things that look like XML.
const ALIAS_RE = /^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/;

/**
 * Read a protobuf varint. Returns [value, nextOffset].
 * Throws if the buffer is truncated.
 */
export function readVarint(buf, offset) {
  let value = 0n;
  let shift = 0n;
  let pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return [value, pos];
    }
    shift += 7n;
    if (shift > 63n) {
      throw new Error('Varint too long');
    }
  }
  throw new Error('Truncated varint');
}

/**
 * Walk a protobuf message and return a Map<fieldNumber, Array<value>>.
 *   - wire type 0 (varint)        → BigInt
 *   - wire type 2 (length-delim)  → Buffer slice
 *   - wire type 1 (64-bit fixed)  → Buffer slice (8 bytes)
 *   - wire type 5 (32-bit fixed)  → Buffer slice (4 bytes)
 * Other wire types throw.
 */
export function parseProtobufFields(buf, start = 0, end = buf.length) {
  const fields = new Map();
  let pos = start;
  while (pos < end) {
    const [tag, afterTag] = readVarint(buf, pos);
    pos = afterTag;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 7n);
    let value;
    if (wireType === 0) {
      const [v, p] = readVarint(buf, pos);
      value = v;
      pos = p;
    } else if (wireType === 2) {
      const [len, lenEnd] = readVarint(buf, pos);
      pos = lenEnd;
      const lenN = Number(len);
      if (pos + lenN > end) throw new Error('Truncated length-delimited field');
      value = buf.slice(pos, pos + lenN);
      pos += lenN;
    } else if (wireType === 1) {
      if (pos + 8 > end) throw new Error('Truncated 64-bit field');
      value = buf.slice(pos, pos + 8);
      pos += 8;
    } else if (wireType === 5) {
      if (pos + 4 > end) throw new Error('Truncated 32-bit field');
      value = buf.slice(pos, pos + 4);
      pos += 4;
    } else {
      throw new Error(`Unsupported wire type ${wireType}`);
    }
    if (!fields.has(fieldNumber)) fields.set(fieldNumber, []);
    fields.get(fieldNumber).push(value);
  }
  return fields;
}

/**
 * Determine if a candidate string is plausibly a sender identifier (wxid/alias).
 * Strict by default — wxid_ prefix wins; otherwise require a clean alias shape.
 */
export function isSenderCandidate(s) {
  if (!s || typeof s !== 'string') return false;
  if (s.length > 64) return false;
  if (WXID_RE.test(s)) return true;
  if (ALIAS_RE.test(s)) return true;
  return false;
}

/**
 * Extract the sender wxid from a WeChat 4.x BytesExtra blob.
 * Returns the wxid string, or null if no sender field is present (e.g. system
 * messages, malformed buffer, or self-sent messages).
 *
 * Strategy:
 *   - Parse top-level fields.
 *   - Walk every field-3 entry (length-delimited inner message).
 *   - For each, parse inner fields and look at inner field 2.
 *   - Return the first inner field-2 string that matches a sender shape.
 *   - Prefer wxid_-prefixed candidates over generic aliases.
 */
export function extractSenderWxid(bytesExtra) {
  if (!bytesExtra || bytesExtra.length === 0) return null;
  const buf = Buffer.isBuffer(bytesExtra) ? bytesExtra : Buffer.from(bytesExtra);

  let top;
  try {
    top = parseProtobufFields(buf);
  } catch {
    return null;
  }

  const candidates = top.get(3);
  if (!candidates) return null;

  let aliasFallback = null;
  for (const inner of candidates) {
    if (!Buffer.isBuffer(inner)) continue;
    let innerFields;
    try {
      innerFields = parseProtobufFields(inner);
    } catch {
      continue;
    }
    const f2 = innerFields.get(2);
    if (!f2 || f2.length === 0) continue;
    const raw = f2[0];
    if (!Buffer.isBuffer(raw)) continue;
    const s = raw.toString('utf-8');
    if (!isSenderCandidate(s)) continue;
    if (WXID_RE.test(s)) return s;
    if (aliasFallback === null) aliasFallback = s;
  }
  return aliasFallback;
}
