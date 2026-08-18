import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkLeadCustomerOpportunity1721900000000 implements MigrationInterface {
  name = 'LinkLeadCustomerOpportunity1721900000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('opportunities', 'source_lead_id'))) await queryRunner.query('ALTER TABLE `opportunities` ADD `source_lead_id` varchar(36) NULL');
    if (!(await queryRunner.hasColumn('opportunities', 'customer_id'))) await queryRunner.query('ALTER TABLE `opportunities` ADD `customer_id` varchar(36) NULL');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_opportunity_site_source_lead` ON `opportunities` (`site_id`, `source_lead_id`)');
    await queryRunner.query('CREATE INDEX `IDX_opportunity_customer` ON `opportunities` (`customer_id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_opportunity_customer` ON `opportunities`');
    await queryRunner.query('DROP INDEX `IDX_opportunity_site_source_lead` ON `opportunities`');
    await queryRunner.query('ALTER TABLE `opportunities` DROP COLUMN `customer_id`, DROP COLUMN `source_lead_id`');
  }
}
