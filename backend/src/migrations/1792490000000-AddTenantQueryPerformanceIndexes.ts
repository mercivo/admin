import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantQueryPerformanceIndexes1792490000000 implements MigrationInterface {
  name = 'AddTenantQueryPerformanceIndexes1792490000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_customers_site_created` ON `customers` (`site_id`, `created_at`)');
    await queryRunner.query('CREATE INDEX `IDX_products_site_status_created` ON `products` (`site_id`, `status`, `created_at`)');
    await queryRunner.query('CREATE INDEX `IDX_sales_orders_site_status_created` ON `sales_orders` (`site_id`, `status`, `created_at`)');
    await queryRunner.query('CREATE INDEX `IDX_purchase_orders_site_status_created` ON `purchase_orders` (`site_id`, `status`, `created_at`)');
    await queryRunner.query('CREATE INDEX `IDX_inventory_balances_site_warehouse_product` ON `inventory_balances` (`site_id`, `warehouse_id`, `product_id`)');
    await queryRunner.query('CREATE INDEX `IDX_finance_transactions_site_status_created` ON `finance_transactions` (`site_id`, `status`, `created_at`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_finance_transactions_site_status_created` ON `finance_transactions`');
    await queryRunner.query('DROP INDEX `IDX_inventory_balances_site_warehouse_product` ON `inventory_balances`');
    await queryRunner.query('DROP INDEX `IDX_purchase_orders_site_status_created` ON `purchase_orders`');
    await queryRunner.query('DROP INDEX `IDX_sales_orders_site_status_created` ON `sales_orders`');
    await queryRunner.query('DROP INDEX `IDX_products_site_status_created` ON `products`');
    await queryRunner.query('DROP INDEX `IDX_customers_site_created` ON `customers`');
  }
}
