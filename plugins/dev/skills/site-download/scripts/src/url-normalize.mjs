const DIRECT_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mov', '.m4v', '.mp3', '.m4a', '.wav', '.ogg', '.ogv', '.flac', '.aac'
]);

const ASSET_EXTENSIONS = new Set([
  '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.json', '.xml', '.pdf', '.txt', '.csv'
]);

const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

export function normalizeUrl(input, base) {
  const url = new URL(input, base);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  const pairs = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) => {
    const keyCompare = ak.localeCompare(bk);
    return keyCompare || av.localeCompare(bv);
  });
  url.search = '';
  for (const [key, value] of pairs) {
    url.searchParams.append(key, value);
  }
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  return url.href;
}

export function urlKey(input, base) {
  return normalizeUrl(input, base);
}

export function isSameOrigin(a, b) {
  const left = new URL(a);
  const right = new URL(b);
  return left.protocol === right.protocol && left.hostname === right.hostname && left.port === right.port;
}

export function extensionForUrl(input) {
  const pathname = new URL(input).pathname.toLowerCase();
  const slash = pathname.lastIndexOf('/');
  const dot = pathname.lastIndexOf('.');
  if (dot <= slash) return '';
  return pathname.slice(dot);
}

export function isDirectMediaUrl(input) {
  return DIRECT_MEDIA_EXTENSIONS.has(extensionForUrl(input));
}

export function isAssetUrl(input) {
  const ext = extensionForUrl(input);
  return ASSET_EXTENSIONS.has(ext) || DIRECT_MEDIA_EXTENSIONS.has(ext);
}

export function isProbablyHtmlUrl(input) {
  const ext = extensionForUrl(input);
  return ext === '' || ext === '.html' || ext === '.htm' || ext === '.xhtml';
}

export function isPlatformMediaUrl(input) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  return host === 'youtu.be' ||
    host.endsWith('.youtube.com') ||
    host === 'youtube.com' ||
    host.endsWith('.vimeo.com') ||
    host === 'vimeo.com' ||
    host.endsWith('.twitch.tv') ||
    host === 'twitch.tv';
}

export function safeFilenameSegment(value, fallback = 'item') {
  let safe = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  if (!safe) safe = fallback;
  if (RESERVED_WINDOWS_NAMES.test(safe)) safe = `_${safe}`;
  if (safe.length > 120) safe = safe.slice(0, 120).replace(/[. ]+$/g, '') || fallback;
  return safe;
}
