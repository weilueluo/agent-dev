const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node extract.js <codepen-url>');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.error('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.error('Page loaded, waiting for editor...');

    await page.waitForFunction(() => {
      return document.querySelector('.CodeMirror') ||
             document.querySelector('[class*="editor"]') ||
             document.querySelector('#__NEXT_DATA__') ||
             window.__pen;
    }, { timeout: 30000 }).catch(() => console.error('Editor wait timed out, trying extraction anyway...'));

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
        result.strategy = 'window.__pen';
        return result;
      }

      // Strategy 2: __NEXT_DATA__ (newer CodePen with Next.js)
      const nextDataEl = document.querySelector('#__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const data = JSON.parse(nextDataEl.textContent);
          const pen = data?.props?.pageProps?.pen ||
                      data?.props?.pageProps?.data?.pen ||
                      data?.props?.pageProps?.item ||
                      data?.props?.pageProps?.data?.item || {};
          if (pen.html !== undefined || pen.css !== undefined || pen.js !== undefined) {
            result.html = pen.html || '';
            result.css = pen.css || '';
            result.js = pen.js || '';
            result.title = pen.title || '';
            result.externalCSS = (pen.css_external || '').split(';').filter(Boolean);
            result.externalJS = (pen.js_external || '').split(';').filter(Boolean);
            result.cssPreprocessor = pen.css_pre_processor || '';
            result.jsPreprocessor = pen.js_pre_processor || '';
            result.strategy = '__NEXT_DATA__';
            return result;
          }
          result._nextDataKeys = JSON.stringify(Object.keys(data?.props?.pageProps || {}));
        } catch (e) {
          result._nextDataError = e.message;
        }
      }

      // Strategy 3: script tag scanning
      const scripts = document.querySelectorAll('script:not([src])');
      for (const script of scripts) {
        const text = script.textContent;
        const penMatch = text.match(/__pen\s*=\s*(\{[\s\S]*?\});/);
        if (penMatch) {
          try {
            const obj = JSON.parse(penMatch[1]);
            result.html = obj.html || '';
            result.css = obj.css || '';
            result.js = obj.js || '';
            result.title = obj.title || '';
            result.strategy = 'script_scan';
            return result;
          } catch (e) {}
        }
      }

      // Strategy 4: CodeMirror editor instances
      const editors = document.querySelectorAll('.CodeMirror');
      if (editors.length >= 1) {
        if (editors.length >= 1) result.html = editors[0]?.CodeMirror?.getValue?.() || '';
        if (editors.length >= 2) result.css = editors[1]?.CodeMirror?.getValue?.() || '';
        if (editors.length >= 3) result.js = editors[2]?.CodeMirror?.getValue?.() || '';
        if (result.html || result.css || result.js) {
          result.strategy = 'CodeMirror';
        }
      }

      // Strategy 5: textarea fallbacks
      if (!result.html && !result.css && !result.js) {
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
          const id = (ta.id || ta.name || '').toLowerCase();
          if (id.includes('html')) result.html = ta.value;
          else if (id.includes('css')) result.css = ta.value;
          else if (id.includes('js')) result.js = ta.value;
        }
        if (result.html || result.css || result.js) result.strategy = 'textarea';
      }

      // Get title
      if (!result.title) {
        result.title = document.querySelector('.pen-title-link')?.textContent?.trim() ||
                       document.querySelector('[class*="title"]')?.textContent?.trim() ||
                       document.title.replace(/ - CodePen$/, '').trim() || 'codepen';
      }

      if (!result.strategy) result.strategy = 'none';
      return result;
    });

    // Capture images from preview iframe
    let images = [];
    try {
      for (const frame of page.frames()) {
        if (frame.url().includes('cdpn.io') || frame.url().includes('codepen')) {
          images = await frame.evaluate(() =>
            Array.from(document.querySelectorAll('img')).map(img => img.src).filter(Boolean)
          ).catch(() => []);
          if (images.length) break;
        }
      }
    } catch (e) {}

    console.log(JSON.stringify({ ...penData, images }, null, 2));
  } catch (err) {
    console.error('Extraction failed:', err.message);
    const html = await page.content().catch(() => '');
    console.log(JSON.stringify({ error: err.message, pageHtml: html.substring(0, 5000) }));
  } finally {
    await browser.close();
  }
})();
