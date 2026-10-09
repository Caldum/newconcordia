// Fails when the JavaScript the app loads on first paint exceeds the budget (brotli-compressed).
// Initial JS = the entry chunk plus the chunks index.html preloads. Lazy route chunks are excluded.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const BUDGET_KB = 170;
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(join(distDir, 'index.html'), 'utf8');

const scripts = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(
  (match) => match[1],
);
if (scripts.length === 0)
  throw new Error('No JavaScript found in dist/index.html. Run the build first.');

let totalBytes = 0;
for (const file of new Set(scripts)) {
  const size = brotliCompressSync(readFileSync(join(distDir, file))).length;
  totalBytes += size;
  console.warn(`${file}: ${(size / 1024).toFixed(1)} kB`);
}

const totalKb = totalBytes / 1024;
console.warn(`Initial JavaScript: ${totalKb.toFixed(1)} kB of ${BUDGET_KB} kB (brotli)`);
if (totalKb > BUDGET_KB) {
  console.error(`Over budget by ${(totalKb - BUDGET_KB).toFixed(1)} kB.`);
  process.exit(1);
}
