/**
 * Media/file lookup by message row ID.
 */

import { existsSync, statSync } from 'fs';
import dayjs from 'dayjs';
import { getMessageById } from './db.mjs';

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
