import { PolicyCdpClient } from './auth-policy.mjs';

export async function connectPolicyCdpClient(cdpUrl) {
  if (typeof WebSocket !== 'function') {
    throw new Error('CDP mode requires a Node runtime with global WebSocket support or a mocked CDP client in tests. Public mode does not require CDP.');
  }
  const version = await fetchJson(new URL('/json/version', cdpUrl).href);
  const wsUrl = version.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error('CDP endpoint did not expose webSocketDebuggerUrl');
  const transport = await WebSocketTransport.connect(wsUrl);
  return new PolicyCdpClient(transport);
}

export async function connectPageCdpClient(cdpUrl, pageUrl = 'about:blank') {
  if (typeof WebSocket !== 'function') {
    throw new Error('CDP mode requires a Node runtime with global WebSocket support or a mocked CDP client in tests. Public mode does not require CDP.');
  }
  const target = await openPageTarget(cdpUrl, pageUrl);
  if (!target.webSocketDebuggerUrl) {
    throw new Error('CDP page target did not expose webSocketDebuggerUrl');
  }
  const transport = await WebSocketTransport.connect(target.webSocketDebuggerUrl);
  return new PolicyCdpClient(transport);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDP endpoint returned ${res.status}`);
  return res.json();
}

async function openPageTarget(cdpUrl, pageUrl) {
  const endpoint = new URL('/json/new', cdpUrl);
  endpoint.search = encodeURIComponent(pageUrl);
  let res = await fetch(endpoint, { method: 'PUT' });
  if (!res.ok) {
    res = await fetch(endpoint);
  }
  if (!res.ok) {
    const targets = await fetchJson(new URL('/json/list', cdpUrl).href);
    const page = targets.find((target) => target.type === 'page');
    if (page) return page;
    throw new Error(`CDP could not create or find a page target (${res.status})`);
  }
  return res.json();
}

class WebSocketTransport {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.onmessage = (event) => this.handleMessage(event.data);
  }

  static connect(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.onopen = () => resolve(new WebSocketTransport(socket));
      socket.onerror = () => reject(new Error('Failed to connect to CDP WebSocket'));
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);
    if (!message.id || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || 'CDP error'));
    else pending.resolve(message.result || {});
  }
}
