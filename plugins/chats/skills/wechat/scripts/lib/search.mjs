/**
 * Full-text search over the WeChat message index.
 */

import dayjs from 'dayjs';

/**
 * Search messages using FTS5 full-text search.
 *
 * @param {Database} db - opened index database
 * @param {string} query - free-text search query
 * @param {object} opts - { type, room, limit, offset }
 * @returns {object[]} matching messages
 */
export function searchMessages(db, query, opts = {}) {
  const { type, room, limit = 50, offset = 0 } = opts;

  // Build WHERE clauses
  const conditions = [];
  const params = {};

  if (query) {
    // Escape FTS5 special chars and wrap each term with *
    const ftsQuery = query
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map(term => `"${term}"*`)
      .join(' ');

    conditions.push('messages_fts MATCH @ftsQuery');
    params.ftsQuery = ftsQuery;
  }

  if (type) {
    conditions.push('m.type = @type');
    params.type = type;
  }

  if (room) {
    conditions.push('(m.room LIKE @room OR m.room_id LIKE @room)');
    params.room = `%${room}%`;
  }

  params.limit = limit;
  params.offset = offset;

  let sql;
  if (query) {
    sql = `
      SELECT m.*, rank
      FROM messages_fts
      JOIN messages m ON m.id = messages_fts.rowid
      ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY rank
      LIMIT @limit OFFSET @offset
    `;
  } else {
    // No query — just filter by type/room, order by timestamp desc
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    sql = `
      SELECT m.*
      FROM messages m
      ${where}
      ORDER BY m.timestamp DESC
      LIMIT @limit OFFSET @offset
    `;
  }

  return db.prepare(sql).all(params);
}

/**
 * Format search results for human-readable CLI output.
 */
export function formatResults(results) {
  if (results.length === 0) {
    return 'No results found.';
  }

  const lines = [`Found ${results.length} result(s):\n`];

  for (const msg of results) {
    const ts = msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM-DD HH:mm') : '?';
    const sender = msg.sender || msg.sender_id || '?';
    const room = msg.room ? ` [${msg.room}]` : '';
    const type = msg.type || '?';
    const preview = msg.text ? truncate(msg.text, 80) : (msg.filename || '');
    const media = msg.media_path ? ' 📎' : '';

    lines.push(`  #${msg.id}  ${ts}  ${sender}${room}  (${type})${media}`);
    if (preview) {
      lines.push(`        ${preview}`);
    }
  }

  lines.push(`\nUse "download --id <ID>" to get file details.`);
  return lines.join('\n');
}

/**
 * Format search results as JSON.
 */
export function formatResultsJson(results) {
  return results.map(msg => ({
    id: msg.id,
    timestamp: msg.timestamp,
    date: msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM-DD HH:mm:ss') : null,
    sender: msg.sender,
    room: msg.room,
    type: msg.type,
    text: msg.text,
    filename: msg.filename,
    has_media: !!msg.media_path,
  }));
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
