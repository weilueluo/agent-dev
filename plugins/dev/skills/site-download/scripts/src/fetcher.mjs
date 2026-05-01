import http from 'node:http';
import https from 'node:https';

export async function fetchBuffer(url, {
  maxRedirects = 5,
  maxBytes = Infinity,
  beforeFetch = null,
  method = 'GET'
} = {}) {
  let current = url;
  const redirects = [];
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    if (beforeFetch) {
      const decision = await beforeFetch(current);
      if (decision && decision.allowed === false) {
        return {
          skipped: true,
          skippedReason: decision.reason || 'fetch_disallowed',
          url,
          finalUrl: current,
          redirects,
          decision
        };
      }
    }
    const response = await requestOnce(current, { maxBytes, method });
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      if (redirectCount === maxRedirects) {
        return { ...response, url, finalUrl: current, redirects, error: 'max_redirects' };
      }
      const next = new URL(response.headers.location, current).href;
      redirects.push({ from: current, to: next, status: response.status });
      current = next;
      continue;
    }
    return { ...response, url, finalUrl: current, redirects };
  }
  throw new Error('Redirect loop exceeded');
}

function requestOnce(url, { maxBytes, method }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(parsed, {
      method,
      headers: {
        'User-Agent': 'site-download-skill/1.0'
      }
    }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          req.destroy(new Error('max_total_bytes'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
          bytes,
          contentType: String(res.headers['content-type'] || '')
        });
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error('request_timeout')));
    req.on('error', reject);
    req.end();
  });
}
