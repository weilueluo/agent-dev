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

The wechat skill reads WeChat desktop's local database files (Windows). Search
auto-refreshes by default — `pip install pywxdump` and keep WeChat running for
the live key extraction. To pre-warm the index manually:

```
node scripts/wechat.mjs refresh --force --json
```

Run the test suite (no WeChat needed):

```
cd plugins/chats/skills/wechat/scripts
npm install
npm test
```

Requires Node.js v18+ and WeChat desktop to have been used on the machine.
