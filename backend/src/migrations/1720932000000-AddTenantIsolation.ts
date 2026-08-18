import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIsolation1720932000000 implements MigrationInterface {
  name = 'AddTenantIsolation1720932000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    const pairs = ['products', 'leads', 'agents', 'testimonials', 'knowledge_files', 'chat_sessions', 'team_members'];
    for (const table of pairs) {
      if (!(await queryRunner.hasColumn(table, 'tenant_id'))) await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`tenant_id\` varchar(36) NOT NULL DEFAULT ''`);
      if (!(await queryRunner.hasColumn(table, 'site_id'))) await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`site_id\` varchar(36) NOT NULL DEFAULT ''`);
      await queryRunner.query(`CREATE INDEX \`idx_${table}_site\` ON \`${table}\` (\`site_id\`)`).catch(() => undefined);
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['team_members', 'chat_sessions', 'knowledge_files', 'testimonials', 'agents', 'leads', 'products']) {
      await queryRunner.query(`DROP INDEX \`idx_${table}_site\` ON \`${table}\``).catch(() => undefined);
      if (await queryRunner.hasColumn(table, 'site_id')) await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`site_id\``);
      if (await queryRunner.hasColumn(table, 'tenant_id')) await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`tenant_id\``);
    }
  }
}
