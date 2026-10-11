import { MigrationInterface, QueryRunner } from 'typeorm';

const PAGE_BY_MENU: Record<string, string[]> = {
  'menu.dashboard': ['page.dashboard'],
  'menu.products': ['page.products'],
  'menu.customers': ['page.customers'],
  'menu.site': ['page.site.editor'],
  'menu.site.config': ['page.site.settings', 'page.site.seo'],
  'menu.settings': ['page.settings.account'],
  'menu.team': ['page.settings.team'],
  'menu.product-categories': ['page.product-categories'],
};

export class AddPagePermissionLevel1722300000000 implements MigrationInterface {
  name = 'AddPagePermissionLevel1722300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['plans', 'tenants', 'users', 'team_members']) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, 'permissions'))) continue;
      const rows: Array<{ id: string; permissions: string[] | string | null }> = await queryRunner.query(`SELECT \`id\`, \`permissions\` FROM \`${table}\` WHERE \`permissions\` IS NOT NULL`);
      for (const row of rows) {
        const permissions = Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]');
        const selected = new Set<string>(permissions);
        for (const [menuKey, pages] of Object.entries(PAGE_BY_MENU)) {
          if (selected.has(menuKey) && !pages.some(page => selected.has(page))) pages.forEach(page => selected.add(page));
        }
        if (selected.size !== permissions.length) {
          await queryRunner.query(`UPDATE \`${table}\` SET \`permissions\` = ? WHERE \`id\` = ?`, [JSON.stringify([...selected]), row.id]);
        }
      }
    }
  }

  async down(): Promise<void> {
    throw new Error('Page permission hierarchy migration is intentionally irreversible');
  }
}
