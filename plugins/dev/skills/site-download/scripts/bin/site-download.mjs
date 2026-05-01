#!/usr/bin/env node
import { parseCliArgs, usage } from '../src/config.mjs';
import { runAuthCrawl } from '../src/auth-crawl.mjs';
import { runSiteDownload } from '../src/crawler.mjs';

async function main() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = options.authCdpUrl
      ? await runAuthCrawl({
        url: options.url,
        out: options.out,
        authCdpUrl: options.authCdpUrl,
        limits: options.limits
      })
      : await runSiteDownload({
        url: options.url,
        out: options.out,
        limits: options.limits,
        mode: options.mode
      });
    if (options.json) {
      console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    } else {
      console.log(`Site download complete: ${result.outputRoot}`);
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (options?.json) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      console.error(message);
      console.error(usage());
    }
    process.exitCode = 1;
  }
}

await main();
