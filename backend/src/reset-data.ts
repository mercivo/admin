import 'reflect-metadata';
import { Storage } from '@google-cloud/storage';
import dataSource from './config/data-source';

const environment = process.env.RESET_ENVIRONMENT?.trim();
const confirmation = process.env.RESET_DATA_CONFIRM?.trim();
const systemAdminUsername = process.env.SYSTEM_ADMIN_USERNAME?.trim() || 'admin';
const objectPrefix = process.env.GCS_OBJECT_PREFIX?.trim().replace(/^\/+|\/+$/g, '');
const storageScope = process.env.RESET_STORAGE_SCOPE?.trim() || 'prefix';
const storageConfirmation = process.env.RESET_STORAGE_CONFIRM?.trim();

if (!environment || !['local', 'production'].includes(environment)) {
  throw new Error('RESET_ENVIRONMENT must be local or production');
}
if (confirmation !== `mercivo-admin:${environment}:DELETE_BUSINESS_DATA`) {
  throw new Error('RESET_DATA_CONFIRM does not match the selected environment');
}
if (objectPrefix !== environment) {
  throw new Error(`GCS_OBJECT_PREFIX must equal RESET_ENVIRONMENT (${environment})`);
}
if (!['prefix', 'all'].includes(storageScope)) {
  throw new Error('RESET_STORAGE_SCOPE must be prefix or all');
}
if (storageScope === 'all' && storageConfirmation !== `mercivo-admin:${environment}:DELETE_ALL_STORAGE_OBJECTS`) {
  throw new Error('RESET_STORAGE_CONFIRM is required when clearing entire buckets');
}

const preservedTables = new Set(['migrations', 'plans']);

async function resetDatabase(): Promise<void> {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    const admins = await runner.query(
      'SELECT `id` FROM `users` WHERE `username` = ? AND `role` = ? AND `status` = ? LIMIT 2',
      [systemAdminUsername, 'system_admin', 'active'],
    );
    if (admins.length !== 1) throw new Error(`Expected exactly one active system administrator named ${systemAdminUsername}`);

    const tables: Array<{ TABLE_NAME: string }> = await runner.query(
      'SELECT `TABLE_NAME` FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    await runner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { TABLE_NAME: table } of tables) {
      if (preservedTables.has(table)) continue;
      if (table === 'users') {
        await runner.query('DELETE FROM `users` WHERE `id` <> ?', [admins[0].id]);
        continue;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error(`Unsafe table name: ${table}`);
      await runner.query(`DELETE FROM \`${table}\``);
      try { await runner.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`); } catch { /* UUID-only table */ }
    }
    await runner.query('SET FOREIGN_KEY_CHECKS = 1');

    const remainingUsers = await runner.query('SELECT `username`, `role`, `status` FROM `users`');
    if (remainingUsers.length !== 1 || remainingUsers[0].username !== systemAdminUsername || remainingUsers[0].role !== 'system_admin') {
      throw new Error('Post-reset administrator invariant failed');
    }
    console.log(`Database reset complete; retained system administrator: ${systemAdminUsername}`);
  } finally {
    try { await runner.query('SET FOREIGN_KEY_CHECKS = 1'); } catch { /* connection may already be closed */ }
    await runner.release();
    await dataSource.destroy();
  }
}

function configuredStorage(): { storage: Storage; buckets: string[] } {
  const projectId = process.env.GCS_PROJECT_ID?.trim();
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const buckets = [process.env.GCS_BUCKET?.trim(), process.env.GCS_PRIVATE_BUCKET?.trim()].filter(Boolean) as string[];
  if (!projectId || buckets.length !== 2) throw new Error('Both public and private GCS buckets must be configured');
  if (new Set(buckets).size !== 2) throw new Error('Public and private GCS buckets must be different');

  const storage = new Storage({ projectId, ...(keyFilename ? { keyFilename } : {}) });
  return { storage, buckets: [...new Set(buckets)] };
}

async function preflightStorage(): Promise<void> {
  const { storage, buckets } = configuredStorage();
  for (const bucketName of buckets) await storage.bucket(bucketName).getMetadata();
  console.log(`Storage preflight complete for ${buckets.length} buckets`);
}

async function resetStorage(): Promise<void> {
  const { storage, buckets } = configuredStorage();
  for (const bucketName of buckets) {
    const options = storageScope === 'all' ? { force: true } : { prefix: `${objectPrefix}/`, force: true };
    await storage.bucket(bucketName).deleteFiles(options);
    console.log(storageScope === 'all' ? `Cleared all objects in gs://${bucketName}/` : `Cleared gs://${bucketName}/${objectPrefix}/`);
  }
}

async function main(): Promise<void> {
  await preflightStorage();
  await resetDatabase();
  await resetStorage();
}

main().catch(error => {
  console.error('Data reset failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
