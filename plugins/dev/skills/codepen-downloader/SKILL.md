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

### Step 1: Install Playwright (if needed)

```bash
npm ls playwright 2>/dev/null || npm install playwright
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium
```

### Step 2: Write and run the extraction script

Create a temporary Node.js script that:

1. Launches a headless Chromium browser via Playwright
2. Navigates to the CodePen editor URL
3. Waits for the page to fully load (past Cloudflare challenge)
4. Extracts pen data from the page

Use this template script (adapt paths as needed):

```js
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2]; // CodePen URL from command line
  if (!url) { console.error('Usage: node extract.js <codepen-url>'); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for CodePen editor to render (try multiple selectors)
    await page.waitForFunction(() => {
      return document.querySelector('.CodeMirror') ||
             document.querySelector('[class*="editor"]') ||
             document.querySelector('#__NEXT_DATA__') ||
             window.__pen;
    }, { timeout: 30000 }).catch(() => {});

    // Extract pen data using multiple strategies
    const penData = await page.evaluate(() => {
      const result = { html: '', css: '', js: '', title: '', externalCSS: [], externalJS: [], cssPreprocessor: '', jsPreprocessor: '' };

      // Strategy 1: window.__pen global (older CodePen)
      if (window.__pen) {
        result.html = window.__pen.html || '';
        result.css = window.__pen.css || '';
        result.js = window.__pen.js || '';
        result.title = window.__pen.title || '';
        result.externalCSS = (window.__pen.css_external || '').split(';').filter(Boolean);
        result.externalJS = (window.__pen.js_external || '').split(';').filter(Boolean);
        result.cssPreprocessor = window.__pen.css_pre_processor || '';
        result.jsPreprocessor = window.__pen.js_pre_processor || '';
        return result;
      }

      // Strategy 2: __NEXT_DATA__ (newer CodePen with Next.js)
      const nextDataEl = document.querySelector('#__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const data = JSON.parse(nextDataEl.textContent);
          const pen = data?.props?.pageProps?.pen || data?.props?.pageProps?.data?.pen || {};
          result.html = pen.html || '';
          result.css = pen.css || '';
          result.js = pen.js || '';
          result.title = pen.title || '';
          result.externalCSS = (pen.css_external || '').split(';').filter(Boolean);
          result.externalJS = (pen.js_external || '').split(';').filter(Boolean);
          result.cssPreprocessor = pen.css_pre_processor || '';
          result.jsPreprocessor = pen.js_pre_processor || '';
          return result;
        } catch (e) {}
      }

      // Strategy 3: Look for pen data in any script tag
      const scripts = document.querySelectorAll('script:not([src])');
      for (const script of scripts) {
        const text = script.textContent;
        // Look for JSON-like pen data patterns
        const patterns = [/__pen\s*=\s*(\{[\s\S]*?\});/, /"html"\s*:\s*"/, /penData\s*=\s*(\{[\s\S]*?\});/];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            try {
              const obj = match[1] ? JSON.parse(match[1]) : null;
              if (obj && (obj.html !== undefined || obj.css !== undefined)) {
                result.html = obj.html || '';
                result.css = obj.css || '';
                result.js = obj.js || '';
                result.title = obj.title || '';
                result.externalCSS = (obj.css_external || '').split(';').filter(Boolean);
                result.externalJS = (obj.js_external || '').split(';').filter(Boolean);
                result.cssPreprocessor = obj.css_pre_processor || '';
                result.jsPreprocessor = obj.js_pre_processor || '';
                return result;
              }
            } catch (e) {}
          }
        }
      }

      // Strategy 4: Extract from CodeMirror editor instances
      const editors = document.querySelectorAll('.CodeMirror');
      if (editors.length >= 1) result.html = editors[0]?.CodeMirror?.getValue?.() || '';
      if (editors.length >= 2) result.css = editors[1]?.CodeMirror?.getValue?.() || '';
      if (editors.length >= 3) result.js = editors[2]?.CodeMirror?.getValue?.() || '';

      // Strategy 5: Extract from textarea fallbacks
      if (!result.html && !result.css && !result.js) {
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
          const id = (ta.id || ta.name || '').toLowerCase();
          if (id.includes('html')) result.html = ta.value;
          else if (id.includes('css')) result.css = ta.value;
          else if (id.includes('js')) result.js = ta.value;
        }
      }

      // Get the title
      if (!result.title) {
        result.title = document.querySelector('.pen-title-link')?.textContent?.trim() ||
                       document.querySelector('[class*="title"]')?.textContent?.trim() ||
                       document.title.replace(/ - CodePen$/, '').trim() ||
                       'codepen';
      }

      return result;
    });

    // Also capture any images from the pen's preview iframe
    let images = [];
    try {
      const previewFrame = page.frames().find(f => f.url().includes('cdpn.io') || f.url().includes('codepen'));
      if (previewFrame) {
        images = await previewFrame.evaluate(() => {
          return Array.from(document.querySelectorAll('img')).map(img => img.src).filter(Boolean);
        });
      }
    } catch (e) {}

    // Output as JSON
    console.log(JSON.stringify({ ...penData, images }, null, 2));
  } catch (err) {
    console.error('Extraction failed:', err.message);

    // Fallback: dump full page HTML for manual inspection
    const html = await page.content();
    console.log(JSON.stringify({ error: err.message, pageHtml: html.substring(0, 5000) }));
  } finally {
    await browser.close();
  }
})();
```

### Step 3: Run the script

```bash
node extract.js "https://codepen.io/{user}/pen/{id}"
```

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
