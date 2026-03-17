# Chats Plugin — Operating Rules

Persistent rules for chat/messaging tasks.

---

## Core Principles

- **Always use `--json` for machine-readable output.** When running wachat commands to process results programmatically, pass `--json` so you can parse structured data. Only omit `--json` when showing human-readable output directly to the user.
- **Never run `wachat auth` without user confirmation.** Authentication displays a QR code and links a new device to the user's WhatsApp account — always confirm before initiating.
- **Prefer search over list for large datasets.** Use `wachat messages search` with filters rather than listing all messages and filtering manually.
- **Respect rate limits and privacy.** Do not send bulk messages or scrape conversations without explicit user consent.

---

## Skill-Specific Notes

### whatsapp
- Requires `wachat` CLI — install via `go install github.com/weilueluo/my-plugins/tools/wachat@latest` or download a pre-built binary
- Cross-platform: works on Windows, macOS, and Linux — no CGO or C compiler needed
- User must have already authenticated (`wachat auth`) before any read/write operations work
- All session and message data is stored in `~/.wachat/` by default
- Run `wachat messages sync --wait 30` to populate the local message database before searching
- JIDs follow WhatsApp format: `1234567890@s.whatsapp.net` (user) or `123456789@g.us` (group)
