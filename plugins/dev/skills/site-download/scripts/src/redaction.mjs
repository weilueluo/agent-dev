const SECRET_PATTERNS = [
  /(cookie|set-cookie|authorization)\s*[:=]\s*[^\n\r]+/gi,
  /(bearer)\s+[A-Za-z0-9._~+/=-]+/gi,
  /((access|refresh|id)_token|api_key|password)\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /(localStorage|sessionStorage|indexedDB|CacheStorage)\s*[:=]\s*[^\n\r]+/gi,
  /(SENTINEL_SECRET_[A-Za-z0-9_-]*)/g,
  /([A-Za-z]:\\Users\\[^\\\s]+\\AppData\\[^"'\s]+)/gi
];

export function redactText(value) {
  if (value === null || value === undefined) return value;
  let text = String(value);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, label) => {
      const prefix = typeof label === 'string' && match.toLowerCase().startsWith(label.toLowerCase())
        ? label
        : 'secret';
      return `${prefix}: [REDACTED]`;
    });
  }
  return text;
}

export function redactObject(value) {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactObject(item));
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(cookie|set-cookie|authorization)$/i.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactObject(item);
      }
    }
    return output;
  }
  return value;
}

export function privacyRecord(mode) {
  return {
    explicitCookiesExported: false,
    explicitLocalStorageExported: false,
    explicitSessionStorageExported: false,
    explicitIndexedDbExported: false,
    explicitCacheStorageExported: false,
    explicitProfileDataExported: false,
    browserCookiesUsedForMedia: false,
    mayContainPrivatePageContent: mode === 'auth-cdp',
    secretScan: 'not_performed'
  };
}
