import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class HardenMultiTenantStorefront1720936000000 implements MigrationInterface {
  name = 'HardenMultiTenantStorefront1720936000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateSlugs: Array<{ slug: string; count: number }> = await queryRunner.query(
      'SELECT `slug`, COUNT(*) AS `count` FROM `sites` GROUP BY `slug` HAVING COUNT(*) > 1',
    );
    if (duplicateSlugs.length) {
      throw new Error(`Cannot enforce unique site slugs; duplicates found: ${duplicateSlugs.map(row => row.slug).join(', ')}`);
    }

    await queryRunner.query('CREATE UNIQUE INDEX `uq_sites_slug` ON `sites` (`slug`)').catch(() => undefined);
    await queryRunner.query('CREATE INDEX `idx_sites_tenant` ON `sites` (`tenant_id`)').catch(() => undefined);
    await queryRunner.query('CREATE INDEX `idx_site_domains_site` ON `site_domains` (`site_id`)').catch(() => undefined);
    await queryRunner.query('CREATE INDEX `idx_site_versions_site_version` ON `site_versions` (`site_id`, `version`)').catch(() => undefined);
    if (!(await queryRunner.hasColumn('site_domains', 'verification_token'))) await queryRunner.addColumn('site_domains', new TableColumn({ name: 'verification_token', type: 'varchar', length: '64', isNullable: true }));
    if (!(await queryRunner.hasColumn('site_domains', 'verified_at'))) await queryRunner.addColumn('site_domains', new TableColumn({ name: 'verified_at', type: 'datetime', isNullable: true }));

    if (!(await queryRunner.hasColumn('chat_sessions', 'visitor_id'))) {
      await queryRunner.addColumn('chat_sessions', new TableColumn({ name: 'visitor_id', type: 'varchar', length: '100', isNullable: true }));
    }
    await queryRunner.query('CREATE UNIQUE INDEX `uq_chat_sessions_site_visitor` ON `chat_sessions` (`site_id`, `visitor_id`)').catch(() => undefined);
    await queryRunner.query('CREATE INDEX `idx_chat_messages_session` ON `chat_messages` (`session_id`)').catch(() => undefined);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_chat_messages_session` ON `chat_messages`').catch(() => undefined);
    await queryRunner.query('DROP INDEX `uq_chat_sessions_site_visitor` ON `chat_sessions`').catch(() => undefined);
    if (await queryRunner.hasColumn('chat_sessions', 'visitor_id')) await queryRunner.dropColumn('chat_sessions', 'visitor_id');
    await queryRunner.query('DROP INDEX `idx_site_versions_site_version` ON `site_versions`').catch(() => undefined);
    if (await queryRunner.hasColumn('site_domains', 'verified_at')) await queryRunner.dropColumn('site_domains', 'verified_at');
    if (await queryRunner.hasColumn('site_domains', 'verification_token')) await queryRunner.dropColumn('site_domains', 'verification_token');
    await queryRunner.query('DROP INDEX `idx_site_domains_site` ON `site_domains`').catch(() => undefined);
    await queryRunner.query('DROP INDEX `idx_sites_tenant` ON `sites`').catch(() => undefined);
    await queryRunner.query('DROP INDEX `uq_sites_slug` ON `sites`').catch(() => undefined);
  }
}
