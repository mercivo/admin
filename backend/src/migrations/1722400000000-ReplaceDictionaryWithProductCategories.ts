import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const PERMISSION_RENAMES: Record<string, string> = {
  'menu.dictionary': 'menu.product-categories',
  'page.dictionary': 'page.product-categories',
  'dictionary.manage': 'product-category.manage',
};

export class ReplaceDictionaryWithProductCategories1722400000000 implements MigrationInterface {
  name = 'ReplaceDictionaryWithProductCategories1722400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('product_categories'))) {
      await queryRunner.createTable(new Table({ name: 'product_categories', columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'tenant_id', type: 'varchar', length: '36', default: "''" },
        { name: 'site_id', type: 'varchar', length: '36', default: "''" },
        { name: 'code', type: 'varchar', length: '100' },
        { name: 'label', type: 'varchar', length: '255' },
        { name: 'sort', type: 'int', default: 0 },
        { name: 'status', type: 'varchar', length: '20', default: "'enabled'" },
        { name: 'remark', type: 'varchar', length: '500', default: "''" },
        { name: 'parent_code', type: 'varchar', length: '100', isNullable: true },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ] }));
      await queryRunner.createIndex('product_categories', new TableIndex({ name: 'uq_product_categories_site_code', columnNames: ['site_id', 'code'], isUnique: true }));
    }
    if (await queryRunner.hasTable('dict_entries')) {
      await queryRunner.query(`INSERT IGNORE INTO product_categories (id, tenant_id, site_id, code, label, sort, status, remark, parent_code, created_at, updated_at)
        SELECT id, tenant_id, site_id, code, label, sort, status, remark, parent_code, created_at, updated_at FROM dict_entries WHERE type_id = 'category'`);
      await queryRunner.dropTable('dict_entries', true);
    }
    if (await queryRunner.hasTable('dict_types')) await queryRunner.dropTable('dict_types', true);
    await this.renamePermissions(queryRunner, PERMISSION_RENAMES);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Removing the generic dictionary module is intentionally irreversible');
  }

  private async renamePermissions(queryRunner: QueryRunner, replacements: Record<string, string>) {
    for (const table of ['plans', 'tenants', 'users', 'team_members']) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, 'permissions'))) continue;
      const rows: Array<{ id: string; permissions: string[] | string | null }> = await queryRunner.query(`SELECT \`id\`, \`permissions\` FROM \`${table}\` WHERE \`permissions\` IS NOT NULL`);
      for (const row of rows) {
        const permissions: string[] = Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]');
        const next = [...new Set(permissions.map((permission: string) => replacements[permission] || permission))];
        await queryRunner.query(`UPDATE \`${table}\` SET \`permissions\` = ? WHERE \`id\` = ?`, [JSON.stringify(next), row.id]);
      }
    }
  }
}
