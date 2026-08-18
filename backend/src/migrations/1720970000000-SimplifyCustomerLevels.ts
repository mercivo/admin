import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SimplifyCustomerLevels1720970000000 implements MigrationInterface {
  name = 'SimplifyCustomerLevels1720970000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE customers MODIFY level varchar(36) NOT NULL DEFAULT ''");
    if (!(await queryRunner.hasColumn('customer_level_rules', 'note'))) {
      await queryRunner.addColumn('customer_level_rules', new TableColumn({ name: 'note', type: 'varchar', length: '500', default: "''" }));
    }
    await queryRunner.query("UPDATE customers SET level = ''");
    await queryRunner.query('DELETE FROM customer_level_rules');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('customer_level_rules', 'note')) await queryRunner.dropColumn('customer_level_rules', 'note');
    await queryRunner.query("ALTER TABLE customers MODIFY level varchar(2) NOT NULL DEFAULT 'C'");
  }
}
