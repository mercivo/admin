import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeProductCategoryDictionary1720939000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO dict_types (id, tenant_id, site_id, type_id, label, icon, created_at, updated_at)
      SELECT UUID(), sites.tenant_id, sites.id, 'category', '商品分类', '📦', NOW(), NOW()
      FROM sites
      WHERE NOT EXISTS (
        SELECT 1 FROM dict_types WHERE dict_types.site_id = sites.id AND dict_types.type_id = 'category'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM dict_types WHERE type_id = 'category'");
  }
}
