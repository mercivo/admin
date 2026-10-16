import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const currentVersionFile = resolve('deploy', 'releases', 'CURRENT');
const requestedVersion = process.argv[2];
const version = requestedVersion === '--current'
  ? (existsSync(currentVersionFile) ? readFileSync(currentVersionFile, 'utf8').trim() : '')
  : requestedVersion;
if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/validate-release.mjs vMAJOR.MINOR.PATCH|--current');
  process.exit(1);
}

const root = resolve('deploy', 'releases', version);
const required = ['release.yaml', 'CHANGELOG.md', 'ROLLOUT.md', 'ROLLBACK.md', 'sql/README.md'];
const errors = [];
for (const file of required) {
  const path = join(root, file);
  if (!existsSync(path)) errors.push(`Missing ${file}`);
  else if (!readFileSync(path, 'utf8').trim()) errors.push(`Empty ${file}`);
}

if (existsSync(join(root, 'release.yaml'))) {
  const manifest = readFileSync(join(root, 'release.yaml'), 'utf8');
  if (!manifest.includes(`version: ${version}`)) errors.push('release.yaml version does not match directory');
  if (/TEMPLATE|YYYY-MM-DD/.test(manifest)) errors.push('release.yaml still contains template markers');
  for (const key of ['releaseType:', 'releaseDate:', 'owner:', 'database:', 'redis:', 'storage:', 'rollback:']) {
    if (!manifest.includes(key)) errors.push(`release.yaml missing ${key}`);
  }
}

if (existsSync(root)) {
  for (const file of readdirSync(join(root, 'sql'), { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.sql')) continue;
    if (!/^\d{3}-[a-z0-9-]+\.sql$/.test(file.name)) errors.push(`Invalid SQL filename: ${file.name}`);
    const sql = readFileSync(join(root, 'sql', file.name), 'utf8');
    if (!/version:/i.test(sql) || !/purpose:/i.test(sql) || !/idempoten/i.test(sql) || !/verif/i.test(sql)) {
      errors.push(`${file.name} must document version, purpose, idempotency, and verification`);
    }
    const executable = sql.replace(/--.*$/gm, '').trim();
    if (/\b(update|delete)\b/i.test(executable) && !/\bwhere\b/i.test(executable)) {
      errors.push(`${file.name} contains UPDATE/DELETE without WHERE`);
    }
    if (/\b(drop\s+(database|table)|truncate\s+table)\b/i.test(executable)) {
      errors.push(`${file.name} contains prohibited destructive DDL`);
    }
  }
}

if (errors.length) {
  console.error(`Release ${version} validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release ${version} package is valid.`);
