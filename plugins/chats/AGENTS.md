# Chats

Chat platform integrations — WhatsApp messaging and WeChat local message search.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/whatsapp` — WhatsApp CLI via `wachat`
- `skills/wechat` — WeChat local message index and search

## Operational Rules

- **Always use `--json`** for machine-readable output when processing results programmatically.
- **Never run `wachat auth` without user confirmation** — it links a new device to their account.
- **Prefer search over list** for large datasets.
- **Respect rate limits and privacy.** No bulk messages or conversation scraping without explicit consent.
