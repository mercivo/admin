import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyCustomerPricing1721300000000 implements MigrationInterface {
  name = 'SimplifyCustomerPricing1721300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE `sites` SET `guest_price_mode` = 'base' WHERE `guest_price_mode` NOT IN ('base', 'hidden')");
    if (await queryRunner.hasColumn('customers', 'password_hash')) await queryRunner.dropColumn('customers', 'password_hash');
    if (await queryRunner.hasColumn('products', 'guest_price')) await queryRunner.dropColumn('products', 'guest_price');
  }

  async down(): Promise<void> {
    // Passwords and custom guest prices are intentionally not recreated because the simplified model does not maintain them.
  }
}
