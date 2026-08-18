import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHierarchicalMemberPermissions1721500000000 implements MigrationInterface {
  name = 'AddHierarchicalMemberPermissions1721500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('plans', 'max_members'))) await queryRunner.addColumn('plans', new TableColumn({ name: 'max_members', type: 'int', default: 1 }));
    if (!(await queryRunner.hasColumn('tenants', 'max_members'))) await queryRunner.addColumn('tenants', new TableColumn({ name: 'max_members', type: 'int', default: 1 }));
    if (!(await queryRunner.hasColumn('users', 'permissions'))) await queryRunner.addColumn('users', new TableColumn({ name: 'permissions', type: 'json', isNullable: true }));
    if (!(await queryRunner.hasColumn('team_members', 'permissions'))) await queryRunner.addColumn('team_members', new TableColumn({ name: 'permissions', type: 'json', isNullable: true }));
    await queryRunner.query("UPDATE `plans` SET `max_members` = CASE WHEN `code` = 'trial' THEN 1 ELSE GREATEST(`max_members`, 5) END");
    await queryRunner.query("UPDATE `tenants` t LEFT JOIN `plans` p ON p.`code` = t.`plan` SET t.`max_members` = COALESCE(p.`max_members`, 1)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [['team_members', 'permissions'], ['users', 'permissions'], ['tenants', 'max_members'], ['plans', 'max_members']] as const) {
      if (await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
    }
  }
}
