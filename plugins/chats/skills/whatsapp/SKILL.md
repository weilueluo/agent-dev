---
name: whatsapp
description: "Interact with WhatsApp from the CLI — search messages, send texts and files, list chats, manage contacts and groups. Triggers when the user mentions WhatsApp, wants to send a message, search chat history, list conversations, manage groups/contacts, or references wachat. Automatically installs wachat if missing. Requires one-time QR authentication."
version: 2.0.0
---

# WhatsApp CLI (wachat) Integration

Wraps [`wachat`](../../tools/wachat/) — a cross-platform WhatsApp CLI built on [whatsmeow](https://github.com/tulir/whatsmeow). Works on Windows, macOS, and Linux with no CGO required.

## Step 0 — Ensure wachat is installed

Before running any command, verify wachat is available:

```bash
command -v wachat >/dev/null 2>&1 || go install github.com/weilueluo/agent-dev/tools/wachat@latest
```

On Windows (PowerShell):
```powershell
Get-Command wachat -ErrorAction SilentlyContinue | Out-Null
if (-not $?) { go install github.com/weilueluo/agent-dev/tools/wachat@latest }
```

If Go is not available, tell the user to download a pre-built binary from the releases page.

## Step 1 — Check authentication

Before any read/write operation, verify the user is authenticated:

```bash
wachat auth status --json
```

If not authenticated, tell the user they need to run `wachat auth` interactively (it shows a QR code to scan with WhatsApp). Do NOT run `wachat auth` without user confirmation — it links a new device to their account.

## Command Reference

All commands support `--json` for machine-readable output. Always use `--json` when you need to parse results.

### Messages

#### Sync messages (must run first to populate local DB)
```bash
wachat messages sync --wait 30
```

Stays connected for `--wait` seconds to receive incoming messages and history sync data. Run this before searching/listing.

#### Search messages
```bash
wachat messages search "query" --json
wachat messages search "query" --chat JID --limit 20 --json
```

#### List messages in a chat
```bash
wachat messages list --chat JID --json
wachat messages list --chat JID --limit 50 --json
wachat messages list --chat JID --after 2024-01-01 --before 2024-12-31 --json
```

### Sending

#### Send a text message
```bash
wachat send text --to PHONE_OR_JID --message "Hello!" --json
```

The `--to` flag accepts a phone number (e.g. `1234567890`) or full JID (`1234567890@s.whatsapp.net` or group `123456789@g.us`).

#### Send a file
```bash
wachat send file --to PHONE_OR_JID --file ./path/to/file --json
wachat send file --to PHONE_OR_JID --file ./photo.jpg --caption "Check this out" --json
```

### Chats

#### List all chats
```bash
wachat chats list --json
wachat chats list --query "search term" --json
```

### Contacts

#### Search contacts
```bash
wachat contacts search "name or number" --json
```

### Groups

#### List groups
```bash
wachat groups list --json
wachat groups list --query "search" --json
```

#### Group info
```bash
wachat groups info --jid GROUP_JID --json
```

## Patterns for Common Tasks

### Find a contact then send a message
1. `wachat contacts search "John" --json` → get the JID
2. `wachat send text --to JID --message "Hey John!" --json`

### Search recent messages in a specific chat
1. `wachat chats list --json` → find the chat JID
2. `wachat messages sync --wait 30` → populate local DB (if not done yet)
3. `wachat messages search "keyword" --chat JID --limit 20 --json`

### Summarize a group conversation
1. `wachat messages sync --wait 30` → ensure messages are synced
2. `wachat messages list --chat GROUP_JID --after 2024-03-01 --limit 100 --json`
3. Parse the JSON output and summarize the messages

## Notes

- **JID format**: Users are `number@s.whatsapp.net`, groups are `number@g.us`
- **Phone numbers**: Use international format without `+` (e.g. `1234567890` not `+1234567890`)
- **Storage**: Session and message data lives in `~/.wachat/`
- **Cross-platform**: Works on Windows, macOS, and Linux — no CGO or C compiler needed
- **Privacy**: Never send messages or access conversations without explicit user consent
