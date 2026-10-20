import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const manifest = JSON.parse(readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8'));
const entries = Object.entries(manifest);
const findChunk = (source) => entries.find(([key]) => key === source)?.[1];
const app = entries.find(([, chunk]) => chunk.isEntry)?.[1];
const login = findChunk('src/pages/Login/index.tsx');
const dashboard = findChunk('src/pages/Dashboard/index.tsx');

if (!app || !login || !dashboard) {
  throw new Error('Vite manifest is missing the application, login, or dashboard entry');
}

const collectStaticFiles = (root) => {
  const files = new Set();
  const sources = new Set();
  const visit = (chunk) => {
    if (!chunk || files.has(chunk.file)) return;
    files.add(chunk.file);
    if (chunk.src) sources.add(chunk.src);
    for (const imported of chunk.imports || []) visit(manifest[imported]);
  };
  visit(root);
  return { files, sources };
};
const gzipBytes = (file) => gzipSync(readFileSync(join(distDir, file))).byteLength;
const report = (label, graph, budgetKiB) => {
  const rows = [...graph.files].map((file) => ({ name: basename(file), gzipBytes: gzipBytes(file) }));
  const total = rows.reduce((sum, row) => sum + row.gzipBytes, 0);
  for (const row of rows.sort((left, right) => right.gzipBytes - left.gzipBytes)) {
    console.log(`${label} ${row.name} ${(row.gzipBytes / 1024).toFixed(1)} KiB gzip`);
  }
  console.log(`${label} total ${(total / 1024).toFixed(1)} KiB gzip (budget ${budgetKiB.toFixed(1)} KiB)`);
  if (total > budgetKiB * 1024) {
    throw new Error(`${label} exceeds budget by ${((total - budgetKiB * 1024) / 1024).toFixed(1)} KiB`);
  }
  return total;
};

const appGraph = collectStaticFiles(app);
const loginGraph = collectStaticFiles(login);
const dashboardGraph = collectStaticFiles(dashboard);
const loginFirstLoad = { files: new Set([...appGraph.files, ...loginGraph.files]), sources: new Set([...appGraph.sources, ...loginGraph.sources]) };
const dashboardIncrement = { files: new Set([...dashboardGraph.files].filter((file) => !appGraph.files.has(file))), sources: dashboardGraph.sources };

report('login-first-load', loginFirstLoad, 200);
report('dashboard-increment', dashboardIncrement, 250);

const forbiddenLoginSources = [
  'src/components/shared/ProductGallery.tsx',
  'src/components/shared/RichTextEditor.tsx',
  'src/pages/SiteEditor/index.tsx',
  'src/pages/Dashboard/OrderTrendChart.tsx',
  'src/pages/Dashboard/CategoryDonutChart.tsx',
];
const leaked = forbiddenLoginSources.filter((source) => loginFirstLoad.sources.has(source));
if (leaked.length) throw new Error(`Login first load contains route-only modules: ${leaked.join(', ')}`);

if (dashboardGraph.sources.has('src/components/shared/ProductGallery.tsx')) {
  throw new Error('Dashboard initial load must not contain ProductGallery');
}
