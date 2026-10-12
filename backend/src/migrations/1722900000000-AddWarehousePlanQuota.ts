import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWarehousePlanQuota1722900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('plans', 'max_warehouses'))) {
      await queryRunner.addColumn('plans', new TableColumn({ name: 'max_warehouses', type: 'int', default: 1 }));
    }
    if (!(await queryRunner.hasColumn('tenants', 'max_warehouses'))) {
      await queryRunner.addColumn('tenants', new TableColumn({ name: 'max_warehouses', type: 'int', default: 1 }));
    }
    await queryRunner.query("UPDATE `plans` SET `max_warehouses` = 1 WHERE `code` = 'trial'");
    await queryRunner.query("UPDATE `tenants` SET `max_warehouses` = 1 WHERE `plan` = 'trial'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('tenants', 'max_warehouses')) await queryRunner.dropColumn('tenants', 'max_warehouses');
    if (await queryRunner.hasColumn('plans', 'max_warehouses')) await queryRunner.dropColumn('plans', 'max_warehouses');
  }
}
