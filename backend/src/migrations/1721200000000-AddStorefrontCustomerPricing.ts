import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStorefrontCustomerPricing1721200000000 implements MigrationInterface {
  name = 'AddStorefrontCustomerPricing1721200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('customers', 'phone'))) await queryRunner.addColumn('customers', new TableColumn({ name: 'phone', type: 'varchar', length: '50', isNullable: true }));
    if (!(await queryRunner.hasColumn('customers', 'phone_normalized'))) await queryRunner.addColumn('customers', new TableColumn({ name: 'phone_normalized', type: 'varchar', length: '50', isNullable: true }));
    if (!(await queryRunner.hasColumn('customers', 'password_hash'))) await queryRunner.addColumn('customers', new TableColumn({ name: 'password_hash', type: 'varchar', length: '255', isNullable: true }));
    if (!(await queryRunner.hasColumn('customers', 'status'))) await queryRunner.addColumn('customers', new TableColumn({ name: 'status', type: 'varchar', length: '20', default: "'active'" }));
    await queryRunner.query('CREATE UNIQUE INDEX `uq_customers_site_phone` ON `customers` (`site_id`, `phone_normalized`)').catch(() => undefined);
    if (!(await queryRunner.hasColumn('products', 'guest_price'))) await queryRunner.addColumn('products', new TableColumn({ name: 'guest_price', type: 'decimal', precision: 14, scale: 2, isNullable: true }));
    if (!(await queryRunner.hasColumn('products', 'level_prices'))) await queryRunner.addColumn('products', new TableColumn({ name: 'level_prices', type: 'json', isNullable: true }));
    if (!(await queryRunner.hasColumn('sites', 'guest_price_mode'))) await queryRunner.addColumn('sites', new TableColumn({ name: 'guest_price_mode', type: 'varchar', length: '20', default: "'base'" }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('sites', 'guest_price_mode')) await queryRunner.dropColumn('sites', 'guest_price_mode');
    if (await queryRunner.hasColumn('products', 'level_prices')) await queryRunner.dropColumn('products', 'level_prices');
    if (await queryRunner.hasColumn('products', 'guest_price')) await queryRunner.dropColumn('products', 'guest_price');
    await queryRunner.query('DROP INDEX `uq_customers_site_phone` ON `customers`').catch(() => undefined);
    for (const column of ['status', 'password_hash', 'phone_normalized', 'phone']) if (await queryRunner.hasColumn('customers', column)) await queryRunner.dropColumn('customers', column);
  }
}
