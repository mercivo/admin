import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureCustomDomainClaims1794326400000 implements MigrationInterface {
  name = 'SecureCustomDomainClaims1794326400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_a96ae7420bf21c00b964475c9b` ON `site_domains`');
    await queryRunner.query('ALTER TABLE `site_domains` ADD `primary_requested` tinyint NOT NULL DEFAULT 0');
    await queryRunner.query("ALTER TABLE `site_domains` ADD `claimed_hostname` varchar(255) GENERATED ALWAYS AS (CASE WHEN `verification_token` IS NULL THEN `hostname` ELSE NULL END) STORED");
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_site_domains_claimed_hostname` ON `site_domains` (`claimed_hostname`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_site_domains_claimed_hostname` ON `site_domains`');
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `claimed_hostname`');
    await queryRunner.query('ALTER TABLE `site_domains` DROP COLUMN `primary_requested`');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_a96ae7420bf21c00b964475c9b` ON `site_domains` (`hostname`)');
  }
}
