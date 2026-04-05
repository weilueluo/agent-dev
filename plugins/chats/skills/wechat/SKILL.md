---
name: wechat
description: "Search and browse WeChat messages from a local index. Triggers when the user mentions WeChat, 微信, wants to search WeChat messages, find WeChat files/images, or references wechat history. Imports from WeChat desktop database files on Windows. Requires Node.js and WeChat desktop data directory."
version: 1.0.0
---

# WeChat Local Index

Imports WeChat desktop messages into a searchable local SQLite index. Supports search by text, sender, room, and media type, plus media file lookup by ID.

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

## Step 1 — Import messages

Before searching, import messages from the WeChat desktop database. The user must have WeChat desktop installed on Windows.

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

## Step 2 — Search messages

```powershell
# Free-text search
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --json

# Filter by type: text, image, file, video, voice, link, sticker
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --type image --json

# Filter by room/group name
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --room "Group Name" --json

# Browse by type without text query
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search --type file --limit 20 --json

# Pagination
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" search "keyword" --limit 20 --offset 40 --json
```

Search uses FTS5 full-text matching across sender name, room name, message text, and filename.

## Step 3 — Download / look up media

Use a message row ID from search results to get full details including the local file path:

```powershell
node "$env:COPILOT_SKILL_DIR/scripts/wechat.mjs" download --id 42 --json
```

Returns structured JSON with: id, timestamp, sender, room, type, filename, media_path, file_exists, file_size.

If `file_exists` is false, the media file was not found on disk (it may have been deleted or WeChat didn't cache it locally).

## Step 4 — Check status

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

### Summarize recent messages in a group
1. `search --room "Group Name" --limit 100 --json`
2. Parse JSON output and summarize the messages

### Re-import after new messages
Just run `import --auto-detect` again — duplicates are skipped automatically.

## Notes

- **WeChat must have been used on desktop** for message DBs to exist. This skill reads the local database files, not the mobile app.
- **Close WeChat desktop** before importing if you get "database is locked" errors.
- **Media files** are only available if WeChat cached them locally (images, files, videos in `FileStorage/`).
- **Contact resolution** uses `MicroMsg.db` — if a contact shows as a wxid instead of a name, the contact DB may be incomplete.
- **Privacy:** All data stays local. Nothing is sent to any remote service.
- **Incremental imports:** Running import again only adds new messages — safe to run repeatedly.
