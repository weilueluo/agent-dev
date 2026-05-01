export const DEFAULT_LIMITS = Object.freeze({
  maxPages: 100,
  maxDepth: 3,
  maxAssets: 1000,
  maxMedia: 100,
  maxTotalBytes: 524288000,
  maxRuntimeSeconds: 600,
  maxScreenshots: 25,
  concurrency: 4,
  maxRedirects: 5,
  maxUrlLength: 2048,
  maxUrlsPerPage: 500
});

export const LIMIT_FLAGS = Object.freeze({
  '--max-pages': 'maxPages',
  '--max-depth': 'maxDepth',
  '--max-assets': 'maxAssets',
  '--max-media': 'maxMedia',
  '--max-total-bytes': 'maxTotalBytes',
  '--max-runtime-seconds': 'maxRuntimeSeconds',
  '--max-screenshots': 'maxScreenshots',
  '--concurrency': 'concurrency',
  '--max-redirects': 'maxRedirects',
  '--max-url-length': 'maxUrlLength',
  '--max-urls-per-page': 'maxUrlsPerPage'
});

export function parseCliArgs(argv) {
  const options = {
    url: null,
    out: null,
    authCdpUrl: null,
    json: false,
    limits: { ...DEFAULT_LIMITS }
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--url') {
      options.url = requireValue(argv, ++i, arg);
      continue;
    }
    if (arg === '--out') {
      options.out = requireValue(argv, ++i, arg);
      continue;
    }
    if (arg === '--auth-cdp-url' || arg === '--cdp-url') {
      options.authCdpUrl = requireValue(argv, ++i, arg);
      continue;
    }
    if (Object.hasOwn(LIMIT_FLAGS, arg)) {
      const value = Number.parseInt(requireValue(argv, ++i, arg), 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${arg} must be a non-negative integer`);
      }
      options.limits[LIMIT_FLAGS[arg]] = value;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  if (!options.url && positional.length > 0) {
    options.url = positional[0];
  }
  if (!options.url && !options.help) {
    throw new Error('Missing URL. Provide a positional URL or --url <url>.');
  }
  if (!options.out && !options.help) {
    throw new Error('Missing output directory. Provide --out <path>.');
  }
  options.mode = options.authCdpUrl ? 'auth-cdp' : 'public';
  return options;
}

export function usage() {
  return [
    'Usage:',
    '  node bin/site-download.mjs <url> --out <dir> [--json]',
    '  node bin/site-download.mjs --url <url> --out <dir> --auth-cdp-url http://localhost:9222 [--json]',
    '',
    'Limits:',
    ...Object.keys(LIMIT_FLAGS).map((flag) => `  ${flag} <n>`)
  ].join('\n');
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
