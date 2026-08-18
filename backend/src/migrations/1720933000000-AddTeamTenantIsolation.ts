import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamTenantIsolation1720933000000 implements MigrationInterface {
  name = 'AddTeamTenantIsolation1720933000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('team_members', 'tenant_id'))) await queryRunner.query("ALTER TABLE `team_members` ADD `tenant_id` varchar(36) NOT NULL DEFAULT ''");
    if (!(await queryRunner.hasColumn('team_members', 'site_id'))) await queryRunner.query("ALTER TABLE `team_members` ADD `site_id` varchar(36) NOT NULL DEFAULT ''");
    await queryRunner.query('CREATE INDEX `idx_team_members_site` ON `team_members` (`site_id`)').catch(() => undefined);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_team_members_site` ON `team_members`').catch(() => undefined);
    if (await queryRunner.hasColumn('team_members', 'site_id')) await queryRunner.query('ALTER TABLE `team_members` DROP COLUMN `site_id`');
    if (await queryRunner.hasColumn('team_members', 'tenant_id')) await queryRunner.query('ALTER TABLE `team_members` DROP COLUMN `tenant_id`');
  }
}
