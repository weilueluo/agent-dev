import crypto from 'node:crypto';
import path from 'node:path';
import { extensionForUrl, normalizeUrl, safeFilenameSegment } from './url-normalize.mjs';

export function hashForUrl(url) {
  return crypto.createHash('sha256').update(normalizeUrl(url)).digest('hex').slice(0, 10);
}

export function contentHash(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

export function localPathForUrl(url, outputRoot, section, fallbackExt = '') {
  const normalized = normalizeUrl(url);
  const parsed = new URL(normalized);
  const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => safeFilenameSegment(decodeURIComponent(segment), 'path'));
  let filename = segments.pop() || 'index';
  let ext = extensionForUrl(normalized);
  if (!ext && fallbackExt) {
    ext = fallbackExt.startsWith('.') ? fallbackExt : `.${fallbackExt}`;
  }
  if (ext && !filename.toLowerCase().endsWith(ext.toLowerCase())) {
    filename = `${filename}${ext}`;
  }
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const suffix = dot > 0 ? filename.slice(dot) : '';
  filename = `${safeFilenameSegment(stem, 'index')}-${hashForUrl(normalized)}${suffix}`;
  const relative = path.join(section, safeFilenameSegment(parsed.hostname, 'host'), ...segments, filename);
  const absolute = path.resolve(outputRoot, relative);
  ensureInside(outputRoot, absolute);
  return {
    absolute,
    relative: path.relative(outputRoot, absolute)
  };
}

export function ensureInside(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const rel = path.relative(resolvedRoot, resolvedCandidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside output root: ${candidate}`);
  }
}
