import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UseCustomerLevelPricePercentage1722600000000 implements MigrationInterface {
  name = 'UseCustomerLevelPricePercentage1722600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('customer_level_rules', 'discount_rate'))) return;

    await queryRunner.changeColumn('customer_level_rules', 'discount_rate', new TableColumn({
      name: 'discount_rate', type: 'decimal', precision: 8, scale: 2, isNullable: true,
    }));
    // The former value represented the amount reduced (15 meant 15% off).
    // The new value represents the percentage of the original price (85 means 8.5折).
    await queryRunner.query('UPDATE customer_level_rules SET discount_rate = CASE WHEN discount_rate > 0 AND discount_rate < 100 THEN 100 - discount_rate ELSE NULL END');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('customer_level_rules', 'discount_rate'))) return;
    await queryRunner.query('UPDATE customer_level_rules SET discount_rate = CASE WHEN discount_rate IS NULL THEN 0 ELSE 100 - discount_rate END');
    await queryRunner.changeColumn('customer_level_rules', 'discount_rate', new TableColumn({
      name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0,
    }));
  }
}
