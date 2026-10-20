import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const html = readFileSync(join(distDir, 'index.html'), 'utf8');
const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g)].map((match) => match[1]);
const uniqueAssets = [...new Set(assetPaths)];
const rows = uniqueAssets.map((assetPath) => {
  const contents = readFileSync(join(distDir, assetPath));
  return { name: basename(assetPath), gzipBytes: gzipSync(contents).byteLength };
});
const totalGzipBytes = rows.reduce((sum, row) => sum + row.gzipBytes, 0);
const budgetBytes = 400 * 1024;

for (const row of rows) console.log(`initial-js ${row.name} ${(row.gzipBytes / 1024).toFixed(1)} KiB gzip`);
console.log(`initial-js total ${(totalGzipBytes / 1024).toFixed(1)} KiB gzip (budget 400.0 KiB)`);

if (totalGzipBytes > budgetBytes) {
  throw new Error(`Initial JavaScript exceeds budget by ${((totalGzipBytes - budgetBytes) / 1024).toFixed(1)} KiB gzip`);
}

if (rows.some((row) => row.name.includes('ProductGallery'))) {
  throw new Error('ProductGallery must not be preloaded by the application shell');
}
