/**
 * Conversation export helpers.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import dayjs from 'dayjs';
import { searchMessages } from './search.mjs';
import { copyAssociatedMedia, findAssociatedMediaFiles } from './media.mjs';

const CSV_HEADERS = [
  'id',
  'date',
  'timestamp',
  'sender',
  'sender_id',
  'room',
  'room_id',
  'type',
  'text',
  'filename',
  'has_media',
  'media_count',
];

/**
 * Export messages plus optional cached media files to a destination folder.
 */
export function exportMessages(db, query, options = {}) {
  const {
    outDir,
    room,
    type,
    limit = 1000,
    offset = 0,
    includeMedia = true,
    mediaDir = null,
    sourceDbDir = null,
  } = options;

  if (!outDir) throw new Error('exportMessages requires outDir');
  mkdirSync(outDir, { recursive: true });

  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : 1_000_000_000;
  const results = searchMessages(db, query, {
    room,
    type,
    limit: effectiveLimit,
    offset,
  }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || (a.id || 0) - (b.id || 0));

  const mediaDirOut = join(outDir, 'media');
  const mediaManifest = [];
  const missingMedia = [];
  const messages = results.map((msg) => {
    const candidates = includeMedia
      ? findAssociatedMediaFiles(msg, { mediaDir, sourceDbDir })
      : [];
    let copied = [];
    let missing = [];
    if (includeMedia && candidates.length > 0) {
      const copyResult = copyAssociatedMedia(msg, {
        outputDir: mediaDirOut,
        exportRoot: outDir,
        mediaDir,
        sourceDbDir,
        candidates,
      });
      copied = copyResult.copied;
      missing = copyResult.missing;
      mediaManifest.push(...copied);
      missingMedia.push(...missing);
    }

    return formatMessage(msg, copied.length + missing.length);
  });

  writeFileSync(join(outDir, 'messages.json'), JSON.stringify(messages, null, 2) + '\n', 'utf8');
  writeFileSync(join(outDir, 'messages.csv'), toCsv(messages, CSV_HEADERS), 'utf8');
  writeFileSync(join(outDir, 'transcript.md'), formatTranscript(messages), 'utf8');
  writeFileSync(join(outDir, 'media-manifest.json'), JSON.stringify(mediaManifest, null, 2) + '\n', 'utf8');
  writeFileSync(join(outDir, 'missing-media.json'), JSON.stringify(missingMedia, null, 2) + '\n', 'utf8');

  const summary = {
    generated_at: new Date().toISOString(),
    query: query || null,
    filters: { room: room || null, type: type || null, limit: effectiveLimit, offset },
    output_dir: outDir,
    messages: messages.length,
    media: {
      copied: mediaManifest.length,
      missing: missingMedia.length,
      enabled: includeMedia,
      media_dir_available: !!mediaDir,
      source_db_dir_available: !!sourceDbDir,
    },
    files: {
      messages_json: 'messages.json',
      messages_csv: 'messages.csv',
      transcript: 'transcript.md',
      media_manifest: 'media-manifest.json',
      missing_media: 'missing-media.json',
      media_dir: 'media/',
    },
  };
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');

  return summary;
}

export function formatExportSummary(result) {
  const lines = [
    `Exported ${result.messages} message(s) to ${result.output_dir}`,
    `  JSON:       ${result.files.messages_json}`,
    `  CSV:        ${result.files.messages_csv}`,
    `  Transcript: ${result.files.transcript}`,
  ];
  if (result.media.enabled) {
    lines.push(`  Media:      ${result.media.copied} copied, ${result.media.missing} missing`);
    lines.push(`  Manifest:   ${result.files.media_manifest}`);
  } else {
    lines.push('  Media:      disabled');
  }
  return lines.join('\n');
}

function formatMessage(msg, mediaCount) {
  return {
    id: msg.id,
    date: msg.timestamp ? dayjs.unix(msg.timestamp).format('YYYY-MM-DD HH:mm:ss') : null,
    timestamp: msg.timestamp,
    sender: msg.sender,
    sender_id: msg.sender_id,
    room: msg.room,
    room_id: msg.room_id,
    type: msg.type,
    text: msg.text,
    filename: msg.filename,
    has_media: mediaCount > 0 || !!msg.media_path,
    media_count: mediaCount,
  };
}

function formatTranscript(messages) {
  const lines = [
    '# WeChat export transcript',
    '',
    ...messages.map((msg) => {
      const sender = msg.sender || msg.sender_id || '?';
      const room = msg.room ? ` [${msg.room}]` : '';
      const body = oneLine(msg.text || msg.filename || `[${msg.type}]`);
      return `- ${msg.date || '?'} | #${msg.id} | ${sender}${room} | ${msg.type} | ${body}`;
    }),
    '',
  ];
  return lines.join('\n');
}

function oneLine(value) {
  return String(value || '').replace(/\s*\r?\n\s*/g, ' / ').trim();
}

function toCsv(rows, headers) {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n';
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
