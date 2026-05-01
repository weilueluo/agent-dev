---
name: site-download
description: "Download and mirror websites recursively for AI ingestion. Use when a user provides a URL and asks to crawl, mirror, archive, scrape docs, save a website, download pages/assets/images/videos, or produce Markdown/JSONL from a site. Supports public sites by default and authenticated browser-backed crawls via Chrome/Edge CDP. Don't use for CodePen URLs (use codepen), browser console logs (use browser-logs), simple one-page fetches, or unauthorized/paywalled/DRM-protected media extraction."
version: 1.0.0
---

# Site Download

Download a website into a local AI-ingest bundle: offline mirror files, static HTML snapshots, Markdown per page, `corpus.jsonl`, `manifest.json`, `crawl-report.md`, media records, and screenshot records.

## When to use

Use this skill when the user gives a URL and wants a site or documentation set downloaded, mirrored, crawled, archived, converted to Markdown, converted to JSONL, or prepared for AI ingestion.

Do not use this skill for CodePen URLs, browser console debugging, one-page fetches that do not need a local corpus, or attempts to bypass robots.txt, authentication, paywalls, bot protections, DRM, or other access controls.

## Step 0 - Install script dependencies

The bundled scripts use Node.js 18+ and built-in modules by default.

```powershell
$scriptDir = Join-Path $env:COPILOT_SKILL_DIR "scripts"
Set-Location $scriptDir
npm install --quiet
```

## Public/static mode

Public mode assumes the start URL is publicly accessible. It crawls same-origin HTML pages and downloads referenced resources, including cross-origin assets and direct media URLs when robots.txt allows them.

```powershell
node "$env:COPILOT_SKILL_DIR/scripts/bin/site-download.mjs" "https://docs.example.com" --out ".\site-downloads\docs-example" --json
```

Public mode produces static fetched HTML snapshots. It does not execute page JavaScript and does not capture real screenshots unless CDP mode is used. The `screenshots/` directory still exists and the manifest/report record `skipped_screenshot` for pages where a browser screenshot was unavailable.

## Authenticated CDP mode

Use CDP mode only when the user has authorization to download the content and needs their already-authenticated browser session. The user must launch Chrome or Edge with a localhost remote-debugging port and sign in manually.

**Windows example:**

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
node "$env:COPILOT_SKILL_DIR/scripts/bin/site-download.mjs" --url "https://private.example.com/docs" --out ".\site-downloads\private-docs" --auth-cdp-url "http://localhost:9222" --json
```

CDP mode is bounded and read-only in intent: it may navigate same-origin GET-style page URLs, read fixed DOM fields, and capture screenshots. It must not click, type, submit forms, call unsafe HTTP methods, export cookies/storage/profile data, pass browser cookies to media tools, or visit destructive/logout URLs.

**Privacy warning:** authenticated outputs may contain private page content because the goal is to preserve the page for AI ingestion. The script marks auth artifacts with `mayContainPrivatePageContent: true`. It does not claim to remove secrets from page bodies or screenshots.

## Default limits

Defaults are intentionally bounded. Override only when the user understands the larger crawl may consume significant time and disk space.

| Limit | Default | CLI flag |
|---|---:|---|
| Pages | 100 | `--max-pages` |
| Depth | 3 | `--max-depth` |
| Assets | 1000 | `--max-assets` |
| Media | 100 | `--max-media` |
| Total bytes | 524288000 | `--max-total-bytes` |
| Runtime seconds | 600 | `--max-runtime-seconds` |
| Screenshots | 25 | `--max-screenshots` |
| Concurrency | 4 | `--concurrency` |
| Redirects | 5 | `--max-redirects` |
| URL length | 2048 | `--max-url-length` |
| URLs per page | 500 | `--max-urls-per-page` |

There is no artificial rate-limit delay by default. The crawler still respects robots.txt and hard bounds.

## Output layout

```text
site-downloads\<site-slug>\
├── mirror\          # Raw offline mirror and downloaded resources
├── rendered-html\   # Static fetched HTML in public mode; browser DOM HTML in CDP mode
├── markdown\        # One Markdown file per crawled page
├── screenshots\     # PNG screenshots in CDP mode; skipped records otherwise
├── media\           # Direct media downloads when fetched by the crawler
├── corpus.jsonl
├── manifest.json
└── crawl-report.md
```

## Media policy

Direct media URLs are fetched only through the crawler's robots-aware fetcher. Platform media URLs that need `yt-dlp` or `youtube-dl` are recorded as safe suggested command objects by default; the script does not execute external downloaders automatically.

Suggested command objects use an allowlisted executable name (`yt-dlp` or `youtube-dl`) and an argument array. They never include browser cookie flags, browser profile paths, authorization headers, bypass flags, or shell command strings by default.

## Validation

After modifying or testing this skill, run:

```powershell
cd plugins\dev\skills\site-download\scripts
npm test
cd ..\..\..\..\..
python tools\validate-skills.py
```

## Troubleshooting

**Public crawl has no screenshots:** This is expected without CDP. Use `--auth-cdp-url` with a local Chrome/Edge debugging endpoint to capture browser screenshots.

**Media shows `suggested_downloader`:** The crawler found a platform URL that is better handled by `yt-dlp` or `youtube-dl`, but it did not execute that external tool automatically.

**Robots skips appear:** The crawler checks robots.txt per origin before every direct fetch, including cross-origin assets and media. Skips are recorded in `manifest.json` and `crawl-report.md`.

**CDP connection fails:** Confirm Chrome/Edge is running with `--remote-debugging-port=9222`, the port is reachable on localhost, and the page is accessible in that browser session.
