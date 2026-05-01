import { isDirectMediaUrl, isPlatformMediaUrl, isProbablyHtmlUrl, normalizeUrl } from './url-normalize.mjs';

export function extractHtmlReferences(html, baseUrl) {
  const pages = new Set();
  const assets = new Set();
  const media = new Set();
  const title = extractTitle(html);

  for (const tag of html.match(/<[^>]+>/g) || []) {
    const name = tagName(tag);
    const attrs = parseAttributes(tag);
    if (name === 'a' || name === 'area') {
      addHref(attrs.href, baseUrl, (url) => {
        if (isDirectMediaUrl(url) || isPlatformMediaUrl(url)) media.add(url);
        else if (isProbablyHtmlUrl(url)) pages.add(url);
        else assets.add(url);
      });
    }
    if (name === 'img') {
      addHref(attrs.src, baseUrl, (url) => assets.add(url));
      for (const url of parseSrcset(attrs.srcset, baseUrl)) assets.add(url);
    }
    if (name === 'script') addHref(attrs.src, baseUrl, (url) => assets.add(url));
    if (name === 'link') {
      const rel = String(attrs.rel || '').toLowerCase();
      addHref(attrs.href, baseUrl, (url) => {
        if (rel.includes('canonical') && isProbablyHtmlUrl(url)) pages.add(url);
        else assets.add(url);
      });
    }
    if (name === 'video' || name === 'audio' || name === 'source') {
      addHref(attrs.src, baseUrl, (url) => media.add(url));
      addHref(attrs.poster, baseUrl, (url) => assets.add(url));
    }
    if (name === 'iframe') {
      addHref(attrs.src, baseUrl, (url) => {
        if (isPlatformMediaUrl(url)) media.add(url);
        else assets.add(url);
      });
    }
    addHref(attrs.content, baseUrl, (url) => {
      if (/^https?:\/\//i.test(attrs.content || '') && (attrs.property || attrs.name || '').match(/image|video|audio/i)) {
        (isDirectMediaUrl(url) ? media : assets).add(url);
      }
    });
  }

  return { title, pages: [...pages], assets: [...assets], media: [...media] };
}

export function extractCssUrls(css, baseUrl) {
  const urls = new Set();
  const regex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let match;
  while ((match = regex.exec(css))) {
    const raw = match[2];
    if (!raw || raw.startsWith('data:')) continue;
    try {
      urls.add(normalizeUrl(raw, baseUrl));
    } catch {
      // Ignore invalid CSS URLs.
    }
  }
  return [...urls];
}

function extractTitle(html) {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(stripTags(match?.[1] || '')).trim();
}

function tagName(tag) {
  const match = tag.match(/^<\s*\/?\s*([a-z0-9:-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

export function parseAttributes(tag) {
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
  let match;
  while ((match = attrRegex.exec(tag))) {
    const key = match[1].toLowerCase();
    if (key === tagName(tag)) continue;
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function addHref(value, baseUrl, add) {
  if (!value || String(value).startsWith('data:') || String(value).startsWith('mailto:') || String(value).startsWith('javascript:')) return;
  try {
    add(normalizeUrl(value, baseUrl));
  } catch {
    // Ignore invalid URLs.
  }
}

function parseSrcset(srcset, baseUrl) {
  if (!srcset) return [];
  const urls = [];
  for (const candidate of String(srcset).split(',')) {
    const raw = candidate.trim().split(/\s+/)[0];
    if (!raw) continue;
    try {
      urls.push(normalizeUrl(raw, baseUrl));
    } catch {
      // Ignore invalid srcset URL.
    }
  }
  return urls;
}

export function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, ' ');
}

export function decodeEntities(text) {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
