export const MANIFEST_SCHEMA_VERSION = 1;
export const CORPUS_SCHEMA_VERSION = 1;

export function assertManifestShape(manifest) {
  for (const field of ['schemaVersion', 'generatedAt', 'mode', 'startUrl', 'outputRoot', 'limits', 'counts', 'pages', 'assets', 'media', 'robots', 'skips', 'errors', 'privacy', 'toolVersions']) {
    if (!(field in manifest)) throw new Error(`manifest missing ${field}`);
  }
  if (!Array.isArray(manifest.pages) || !Array.isArray(manifest.assets) || !Array.isArray(manifest.media)) {
    throw new Error('manifest pages/assets/media must be arrays');
  }
  return true;
}

export function assertCorpusRecordShape(record) {
  for (const field of ['schemaVersion', 'type', 'url', 'normalizedUrl', 'title', 'text', 'markdownPath', 'staticHtmlPath', 'browserRenderedHtmlPath', 'screenshotPath', 'depth', 'fetchedAt', 'contentHash', 'sourceMode', 'metadata']) {
    if (!(field in record)) throw new Error(`corpus record missing ${field}`);
  }
  if (record.type !== 'page') throw new Error('corpus record type must be page');
  return true;
}
