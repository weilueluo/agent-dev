import { isSameOrigin, normalizeUrl } from './url-normalize.mjs';

export const RUNTIME_EXPRESSIONS = Object.freeze({
  OUTER_HTML: 'document.documentElement.outerHTML',
  TITLE: 'document.title',
  LOCATION: 'location.href',
  LINKS_AND_SOURCES: `Array.from(document.querySelectorAll('a[href], img[src], script[src], link[href], video[src], audio[src], source[src], iframe[src]')).map((el) => ({ tag: el.tagName, href: el.href || null, src: el.src || null }))`
});

export const ALLOWED_CDP_METHODS = new Set([
  'Browser.getVersion',
  'Target.getTargets',
  'Target.attachToTarget',
  'Target.detachFromTarget',
  'Page.enable',
  'Page.navigate',
  'Page.loadEventFired',
  'Page.captureScreenshot',
  'Runtime.evaluate',
  'Runtime.releaseObjectGroup'
]);

const FORBIDDEN_METHOD_PATTERNS = [
  /^Network\.get(All)?Cookies$/,
  /^Storage\./,
  /^DOMStorage\./,
  /^IndexedDB\./,
  /^CacheStorage\./,
  /^Browser\.getBrowserCommandLine$/,
  /^Browser\.setDownloadBehavior$/,
  /^Input\./,
  /^DOM\./
];

const FORBIDDEN_EXPRESSION = /\b(document\.cookie|localStorage|sessionStorage|indexedDB|caches|navigator\.credentials|profile|Authorization|Cookie)\b/i;
const DESTRUCTIVE_URL = /(logout|log-out|signout|sign-out|delete|remove|destroy|revoke|deactivate|unsubscribe|account-close)/i;

export function assertAllowedCdpMethod(method, params = {}) {
  if (!ALLOWED_CDP_METHODS.has(method) || FORBIDDEN_METHOD_PATTERNS.some((pattern) => pattern.test(method))) {
    throw new Error(`CDP method is not allowed: ${method}`);
  }
  if (method === 'Runtime.evaluate') {
    const expression = String(params.expression || '');
    const allowedExpression = Object.values(RUNTIME_EXPRESSIONS).includes(expression);
    if (!allowedExpression || FORBIDDEN_EXPRESSION.test(expression)) {
      throw new Error('Runtime.evaluate expression is not allowed');
    }
  }
  return true;
}

export function shouldSkipAuthNavigation(candidateUrl, startUrl, label = '') {
  let normalized;
  try {
    normalized = normalizeUrl(candidateUrl, startUrl);
  } catch {
    return { skip: true, reason: 'invalid_url' };
  }
  if (!isSameOrigin(normalized, normalizeUrl(startUrl))) {
    return { skip: true, reason: 'cross_origin_page' };
  }
  if (DESTRUCTIVE_URL.test(normalized) || DESTRUCTIVE_URL.test(label)) {
    return { skip: true, reason: 'skipped_destructive_url' };
  }
  return { skip: false, url: normalized };
}

export class PolicyCdpClient {
  constructor(inner) {
    this.inner = inner;
    this.calls = [];
  }

  async send(method, params = {}) {
    assertAllowedCdpMethod(method, params);
    this.calls.push({ method, params });
    return this.inner.send(method, params);
  }
}
