import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomDomainProvisioning1793196000000 implements MigrationInterface {
  name = 'AddCustomDomainProvisioning1793196000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `site_domains` ADD `provider_hostname_id` varchar(64) NULL');
    await queryRunner.query('ALTER TABLE `site_domains` ADD `provider_error` varchar(500) NULL');
    await queryRunner.query('ALTER TABLE `site_domains` ADD `provider_synced_at` datetime NULL');
    await queryRunner.query('ALTER TABLE `site_domains` ADD `provider_validation_records` json NULL');
    await queryRunner.query("ALTER TABLE `site_domains` ALTER `status` SET DEFAULT 'pending_verification'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `site_domains` ALTER `status` SET DEFAULT 'active'");
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `provider_synced_at`');
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `provider_validation_records`');
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `provider_error`');
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `provider_hostname_id`');
  }
}
