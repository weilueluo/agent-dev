export class RobotsPolicy {
  constructor(text = '', origin = '') {
    this.origin = origin;
    this.groups = parseRobots(text);
  }

  isAllowed(url, userAgent = 'site-download') {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}`;
    const matching = this.groups.filter((group) =>
      group.agents.some((agent) => agent === '*' || agent === userAgent.toLowerCase())
    );
    const rules = matching.flatMap((group) => group.rules);
    let winner = null;
    for (const rule of rules) {
      if (!rule.path || target.startsWith(rule.path)) {
        if (!winner || rule.path.length > winner.path.length || (rule.path.length === winner.path.length && rule.type === 'allow')) {
          winner = rule;
        }
      }
    }
    return !winner || winner.type === 'allow' || winner.path === '';
  }
}

export function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  return groups;
}

export class RobotsCache {
  constructor(fetchRobotsText, userAgent = 'site-download') {
    this.fetchRobotsText = fetchRobotsText;
    this.userAgent = userAgent;
    this.cache = new Map();
    this.records = new Map();
  }

  async decision(url) {
    const parsed = new URL(url);
    const origin = parsed.origin;
    let record = this.records.get(origin);
    if (!record) {
      record = await this.load(origin);
      this.records.set(origin, record);
      this.cache.set(origin, record.policy);
    }
    const allowed = record.policy.isAllowed(url, this.userAgent);
    return {
      allowed,
      origin,
      status: record.status,
      reason: allowed ? 'robots_allowed' : 'robots_disallowed'
    };
  }

  async load(origin) {
    try {
      const response = await this.fetchRobotsText(origin);
      if (response.status === 404 || response.status === 410) {
        return { origin, status: 'missing', policy: new RobotsPolicy('', origin), error: null };
      }
      if (response.status >= 200 && response.status < 300) {
        return { origin, status: 'loaded', policy: new RobotsPolicy(response.text, origin), error: null };
      }
      return { origin, status: `http_${response.status}`, policy: new RobotsPolicy('', origin), error: null };
    } catch (err) {
      return { origin, status: 'error', policy: new RobotsPolicy('', origin), error: err.message };
    }
  }

  summary() {
    return [...this.records.values()].map(({ origin, status, error }) => ({ origin, status, error }));
  }
}
