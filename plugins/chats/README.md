# chats

Chat platform integrations for Copilot CLI.

## Skills

| Skill | Description |
|-------|-------------|
| [`whatsapp`](skills/whatsapp/) | Search, send, and manage WhatsApp messages, contacts, and groups via the `wachat` CLI |
| [`wechat`](skills/wechat/) | Search and browse WeChat messages from a local index imported from WeChat desktop database files |

## Setup

### WhatsApp

The whatsapp skill auto-installs `wachat` on first use. You only need to authenticate once:

```
wachat auth
```

This shows a QR code — scan it with your WhatsApp mobile app to link.

### WeChat

The wechat skill reads WeChat desktop's local database files (Windows). First import:

```
node scripts/wechat.mjs import --auto-detect
```

Requires Node.js v18+ and WeChat desktop to have been used on the machine.
