---
name: codepen-downloader
description: "Download CodePen projects (HTML, CSS, JS) and assets to local files. Use when a user provides a CodePen URL and wants to save, download, or replicate a pen's source code locally. Triggers on CodePen URLs (codepen.io), 'download codepen', 'save codepen', 'get codepen code', or any request to extract code from a CodePen link."
license: Complete terms in LICENSE.txt
---

# CodePen Downloader

Download a CodePen's HTML, CSS, and JS source code (plus external resources and images) to local files.

## URL Parsing

Extract the **username** and **pen ID** from any CodePen URL variant:

| URL format | Example |
|---|---|
| `https://codepen.io/{user}/pen/{id}` | Editor view |
| `https://codepen.io/{user}/full/{id}` | Full-page preview |
| `https://codepen.io/{user}/details/{id}` | Details view |
| `https://codepen.io/{user}/embed/{id}` | Embed view |

The regex to extract both parts: `codepen\.io\/([^\/]+)\/(?:pen|full|details|embed)\/([a-zA-Z0-9]+)`

Always normalize to the editor URL: `https://codepen.io/{user}/pen/{id}`

## Extraction Procedure

CodePen uses Cloudflare protection — simple HTTP requests (curl, web_fetch, Invoke-WebRequest) will be blocked with a challenge page. **You must use a real browser via Playwright.**

### Step 1: Ensure Playwright is available

The extraction script requires `playwright` with Chromium. Install if needed:

```bash
npm ls playwright 2>/dev/null || npm install playwright
npx playwright install chromium
```

If Playwright is already installed globally or in the project, skip this step.

### Step 2: Run the bundled extraction script

This skill ships with `extract.js` — a ready-to-run Playwright script located alongside this SKILL.md.

Find its absolute path relative to this skill's directory, then run it:

```bash
node /path/to/plugins/dev/skills/codepen-downloader/extract.js "https://codepen.io/{user}/pen/{id}"
```

The script outputs JSON to stdout (logs go to stderr). It tries 5 extraction strategies in order:
1. `window.__pen` global (older CodePen)
2. `__NEXT_DATA__` JSON (newer Next.js CodePen)
3. Script tag scanning for pen data
4. CodeMirror editor instances
5. Textarea fallbacks

Parse the JSON output to get `html`, `css`, `js`, `title`, `externalCSS`, `externalJS`, and `images`.

### Step 4: Save to local files

Create a project folder named after the pen (use the title, slugified):

```
{pen-title}/
├── index.html      # Full HTML page combining all parts
├── style.css       # The pen's CSS
├── script.js       # The pen's JS
└── assets/         # Downloaded images (if any)
```

#### Building index.html

Combine the extracted parts into a standalone HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{pen-title}</title>
  <!-- External CSS resources -->
  <link rel="stylesheet" href="{external-css-url}">
  <!-- ... -->
  <link rel="stylesheet" href="style.css">
</head>
<body>
  {pen-html}
  <!-- External JS resources -->
  <script src="{external-js-url}"></script>
  <!-- ... -->
  <script src="script.js"></script>
</body>
</html>
```

### Step 5: Download external resources and images

For each URL in `externalCSS`, `externalJS`, and `images`:
- Use `web_fetch` or `Invoke-WebRequest` to download the file
- Save to the `assets/` folder
- Update references in `index.html` to point to local copies (optional — keeping CDN links is fine for most use cases)

For images, also scan the CSS and HTML for `url(...)` and `src="..."` patterns pointing to external image URLs.

### Step 6: Clean up

Remove the temporary extraction script after saving the pen files.

## Preprocessor Handling

CodePen supports preprocessors. The extraction script captures preprocessor info in `cssPreprocessor` and `jsPreprocessor`. Handle these cases:

| Preprocessor | File extension | Notes |
|---|---|---|
| `scss` / `sass` | `.scss` / `.sass` | Save as-is; note that the pen uses SCSS |
| `less` | `.less` | Save as-is |
| `stylus` | `.styl` | Save as-is |
| `babel` / `typescript` | `.ts` or `.jsx` | Save as-is; note transpiler used |
| `coffeescript` | `.coffee` | Save as-is |
| `pug` / `haml` / `slim` | `.pug` / `.haml` / `.slim` | Save as-is |

When a preprocessor is used:
- Save the **source** file with the correct extension (e.g., `style.scss`)
- Note in the output which preprocessor is needed to compile it
- If the user wants compiled output, mention they can compile locally or offer to add a build step

## Troubleshooting

**Cloudflare challenge loop**: If the browser gets stuck on Cloudflare, try:
- Increase timeout to 90+ seconds
- Use `headless: false` for debugging (shows the browser window)
- Add a manual wait: `await page.waitForTimeout(10000)` after goto

**Empty extraction**: If all strategies return empty strings:
- Check if the pen requires authentication (private pen)
- Try the full-page view URL instead: `https://codepen.io/{user}/full/{id}`
- Dump the page HTML and inspect it manually for the pen data location

**Playwright not available**: As a fallback, try installing `puppeteer`:
```bash
npm install puppeteer
```
Then adapt the script to use Puppeteer's API (very similar to Playwright).

## Output

After downloading, summarize to the user:
- The pen title and author
- Which files were created and where
- Any external dependencies (CDN links)
- Any preprocessors in use
- Any images that were downloaded
- If any extraction strategies failed, mention what was tried
