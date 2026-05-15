---
name: wechat
description: "Search, browse, and export WeChat messages from a local index, including associated cached media files. Triggers when the user mentions WeChat, 微信, wants to search WeChat messages, sync/archive chats into references, find/download WeChat files/images/videos, or export WeChat history. Imports from WeChat desktop database files on Windows. Requires Node.js and WeChat desktop data directory."
version: 1.2.0
---

# WeChat Local Index

Imports WeChat desktop messages into a searchable local SQLite index. Supports
search by text, sender, room, and media type, media file lookup by ID, and
conversation export with associated cached media files.
Compatible with WeChat 3.x and 4.x message database formats.

**Platform:** Windows (reads WeChat desktop DB files directly)
**Data location:** `%USERPROFILE%\Documents\WeChat Files\<wxid>\`
**Index location:** `~/.wechat/index.db`

## Step 0 — Ensure dependencies are installed

Before running any command, ensure npm dependencies are installed:

```powershell
$scriptDir = Join-Path $env:COPILOT_SKILL_DIR "scripts"
if (-not (Test-Path (Join-Path $scriptDir "node_modules"))) {
  Set-Location $scriptDir; npm install --quiet
}
```

## Step 1 — Search (auto-refreshes by default)

`search` decrypts WeChat's latest data and runs an incremental import before
querying, so you get fresh results without a separate import step. The refresh
is throttled (default 30s) to make bursty searches cheap.

```powershell
# Free-text search — refreshes first, then queries
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --json

# Filter by type: text, image, file, video, voice, link, sticker
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --type image --json

# Filter by room/group name
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --room "Group Name" --json

# Browse by type without text query
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search --type file --limit 20 --json

# Pagination
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --limit 20 --offset 40 --json

# Skip the auto-refresh (read-only against current index)
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --no-refresh --json

# Force a refresh even if throttled
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --force-refresh --json
```

JSON output wraps the results so callers can see the freshness state:

```json
{
  "refresh": { "refreshed": true, "reason": "ok", "imported": 4, "skipped": 1, "healed": 0 },
  "results": [ ... ]
}
```

The `healed` count tracks rows that were already in the index but had a missing
`sender_id` and got repaired in place by a re-import — this happens when an
older importer run failed to parse the WeChat 4.x `BytesExtra` protobuf.

If WeChat is not running or `pywxdump` is missing, the refresh fails gracefully
and search still runs against the existing index. Refresh status is reported in
the `refresh` object (e.g. `reason: "decrypt-failed"`).

## Step 2 — Standalone refresh

Run a refresh without searching:

```powershell
# Decrypt + import (throttled — skips if last import was within 30s)
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" refresh --json

# Bypass throttle
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" refresh --force --json
```

## Step 3 — Manual import (advanced)

Useful when refresh's auto-detection misses a custom location, or when you only
have decrypted DBs without a running WeChat client.

### Auto-detect WeChat accounts
```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" import --auto-detect --json
```

### Specify path manually
```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" import --path "C:\Users\X\Documents\WeChat Files\wxid_xxx" --json
```

If the user doesn't know their wxid, help them find it:
```powershell
Get-ChildItem "$env:USERPROFILE\Documents\WeChat Files" -Directory | Where-Object { $_.Name -match '^wxid_' }
```

Import is incremental — running it again skips already-imported messages.

### Include self-sent messages
By default, self-sent messages are skipped. To include them:
```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" import --auto-detect --include-self --json
```

## Step 4 — Export chats with associated media

Use `export` when the user asks to sync, archive, or collect WeChat messages
into a project/reference folder. It writes `messages.json`, `messages.csv`,
`transcript.md`, `summary.json`, `media-manifest.json`, `missing-media.json`,
and copies any recoverable cached media files into `media/`.

```powershell
# Export a group chat, including cached images/files/videos where available
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" export --room "Group Name" --out "C:\path\to\reference\wechat-export" --json

# Export messages matching a keyword
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" export "JE.CHER" --out "C:\path\to\reference\wechat-export" --json

# Export without copying media
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" export --room "Group Name" --out "C:\path\to\reference\wechat-export" --no-media --json

# Export from an existing index/decrypted DB without refreshing first
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" export --room "Group Name" --out "C:\path\to\reference\wechat-export" --no-refresh --json
```

`export` auto-refreshes by default, then uses both the index and the latest
decrypted `MSG*.db` `BytesExtra` metadata to recover WeChat 4.x media paths
under `FileStorage\MsgAttach`, `FileStorage\File`, and `FileStorage\Video`.
If a media file was not cached locally or has been deleted, the export records
it in `missing-media.json` instead of failing the whole export.

## Step 5 — Download / look up media

Use a message row ID from search results to get full details including the
local file path:

```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" download --id 42 --json
```

Returns structured JSON with: id, timestamp, sender, room, type, filename,
media_path, file_exists, file_size.

If `file_exists` is false, the media file was not found on disk (it may have
been deleted or WeChat didn't cache it locally).

## Step 6 — Check status

```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" status --json
```

Returns message count, type breakdown, date range, import history.

## Common Patterns

### Find images from a specific person
1. `search "sender name" --type image --json` → get IDs
2. `download --id <ID> --json` → get file path

### Find files shared in a group
1. `search --room "Group Name" --type file --json`
2. `download --id <ID> --json` → get file path and name

### Archive a chat into project references
1. `export --room "Group Name" --out "C:\path\to\reference\wechat-group" --json`
2. Check `summary.json` for message/media counts and `missing-media.json` for
   cached files WeChat no longer has locally.

### Summarize recent messages in a group
1. `search --room "Group Name" --limit 100 --json`
2. Parse JSON output and summarize the messages

## Tests

```powershell
Set-Location "$env:COPILOT_SKILL_DIR\scripts"
npm test
```

Runs `node --test` over `scripts/tests/*.test.mjs` (protobuf, importer, refresh,
db). Tests are hermetic — no WeChat or `pywxdump` required.

## Notes

- **Compatibility.** WeChat 4.x stores group sender wxids in the `BytesExtra`
  protobuf blob; older 3.x messages used a `wxid:\nbody` prefix in `StrContent`.
  The importer tries both.
- **WeChat must have been used on desktop** for message DBs to exist. This skill
  reads the local database files, not the mobile app.
- **WeChat must be running** for `refresh` to work — it extracts the decryption
  key from the live process via `pywxdump` (`pip install pywxdump`).
- **Close WeChat desktop** before manual `import` from the live data dir if you
  get "database is locked" errors. `refresh` decrypts to a copy first, so this
  is rarely an issue.
- **Media files** are only available if WeChat cached them locally (images,
  files, videos in `FileStorage/`).
- **Contact resolution** uses `MicroMsg.db` — if a contact shows as a wxid
  instead of a name, the contact DB may be incomplete.
- **Privacy:** All data stays local. Nothing is sent to any remote service.
- **Concurrency.** A file lock at `~/.wechat/refresh.lock` prevents two refreshes
  from clobbering each other; stale locks (>10 min) are automatically cleared.

