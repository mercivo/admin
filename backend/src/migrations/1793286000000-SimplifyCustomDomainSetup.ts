import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyCustomDomainSetup1793286000000 implements MigrationInterface {
  name = 'SimplifyCustomDomainSetup1793286000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `site_domains` ADD `requested_hostname` varchar(255) NULL');
    await queryRunner.query("ALTER TABLE `site_domains` ALTER `status` SET DEFAULT 'pending_dns'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `site_domains` ALTER `status` SET DEFAULT 'pending_verification'");
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `requested_hostname`');
  }
}
