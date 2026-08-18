import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class LinkTeamMemberToUser1720950000000 implements MigrationInterface {
  name = 'LinkTeamMemberToUser1720950000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('team_members', 'user_id'))) {
      await queryRunner.addColumn('team_members', new TableColumn({
        name: 'user_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
        isUnique: true,
      }));
    }
    await queryRunner.query('ALTER TABLE `team_members` MODIFY `email` varchar(255) NULL');
    await queryRunner.query(`
      INSERT INTO team_members
        (id, user_id, tenant_id, site_id, name, email, role, avatar, color, joined_at, updated_at)
      SELECT
        UUID(), u.id, u.tenant_id, u.site_id, t.name, NULL, 'admin',
        UPPER(LEFT(t.name, 2)), 'bg-primary text-white', u.created_at, NOW()
      FROM users u
      INNER JOIN tenants t ON t.id = u.tenant_id
      WHERE u.role = 'admin'
        AND u.site_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE `team_members` SET `email` = CONCAT(`id`, '@local.mercivo') WHERE `email` IS NULL");
    await queryRunner.query('ALTER TABLE `team_members` MODIFY `email` varchar(255) NOT NULL');
    if (await queryRunner.hasColumn('team_members', 'user_id')) await queryRunner.dropColumn('team_members', 'user_id');
  }
}
