import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlansAndSubscriptions1721030000000 implements MigrationInterface {
  name = 'AddPlansAndSubscriptions1721030000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('tenants', 'permissions'))) await queryRunner.query('ALTER TABLE `tenants` ADD `permissions` json NULL');
    if (!(await queryRunner.hasTable('plans'))) await queryRunner.query("CREATE TABLE `plans` (`id` varchar(36) NOT NULL, `code` varchar(30) NOT NULL, `name` varchar(80) NOT NULL, `price` decimal(10,2) NOT NULL DEFAULT 0, `currency` varchar(10) NOT NULL DEFAULT 'CNY', `billing_cycle` varchar(20) NOT NULL DEFAULT 'month', `description` text NULL, `max_products` int NOT NULL DEFAULT 100, `max_agents` int NOT NULL DEFAULT 2, `max_sites` int NOT NULL DEFAULT 1, `features` json NULL, `permissions` json NULL, `enabled` tinyint NOT NULL DEFAULT 1, `sort_order` int NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_plans_code` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('subscription_orders'))) await queryRunner.query("CREATE TABLE `subscription_orders` (`id` varchar(36) NOT NULL, `order_no` varchar(40) NOT NULL, `tenant_id` varchar(36) NOT NULL, `plan_id` varchar(36) NOT NULL, `plan_code` varchar(30) NOT NULL, `plan_name` varchar(80) NOT NULL, `amount` decimal(10,2) NOT NULL, `currency` varchar(10) NOT NULL DEFAULT 'CNY', `status` varchar(20) NOT NULL DEFAULT 'confirmed', `payment_status` varchar(20) NOT NULL DEFAULT 'not_required', `effective_at` datetime NOT NULL, `expires_at` datetime NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_subscription_order_no` (`order_no`), INDEX `IDX_subscription_tenant` (`tenant_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `subscription_orders`');
    await queryRunner.query('DROP TABLE `plans`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `permissions`');
  }
}
