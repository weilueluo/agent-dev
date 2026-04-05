/**
 * Decrypt WeChat desktop database files using pywxdump.
 * Requires: pip install pywxdump, and WeChat desktop running (for key extraction).
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getDataDir } from './db.mjs';

const DECRYPTED_DIR = join(getDataDir(), 'decrypted_db');

export function getDecryptedDir() {
  return DECRYPTED_DIR;
}

/**
 * Get WeChat info (key, data dir) from the running WeChat process via pywxdump.
 */
export function getWxInfo() {
  try {
    const output = execSync(
      'python -c "from pywxdump import get_wx_info; import json; print(json.dumps(get_wx_info(), default=str))"',
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(output.trim());
  } catch (err) {
    throw new Error(
      'Failed to get WeChat info. Ensure WeChat desktop is running and pywxdump is installed (pip install pywxdump).'
    );
  }
}

/**
 * Decrypt WeChat DB files by writing and running a Python script.
 */
export function autoDecrypt() {
  const infos = getWxInfo();
  if (!infos || infos.length === 0) {
    throw new Error('No running WeChat instance found');
  }

  const info = infos[0];
  if (!info.key) {
    throw new Error('Could not extract decryption key from WeChat process');
  }

  mkdirSync(DECRYPTED_DIR, { recursive: true });

  console.error(`  WeChat: wxid=${info.wxid}, dir=${info.wx_dir}`);
  console.error(`  Decrypting to ${DECRYPTED_DIR}...`);

  const tempScript = join(getDataDir(), '_decrypt_run.py');
  const pyCode = `
import json, os
from pywxdump import decrypt

key = "${info.key}"
wx_dir = r"${info.wx_dir}"
out_dir = r"${DECRYPTED_DIR}"
os.makedirs(out_dir, exist_ok=True)

targets = []
msg_dir = os.path.join(wx_dir, "Msg", "Multi")
if os.path.isdir(msg_dir):
    for f in sorted(os.listdir(msg_dir)):
        if f.upper().startswith("MSG") and f.endswith(".db"):
            targets.append((os.path.join(msg_dir, f), os.path.join(out_dir, f)))

micro = os.path.join(wx_dir, "Msg", "MicroMsg.db")
if os.path.isfile(micro):
    targets.append((micro, os.path.join(out_dir, "MicroMsg.db")))

results = []
for src, dst in targets:
    name = os.path.basename(src)
    try:
        ok = decrypt(key, src, dst)
        results.append({"file": name, "status": "ok" if ok else "failed", "path": dst if ok else None})
    except Exception as e:
        results.append({"file": name, "status": "error", "error": str(e)})

print(json.dumps(results))
`.trim();

  writeFileSync(tempScript, pyCode, 'utf-8');

  try {
    const output = execSync(`python "${tempScript}"`, {
      encoding: 'utf-8',
      timeout: 600000,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    const results = JSON.parse(output.trim());
    return { decryptedDir: DECRYPTED_DIR, wxDir: info.wx_dir, results };
  } catch (err) {
    throw new Error(`Decryption failed: ${err.stderr || err.message}`);
  } finally {
    try { unlinkSync(tempScript); } catch { /* ignore */ }
  }
}

