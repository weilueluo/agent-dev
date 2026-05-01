import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestedDownloaderCommand, validateDownloaderExecutable } from '../src/media-command.mjs';

test('media downloader suggestion is an arg array with shell disabled', () => {
  const tricky = 'https://www.youtube.com/watch?v=a;b&x=1|whoami `pwsh` "quote"';
  const command = buildSuggestedDownloaderCommand(tricky, { outputDir: 'media', executable: 'yt-dlp' });

  assert.equal(command.executable, 'yt-dlp');
  assert.equal(command.options.shell, false);
  assert.equal(command.executes, false);
  assert.equal(command.args.at(-1), tricky);
  assert.equal(command.args.includes('--cookies'), false);
  assert.equal(command.args.includes('--cookies-from-browser'), false);
  assert.equal(command.args.includes('--no-check-certificate'), false);
});

test('media downloader executable is allowlisted by basename', () => {
  assert.equal(validateDownloaderExecutable('yt-dlp'), 'yt-dlp');
  assert.equal(validateDownloaderExecutable('youtube-dl'), 'youtube-dl');
  assert.throws(() => validateDownloaderExecutable('powershell'), /Unsupported/);
  assert.throws(() => validateDownloaderExecutable('C:\\tools\\yt-dlp.exe'), /Unsupported|basename/);
  assert.throws(() => validateDownloaderExecutable('yt-dlp;whoami'), /Unsupported/);
});
