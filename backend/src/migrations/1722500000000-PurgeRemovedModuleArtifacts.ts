import { MigrationInterface, QueryRunner } from 'typeorm';
import { sanitizeRemovedModuleArtifacts } from '../common/sanitize-removed-module-artifacts';

const ACTIVE_PERMISSIONS = new Set([
  'menu.dashboard', 'page.dashboard',
  'group.products', 'menu.products', 'page.products', 'product.create', 'product.edit', 'product.delete', 'product.publish',
  'menu.product-categories', 'page.product-categories', 'product-category.manage',
  'group.sales', 'menu.customers', 'page.customers', 'customer.create', 'customer.edit', 'customer.delete', 'customer.level.manage',
  'group.site', 'menu.site', 'page.site.editor', 'site.edit', 'site.publish', 'page.site.settings', 'page.site.seo', 'settings.site', 'settings.seo', 'site.domain',
  'group.system', 'menu.settings', 'page.settings.account', 'settings.account', 'menu.team', 'page.settings.team', 'settings.team',
]);

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

export class PurgeRemovedModuleArtifacts1722500000000 implements MigrationInterface {
  name = 'PurgeRemovedModuleArtifacts1722500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'chat_messages', 'chat_sessions', 'outreach_campaigns', 'opportunities', 'leads',
      'knowledge_files', 'agent_presets', 'agents', 'dict_entries', 'dict_types',
    ]) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true, true, true);
    }
    for (const [table, column] of [['sites', 'translation_agent_id'], ['tenants', 'max_agents'], ['plans', 'max_agents']] as const) {
      if (await queryRunner.hasTable(table) && await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
    }

    for (const table of ['plans', 'tenants', 'users', 'team_members']) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, 'permissions'))) continue;
      const rows: Array<{ id: string; permissions: unknown }> = await queryRunner.query(
        `SELECT \`id\`, \`permissions\` FROM \`${table}\` WHERE \`permissions\` IS NOT NULL`,
      );
      for (const row of rows) {
        const permissions = parseJson(row.permissions);
        const next = Array.isArray(permissions)
          ? [...new Set(permissions.filter((permission): permission is string => typeof permission === 'string' && ACTIVE_PERMISSIONS.has(permission)))]
          : [];
        await queryRunner.query(`UPDATE \`${table}\` SET \`permissions\` = ? WHERE \`id\` = ?`, [JSON.stringify(next), row.id]);
      }
    }

    if (await queryRunner.hasTable('app_configs')) {
      const rows: Array<{ key: string; value: unknown }> = await queryRunner.query(
        "SELECT `key`, `value` FROM `app_configs` WHERE `key` = 'siteEditor' OR `key` LIKE '%:siteEditor'",
      );
      for (const row of rows) {
        const next = sanitizeRemovedModuleArtifacts(parseJson(row.value));
        await queryRunner.query('UPDATE `app_configs` SET `value` = ? WHERE `key` = ?', [JSON.stringify(next), row.key]);
      }
    }

    if (await queryRunner.hasTable('site_versions') && await queryRunner.hasColumn('site_versions', 'snapshot')) {
      const rows: Array<{ id: string; snapshot: unknown }> = await queryRunner.query('SELECT `id`, `snapshot` FROM `site_versions`');
      for (const row of rows) {
        const next = sanitizeRemovedModuleArtifacts(parseJson(row.snapshot));
        await queryRunner.query('UPDATE `site_versions` SET `snapshot` = ? WHERE `id` = ?', [JSON.stringify(next), row.id]);
      }
    }
  }

  async down(): Promise<void> {
    throw new Error('Purging removed module artifacts is intentionally irreversible');
  }
}
