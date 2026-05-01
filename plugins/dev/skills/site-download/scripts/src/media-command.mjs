import path from 'node:path';
import { isPlatformMediaUrl } from './url-normalize.mjs';

const ALLOWED_DOWNLOADERS = new Set(['yt-dlp', 'youtube-dl']);
const FORBIDDEN_ARGS = [
  '--cookies',
  '--cookies-from-browser',
  '--add-header',
  '--no-check-certificate'
];

export function validateDownloaderExecutable(executable) {
  if (!ALLOWED_DOWNLOADERS.has(executable)) {
    throw new Error(`Unsupported media downloader executable: ${executable}`);
  }
  if (path.basename(executable) !== executable || executable.includes('\\') || executable.includes('/')) {
    throw new Error(`Downloader executable must be an allowlisted basename: ${executable}`);
  }
  return executable;
}

export function buildSuggestedDownloaderCommand(url, { outputDir = 'media', executable = 'yt-dlp' } = {}) {
  validateDownloaderExecutable(executable);
  const args = [
    '--no-playlist',
    '--paths',
    outputDir,
    '--output',
    '%(title).200B.%(ext)s',
    url
  ];
  for (const forbidden of FORBIDDEN_ARGS) {
    if (args.includes(forbidden)) {
      throw new Error(`Forbidden downloader argument generated: ${forbidden}`);
    }
  }
  return {
    executable,
    args,
    options: { shell: false },
    executes: false,
    reason: 'suggested_downloader'
  };
}

export function buildMediaSuggestion(url, options = {}) {
  if (!isPlatformMediaUrl(url)) return null;
  return buildSuggestedDownloaderCommand(url, options);
}
