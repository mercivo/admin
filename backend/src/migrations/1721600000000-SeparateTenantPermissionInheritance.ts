import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SeparateTenantPermissionInheritance1721600000000 implements MigrationInterface {
  name = 'SeparateTenantPermissionInheritance1721600000000';

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn('tenants', 'permissions_customized'))) {
      await queryRunner.addColumn('tenants', new TableColumn({
        name: 'permissions_customized',
        type: 'boolean',
        default: false,
      }));
    }
    await queryRunner.query(`
      UPDATE tenants t
      INNER JOIN plans p ON p.code = t.plan
      SET t.permissions = p.permissions
      WHERE t.permissions_customized = 0
    `);
  }

  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasColumn('tenants', 'permissions_customized')) {
      await queryRunner.dropColumn('tenants', 'permissions_customized');
    }
  }
}
