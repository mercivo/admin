import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentTranslationConfiguration1721020000000 implements MigrationInterface {
  name = 'AddAgentTranslationConfiguration1721020000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('agents', 'agent_type'))) await queryRunner.query("ALTER TABLE `agents` ADD `agent_type` varchar(30) NOT NULL DEFAULT 'sales'");
    if (!(await queryRunner.hasColumn('agents', 'system_prompt'))) await queryRunner.query('ALTER TABLE `agents` ADD `system_prompt` text NULL');
    if (!(await queryRunner.hasColumn('sites', 'supported_languages'))) await queryRunner.query('ALTER TABLE `sites` ADD `supported_languages` json NULL');
    if (!(await queryRunner.hasColumn('sites', 'translation_agent_id'))) await queryRunner.query('ALTER TABLE `sites` ADD `translation_agent_id` varchar(36) NULL');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `sites` DROP COLUMN `translation_agent_id`, DROP COLUMN `supported_languages`');
    await queryRunner.query('ALTER TABLE `agents` DROP COLUMN `system_prompt`, DROP COLUMN `agent_type`');
  }
}
