import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductVariantsAndLevelPricing1720960000000 implements MigrationInterface {
  name = 'AddProductVariantsAndLevelPricing1720960000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('products', 'variants'))) {
      await queryRunner.addColumn('products', new TableColumn({ name: 'variants', type: 'json', isNullable: true }));
    }
    if (!(await queryRunner.hasColumn('customer_level_rules', 'discount_rate'))) {
      await queryRunner.addColumn('customer_level_rules', new TableColumn({ name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0 }));
      await queryRunner.query("UPDATE customer_level_rules SET discount_rate = CASE code WHEN 'S' THEN 15 WHEN 'A' THEN 10 WHEN 'B' THEN 5 ELSE 0 END");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('customer_level_rules', 'discount_rate')) await queryRunner.dropColumn('customer_level_rules', 'discount_rate');
    if (await queryRunner.hasColumn('products', 'variants')) await queryRunner.dropColumn('products', 'variants');
  }
}
