import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderLineSortOrder1792670000000 implements MigrationInterface {
  name = 'AddOrderLineSortOrder1792670000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `purchase_order_lines` ADD `sort_order` int NOT NULL DEFAULT 0 AFTER `order_id`',
    );
    await queryRunner.query(
      'ALTER TABLE `sales_order_lines` ADD `sort_order` int NOT NULL DEFAULT 0 AFTER `order_id`',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `sales_order_lines` DROP COLUMN `sort_order`',
    );
    await queryRunner.query(
      'ALTER TABLE `purchase_order_lines` DROP COLUMN `sort_order`',
    );
  }
}
