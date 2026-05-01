import { buildMediaSuggestion } from './media-command.mjs';
import { isDirectMediaUrl, isPlatformMediaUrl } from './url-normalize.mjs';

export function classifyMedia(url) {
  if (isDirectMediaUrl(url)) return 'direct';
  if (isPlatformMediaUrl(url)) return 'platform';
  return 'unknown';
}

export function mediaSuggestion(url, outputDir) {
  if (!isPlatformMediaUrl(url)) return null;
  return buildMediaSuggestion(url, { outputDir });
}
