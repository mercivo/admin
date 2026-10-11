import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCrmAndAiModules1722200000000 implements MigrationInterface {
  name = 'RemoveCrmAndAiModules1722200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['chat_messages', 'chat_sessions', 'outreach_campaigns', 'opportunities', 'leads', 'knowledge_files', 'agent_presets', 'agents']) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true, true, true);
    }
    if (await queryRunner.hasColumn('sites', 'translation_agent_id')) await queryRunner.dropColumn('sites', 'translation_agent_id');
    if (await queryRunner.hasColumn('tenants', 'max_agents')) await queryRunner.dropColumn('tenants', 'max_agents');
    if (await queryRunner.hasColumn('plans', 'max_agents')) await queryRunner.dropColumn('plans', 'max_agents');
  }

  async down(): Promise<void> {
    throw new Error('CRM and AI module removal is intentionally irreversible');
  }
}
