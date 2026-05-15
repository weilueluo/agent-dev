/**
 * Media/file lookup and export helpers.
 */

import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { basename, extname, isAbsolute, join, normalize, relative } from 'path';
import dayjs from 'dayjs';
import { getMessageById } from './db.mjs';
import { parseProtobufFields } from './protobuf.mjs';

const RELATIVE_MEDIA_RE = /(?:FileStorage|MsgAttach)[\\/][^\u0000-\u001f<>:"|?*\uFFFD]+/g;
const INVALID_FILENAME_RE = /[<>:"/\\|?*\u0000-\u001f]/g;
const TYPE_CODES = {
  text: [1],
  image: [3],
  voice: [34],
  'contact-card': [42],
  video: [43],
  sticker: [47],
  location: [48],
  app: [49],
  file: [49],
  link: [49],
  channel: [49],
  'mini-program': [49],
  reference: [49],
};

/**
 * Look up a message by row ID and return detailed info including media path.
 *
 * @param {Database} db - opened index database
 * @param {number} id - message row ID from search results
 * @returns {object} structured result
 */
export function lookupMedia(db, id) {
  const msg = getMessageById(db, id);
  if (!msg) {
    return { error: `No message found with id ${id}` };
  }

  const fileExists = msg.media_path ? existsSync(msg.media_path) : false;
  let fileSize = msg.media_size;

  if (fileExists && !fileSize) {
    try { fileSize = statSync(msg.media_path).size; } catch { /* ignore */ }
  }

  return {
    id: msg.id,
    timestamp: msg.timestamp,
    date: msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM-DD HH:mm:ss') : null,
    sender: msg.sender,
    sender_id: msg.sender_id,
    room: msg.room,
    room_id: msg.room_id,
    type: msg.type,
    text: msg.text,
    filename: msg.filename,
    mime_type: msg.mime_type,
    media_path: msg.media_path,
    file_exists: fileExists,
    file_size: fileSize,
    source_db: msg.source_db,
    imported_at: msg.imported_at,
  };
}

/**
 * Extract relative media/cache paths embedded in WeChat 4.x BytesExtra blobs.
 *
 * BytesExtra is protobuf-like, and media messages usually carry relative paths
 * such as `FileStorage\MsgAttach\...\Image\YYYY-MM\foo.dat`. We parse nested
 * length-delimited fields first, then fall back to scanning printable text so
 * malformed or future shapes still yield useful candidates.
 */
export function extractRelativeMediaPaths(bytesExtra) {
  if (!bytesExtra || bytesExtra.length === 0) return [];
  const buf = Buffer.isBuffer(bytesExtra) ? bytesExtra : Buffer.from(bytesExtra);
  const paths = new Set();

  const addFromText = (text) => {
    if (!text) return;
    for (const match of String(text).matchAll(RELATIVE_MEDIA_RE)) {
      const cleaned = cleanRelativeMediaPath(match[0]);
      if (cleaned) paths.add(cleaned);
    }
  };

  const walk = (candidate, depth = 0) => {
    if (!candidate || depth > 5) return;
    const b = Buffer.isBuffer(candidate) ? candidate : Buffer.from(candidate);
    addFromText(b.toString('utf8'));

    let fields;
    try {
      fields = parseProtobufFields(b);
    } catch {
      return;
    }

    for (const values of fields.values()) {
      for (const value of values) {
        if (Buffer.isBuffer(value)) walk(value, depth + 1);
      }
    }
  };

  walk(buf);
  return [...paths];
}

/**
 * Find existing cached media files for an indexed message. This can use the
 * indexed `media_path`, and when a decrypted source DB is available it also
 * re-reads MSG.BytesExtra to recover WeChat 4.x cache paths that older imports
 * did not store in the index.
 */
export function findAssociatedMediaFiles(msg, options = {}) {
  const { mediaDir, sourceDbDir } = options;
  const candidates = new Map();

  const addCandidate = (absolutePath, source, relativePath = null) => {
    if (!absolutePath) return;
    const key = normalize(absolutePath).toLowerCase();
    if (candidates.has(key)) return;
    const fileExists = existsSync(absolutePath);
    candidates.set(key, {
      absolutePath,
      relativePath,
      filename: basename(absolutePath),
      source,
      exists: fileExists,
      size: fileExists ? safeFileSize(absolutePath) : null,
    });
  };

  if (msg.media_path) {
    addCandidate(msg.media_path, 'indexed-media-path', mediaDir ? safeRelative(mediaDir, msg.media_path) : null);
  }

  const sourceRows = options.rawRows || (options.rawRow ? [options.rawRow] : findSourceRows(msg, sourceDbDir));
  for (const row of sourceRows) {
    for (const relativePath of extractRelativeMediaPaths(row.BytesExtra)) {
      const absolutePath = resolveMediaPath(mediaDir, relativePath);
      if (!absolutePath) continue;
      addCandidate(absolutePath, 'source-bytes-extra', relativePath);

      for (const sibling of videoSiblingCandidates(relativePath)) {
        const siblingPath = resolveMediaPath(mediaDir, sibling);
        if (siblingPath) addCandidate(siblingPath, 'source-bytes-extra-sibling', sibling);
      }
    }
  }

  for (const fallback of fallbackMediaCandidates(msg, mediaDir)) {
    addCandidate(fallback.absolutePath, fallback.source, fallback.relativePath);
  }

  return [...candidates.values()];
}

/**
 * Copy every existing media candidate for a message into `outputDir`.
 */
export function copyAssociatedMedia(msg, options = {}) {
  const { outputDir, exportRoot = outputDir } = options;
  if (!outputDir) throw new Error('copyAssociatedMedia requires outputDir');

  mkdirSync(outputDir, { recursive: true });

  const copied = [];
  const missing = [];
  const candidates = options.candidates || findAssociatedMediaFiles(msg, options);

  let mediaIndex = 0;
  for (const candidate of candidates) {
    const manifestBase = mediaManifestBase(msg, candidate, mediaIndex);
    if (!candidate.exists) {
      missing.push({ ...manifestBase, reason: 'file-not-found' });
      mediaIndex++;
      continue;
    }

    const destination = uniqueDestination(
      outputDir,
      mediaExportFilename(msg, candidate, mediaIndex),
    );
    copyFileSync(candidate.absolutePath, destination);
    copied.push({
      ...manifestBase,
      exported_path: relative(exportRoot, destination),
      file_size: candidate.size ?? safeFileSize(destination),
    });
    mediaIndex++;
  }

  return { copied, missing, candidates: candidates.length };
}

/**
 * Format media lookup result for human-readable CLI output.
 */
export function formatLookup(result) {
  if (result.error) {
    return `Error: ${result.error}`;
  }

  const lines = [
    `Message #${result.id}`,
    `  Date:      ${result.date || '?'}`,
    `  Sender:    ${result.sender || result.sender_id || '?'}`,
  ];

  if (result.room) lines.push(`  Room:      ${result.room}`);
  lines.push(`  Type:      ${result.type}`);
  if (result.text) lines.push(`  Text:      ${result.text}`);
  if (result.filename) lines.push(`  Filename:  ${result.filename}`);
  if (result.mime_type) lines.push(`  MIME:      ${result.mime_type}`);

  if (result.media_path) {
    lines.push(`  Path:      ${result.media_path}`);
    lines.push(`  Exists:    ${result.file_exists ? 'yes' : 'NO — file missing'}`);
    if (result.file_size) lines.push(`  Size:      ${formatSize(result.file_size)}`);
  } else {
    lines.push(`  Path:      (no media file)`);
  }

  return lines.join('\n');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function cleanRelativeMediaPath(rawPath) {
  if (!rawPath) return null;
  const start = String(rawPath).search(/(?:FileStorage|MsgAttach)[\\/]/);
  if (start < 0) return null;
  let value = String(rawPath)
    .slice(start)
    .split('\uFFFD')[0]
    .replace(/[\u0000-\u001f].*$/u, '')
    .trim()
    .replace(/[)\].,;，。；]+$/u, '');
  const parts = value.split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((part) => part === '..' || isAbsolute(part))) return null;
  return parts.join('\\');
}

function resolveMediaPath(mediaDir, relativePath) {
  if (!mediaDir || !relativePath) return null;
  const cleaned = cleanRelativeMediaPath(relativePath);
  if (!cleaned) return null;
  const full = normalize(join(mediaDir, ...cleaned.split('\\')));
  const rel = relative(normalize(mediaDir), full);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return full;
}

function safeRelative(root, filePath) {
  const rel = relative(normalize(root), normalize(filePath));
  return rel.startsWith('..') || isAbsolute(rel) ? null : rel;
}

function safeFileSize(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

function findSourceRows(msg, sourceDbDir) {
  if (!sourceDbDir || !msg?.source_db) return [];
  const dbPath = join(sourceDbDir, msg.source_db);
  if (!existsSync(dbPath)) return [];

  const sourceId = msg.source_id == null ? null : String(msg.source_id);
  const talker = msg.room_id || (msg.room ? null : msg.sender_id);
  const typeCodes = TYPE_CODES[msg.type] || [];
  const params = {
    sourceId,
    timestamp: msg.timestamp,
    talker,
  };

  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const whereTalker = talker ? ' AND StrTalker = @talker' : '';
    const exact = sourceId
      ? db.prepare(`
          SELECT localId, MsgSvrID, Type, SubType, CreateTime, StrTalker, StrContent, BytesExtra
          FROM MSG
          WHERE (CAST(MsgSvrID AS TEXT) = @sourceId OR CAST(localId AS TEXT) = @sourceId)
          ${whereTalker}
          ORDER BY CreateTime
          LIMIT 10
        `).all(params)
      : [];
    if (exact.length > 0) return exact;

    const typeFilter = typeCodes.length > 0
      ? ` AND Type IN (${typeCodes.map((_, i) => `@type${i}`).join(', ')})`
      : '';
    for (let i = 0; i < typeCodes.length; i++) params[`type${i}`] = typeCodes[i];
    return db.prepare(`
      SELECT localId, MsgSvrID, Type, SubType, CreateTime, StrTalker, StrContent, BytesExtra
      FROM MSG
      WHERE CreateTime = @timestamp
      ${whereTalker}
      ${typeFilter}
      ORDER BY localId
      LIMIT 10
    `).all(params);
  } catch {
    return [];
  } finally {
    if (db) db.close();
  }
}

function fallbackMediaCandidates(msg, mediaDir) {
  if (!mediaDir) return [];
  const candidates = [];
  if (msg.type === 'file' && msg.filename) {
    const ym = msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM') : null;
    if (ym) {
      const relativePath = ['FileStorage', 'File', ym, msg.filename].join('\\');
      const absolutePath = resolveMediaPath(mediaDir, relativePath);
      if (absolutePath) candidates.push({ absolutePath, relativePath, source: 'filename-date-fallback' });
    }
  }
  return candidates;
}

function videoSiblingCandidates(relativePath) {
  if (!/FileStorage\\Video\\/i.test(relativePath)) return [];
  const ext = extname(relativePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.dat'].includes(ext)) return [];
  const base = relativePath.slice(0, -ext.length);
  return ['.mp4', '.mov'].map((videoExt) => `${base}${videoExt}`);
}

function mediaManifestBase(msg, candidate, mediaIndex) {
  return {
    message_id: msg.id,
    date: msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM-DD HH:mm:ss') : null,
    type: msg.type,
    media_index: mediaIndex,
    source: candidate.source,
    original_name: candidate.filename,
    relative_source_path: candidate.relativePath,
  };
}

function mediaExportFilename(msg, candidate, mediaIndex) {
  const date = msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYYMMDD-HHmmss') : 'unknown-date';
  const id = sanitizeFilename(String(msg.id ?? msg.source_id ?? 'message'));
  const original = sanitizeFilename(candidate.filename || `media${mediaIndex}`);
  return `${date}_msg-${id}_${String(mediaIndex + 1).padStart(2, '0')}_${original}`;
}

function sanitizeFilename(value) {
  const cleaned = String(value || '')
    .replace(INVALID_FILENAME_RE, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'media').slice(0, 160);
}

function uniqueDestination(dir, filename) {
  const ext = extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;
  let destination = join(dir, filename);
  let i = 2;
  while (existsSync(destination)) {
    destination = join(dir, `${stem}-${i}${ext}`);
    i++;
  }
  return destination;
}
