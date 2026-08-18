import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifySingleSitePlanConcept1721400000000 implements MigrationInterface {
  name = 'UnifySingleSitePlanConcept1721400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE `plans` SET `max_sites` = 1');
    await queryRunner.query('UPDATE `tenants` SET `max_sites` = 1');
    await queryRunner.query(`
      UPDATE \`plans\`
      SET \`permissions\` = JSON_REMOVE(\`permissions\`, JSON_UNQUOTE(JSON_SEARCH(\`permissions\`, 'one', 'site.publish')))
      WHERE \`code\` = 'trial' AND JSON_SEARCH(\`permissions\`, 'one', 'site.publish') IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE \`tenants\`
      SET \`permissions\` = JSON_REMOVE(\`permissions\`, JSON_UNQUOTE(JSON_SEARCH(\`permissions\`, 'one', 'site.publish')))
      WHERE \`plan\` = 'trial' AND JSON_SEARCH(\`permissions\`, 'one', 'site.publish') IS NOT NULL
    `);
  }

  async down(): Promise<void> {
    // The former site quota values cannot be reconstructed reliably.
  }
}
