/**
 * WeChat desktop DB importer.
 *
 * Reads MSG*.db files from the WeChat desktop data directory and imports
 * messages into our local index. Also resolves contact names from MicroMsg.db.
 *
 * WeChat desktop (Windows) stores data at:
 *   %USERPROFILE%\Documents\WeChat Files\<wxid>\Msg\Multi\MSG0.db, MSG1.db, ...
 *   %USERPROFILE%\Documents\WeChat Files\<wxid>\Msg\MicroMsg.db  (contacts)
 *
 * MSG table schema (key fields):
 *   localId, TalkerId, MsgSvrID, Type, SubType, IsSender, CreateTime,
 *   StrTalker, StrContent, CompressContent, BytesExtra, ...
 *
 * WeChat message Type codes:
 *   1    = Text
 *   3    = Image
 *   34   = Voice
 *   42   = Business card
 *   43   = Video
 *   47   = Animated sticker
 *   48   = Location
 *   49   = App message (file share, link, mini-program, etc.)
 *   10000 = System message
 *   10002 = System message (revoke, etc.)
 */

import Database from 'better-sqlite3';
import { readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { insertMessages } from './db.mjs';

// WeChat message type code → our type string
const TYPE_MAP = {
  1: 'text',
  3: 'image',
  34: 'voice',
  42: 'contact-card',
  43: 'video',
  47: 'sticker',
  48: 'location',
  49: 'app',       // file, link, mini-program — resolved via SubType
  10000: 'system',
  10002: 'system',
};

// SubType for Type=49 (app messages)
const APP_SUBTYPE_MAP = {
  6: 'file',
  5: 'link',
  8: 'sticker',
  19: 'channel',
  33: 'mini-program',
  36: 'mini-program',
  57: 'reference',   // reply/quote
};

/**
 * Auto-detect WeChat data directories on Windows.
 * Returns an array of paths like C:\Users\X\Documents\WeChat Files\wxid_xxx
 */
export function autoDetectPaths() {
  const candidates = [];

  // Possible document directories (standard, OneDrive, custom)
  const docsDirs = [
    join(homedir(), 'Documents', 'WeChat Files'),
    join(homedir(), 'OneDrive', '文档', 'WeChat Files'),
    join(homedir(), 'OneDrive', 'Documents', 'WeChat Files'),
  ];

  for (const docsDir of docsDirs) {
    if (!existsSync(docsDir)) continue;
    try {
      const entries = readdirSync(docsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && (entry.name.startsWith('wxid_') || entry.name.startsWith('wxi'))) {
          const msgDir = join(docsDir, entry.name, 'Msg', 'Multi');
          if (existsSync(msgDir)) {
            candidates.push(join(docsDir, entry.name));
          }
        }
      }
    } catch { /* ignore permission errors */ }
  }

  // Also check if WeChat stores in a custom location via registry (skip for now)
  return candidates;
}

/**
 * Load contact name mapping from MicroMsg.db.
 * Returns a Map<wxid, displayName>.
 */
function loadContacts(microMsgPath) {
  const contacts = new Map();

  if (!existsSync(microMsgPath)) {
    return contacts;
  }

  try {
    const cdb = new Database(microMsgPath, { readonly: true, fileMustExist: true });

    // Contact table has UserName (wxid) and NickName / Remark
    const hasContactTable = cdb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='Contact'"
    ).get();

    if (hasContactTable) {
      const rows = cdb.prepare(
        'SELECT UserName, NickName, Remark, Alias FROM Contact'
      ).all();

      for (const row of rows) {
        const name = row.Remark || row.NickName || row.Alias || row.UserName;
        contacts.set(row.UserName, name);
      }
    }

    cdb.close();
  } catch (err) {
    console.error(`Warning: could not read contacts from ${microMsgPath}: ${err.message}`);
  }

  return contacts;
}

/**
 * Find all MSG*.db files in a directory.
 * Supports both nested (wechatDir/Msg/Multi/) and flat (decrypted dir) layouts.
 */
function findMsgDbs(dir) {
  // Try nested layout first
  const multiDir = join(dir, 'Msg', 'Multi');
  const searchDir = existsSync(multiDir) ? multiDir : dir;

  if (!existsSync(searchDir)) return [];

  return readdirSync(searchDir)
    .filter(f => /^MSG\d*\.db$/i.test(f))
    .map(f => join(searchDir, f))
    .sort();
}

/**
 * Resolve the type string from WeChat's Type and SubType codes.
 */
function resolveType(type, subType) {
  if (type === 49 && APP_SUBTYPE_MAP[subType]) {
    return APP_SUBTYPE_MAP[subType];
  }
  return TYPE_MAP[type] || `unknown-${type}`;
}

/**
 * Try to extract a text preview from the message content.
 * For text messages this is the content itself.
 * For XML-based messages, extract a title or description.
 */
function extractTextPreview(content, type) {
  if (!content) return null;

  // Plain text
  if (type === 1) {
    return content.length > 500 ? content.slice(0, 500) + '…' : content;
  }

  // XML content — extract <title> or <des> or <appmsg><title>
  const titleMatch = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
  if (titleMatch) return titleMatch[1];

  const titleMatch2 = content.match(/<title>(.*?)<\/title>/);
  if (titleMatch2) return titleMatch2[1];

  const desMatch = content.match(/<des><!\[CDATA\[(.*?)\]\]><\/des>/);
  if (desMatch) return desMatch[1];

  return null;
}

/**
 * Try to extract a filename from XML content (for file/app messages).
 */
function extractFilename(content) {
  if (!content) return null;

  const match = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
  if (match) return match[1];

  const match2 = content.match(/<title>(.*?)<\/title>/);
  if (match2) return match2[1];

  return null;
}

/**
 * Try to locate the media file on disk for a given message.
 * WeChat stores media in predictable subdirectories.
 */
function findMediaPath(wechatDir, msg, resolvedType) {
  if (resolvedType === 'text' || resolvedType === 'system' || resolvedType === 'location') {
    return null;
  }

  // Images: FileStorage/Image/YYYY-MM/
  if (resolvedType === 'image') {
    const date = new Date(msg.CreateTime * 1000);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const imgDir = join(wechatDir, 'FileStorage', 'Image', ym);
    if (existsSync(imgDir)) {
      // Try to find by MsgSvrID in filename
      try {
        const files = readdirSync(imgDir);
        const match = files.find(f => f.includes(String(msg.MsgSvrID)));
        if (match) return join(imgDir, match);
      } catch { /* ignore */ }
    }
  }

  // Files: FileStorage/File/YYYY-MM/
  if (resolvedType === 'file') {
    const date = new Date(msg.CreateTime * 1000);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const fileDir = join(wechatDir, 'FileStorage', 'File', ym);
    if (existsSync(fileDir)) {
      try {
        const fname = extractFilename(msg.StrContent);
        if (fname) {
          const files = readdirSync(fileDir);
          const match = files.find(f => f === fname || f.includes(fname));
          if (match) return join(fileDir, match);
        }
      } catch { /* ignore */ }
    }
  }

  // Video: FileStorage/Video/YYYY-MM/
  if (resolvedType === 'video') {
    const date = new Date(msg.CreateTime * 1000);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const vidDir = join(wechatDir, 'FileStorage', 'Video', ym);
    if (existsSync(vidDir)) {
      try {
        const files = readdirSync(vidDir);
        const match = files.find(f => f.includes(String(msg.MsgSvrID)));
        if (match) return join(vidDir, match);
      } catch { /* ignore */ }
    }
  }

  return null;
}

/**
 * Get file size if file exists.
 */
function getFileSize(filePath) {
  if (!filePath) return null;
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

/**
 * Determine if a StrTalker is a group chat.
 */
function isGroupChat(talker) {
  return talker && talker.endsWith('@chatroom');
}

/**
 * Import messages from a single MSG*.db file.
 */
function importSingleDb(indexDb, msgDbPath, contacts, wechatDir, options = {}) {
  const { skipSelf = true } = options;

  let srcDb;
  try {
    srcDb = new Database(msgDbPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    console.error(`  Skipping ${basename(msgDbPath)}: ${err.message}`);
    return { inserted: 0, skipped: 0, errors: 0 };
  }

  // Check if MSG table exists
  const hasTable = srcDb.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='MSG'"
  ).get();

  if (!hasTable) {
    srcDb.close();
    return { inserted: 0, skipped: 0, errors: 0 };
  }

  const rows = srcDb.prepare(
    'SELECT localId, MsgSvrID, Type, SubType, IsSender, CreateTime, StrTalker, StrContent FROM MSG ORDER BY CreateTime'
  ).all();

  srcDb.close();

  const batch = [];
  let errors = 0;

  for (const row of rows) {
    try {
      if (skipSelf && row.IsSender === 1) continue;

      const resolvedType = resolveType(row.Type, row.SubType);
      if (resolvedType === 'system') continue;

      const isGroup = isGroupChat(row.StrTalker);
      const room = isGroup ? (contacts.get(row.StrTalker) || row.StrTalker) : null;
      const roomId = isGroup ? row.StrTalker : null;

      // For group messages, the actual sender is often embedded in content
      let sender = null;
      let senderId = null;
      let content = row.StrContent;

      if (isGroup && content && content.includes(':\n')) {
        const colonIdx = content.indexOf(':\n');
        senderId = content.slice(0, colonIdx);
        content = content.slice(colonIdx + 2);
        sender = contacts.get(senderId) || senderId;
      } else if (!isGroup) {
        sender = contacts.get(row.StrTalker) || row.StrTalker;
        senderId = row.StrTalker;
      }

      const textPreview = extractTextPreview(content, row.Type);
      const filename = resolvedType === 'file' ? extractFilename(content) : null;
      const mediaPath = findMediaPath(wechatDir, row, resolvedType);
      const mediaSize = getFileSize(mediaPath);

      batch.push({
        source_id: String(row.MsgSvrID || row.localId),
        timestamp: row.CreateTime,
        sender: sender,
        sender_id: senderId,
        room: room,
        room_id: roomId,
        type: resolvedType,
        text: textPreview,
        filename: filename,
        mime_type: null,
        media_path: mediaPath,
        media_size: mediaSize,
        source_db: basename(msgDbPath),
      });
    } catch (err) {
      errors++;
    }
  }

  const result = insertMessages(indexDb, batch);
  return { ...result, errors };
}

/**
 * Import all messages from a WeChat data directory.
 *
 * @param {Database} indexDb - our index database
 * @param {string} dbDir - directory containing MSG*.db and MicroMsg.db (decrypted)
 * @param {object} options - { skipSelf, mediaDir }
 *   mediaDir: original WeChat dir for locating media files (optional)
 */
export function importFromDesktop(indexDb, dbDir, options = {}) {
  if (!existsSync(dbDir)) {
    throw new Error(`Database directory not found: ${dbDir}`);
  }

  const { mediaDir } = options;

  // Find MicroMsg.db — either in the same dir or nested
  let microMsgPath = join(dbDir, 'MicroMsg.db');
  if (!existsSync(microMsgPath)) {
    microMsgPath = join(dbDir, 'Msg', 'MicroMsg.db');
  }

  const contacts = loadContacts(microMsgPath);
  console.error(`  Loaded ${contacts.size} contacts`);

  const msgDbs = findMsgDbs(dbDir);
  if (msgDbs.length === 0) {
    throw new Error(`No MSG*.db files found in ${dbDir}`);
  }

  console.error(`  Found ${msgDbs.length} message database(s)`);

  // Record the import
  const importRecord = indexDb.prepare(
    "INSERT INTO imports (source_path, source_type) VALUES (?, 'wechat-db')"
  ).run(dbDir);
  const importId = importRecord.lastInsertRowid;

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const dbPath of msgDbs) {
    console.error(`  Importing ${basename(dbPath)}...`);
    const result = importSingleDb(indexDb, dbPath, contacts, mediaDir || dbDir, options);
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
    console.error(`    → ${result.inserted} new, ${result.skipped} duplicates, ${result.errors} errors`);
  }

  // Update import record
  indexDb.prepare(
    "UPDATE imports SET msg_count = ?, finished_at = datetime('now') WHERE id = ?"
  ).run(totalInserted, importId);

  return {
    imported: totalInserted,
    skipped: totalSkipped,
    errors: totalErrors,
    databases: msgDbs.length,
    contacts: contacts.size,
    path: dbDir,
  };
}
