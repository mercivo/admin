import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutreachCampaigns1721800000000 implements MigrationInterface {
  name = 'AddOutreachCampaigns1721800000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('outreach_campaigns'))) await queryRunner.query("CREATE TABLE `outreach_campaigns` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `name` varchar(160) NOT NULL, `audience_type` varchar(30) NOT NULL DEFAULT 'customers', `audience_label` varchar(160) NOT NULL DEFAULT '', `subject` varchar(255) NOT NULL, `content` text NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'draft', `scheduled_at` datetime NULL, `recipient_count` int NOT NULL DEFAULT 0, `sent_count` int NOT NULL DEFAULT 0, `open_count` int NOT NULL DEFAULT 0, `reply_count` int NOT NULL DEFAULT 0, `created_by` varchar(36) NOT NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_outreach_site_status` (`site_id`, `status`), INDEX `IDX_outreach_tenant` (`tenant_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `outreach_campaigns`'); }
}
