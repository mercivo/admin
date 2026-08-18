import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentPresets1721700000000 implements MigrationInterface {
  name = 'AddAgentPresets1721700000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('agent_presets'))) await queryRunner.query("CREATE TABLE `agent_presets` (`id` varchar(36) NOT NULL, `code` varchar(60) NOT NULL, `name` varchar(120) NOT NULL, `description` text NOT NULL, `agent_type` varchar(30) NOT NULL, `model` varchar(100) NOT NULL DEFAULT 'gpt-4o-mini', `lang` varchar(100) NOT NULL DEFAULT '多语言', `system_prompt` text NULL, `icon` varchar(100) NOT NULL DEFAULT 'Bot', `color` varchar(200) NOT NULL DEFAULT 'bg-primary/10 text-primary border-primary/20', `enabled` tinyint NOT NULL DEFAULT 1, `sort_order` int NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_agent_presets_code` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `agent_presets`'); }
}
