import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddUsersAndTenantPermissions1720934000000 implements MigrationInterface {
  name = 'AddUsersAndTenantPermissions1720934000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      new TableColumn({ name: 'plan', type: 'varchar', length: '30', default: "'trial'" }),
      new TableColumn({ name: 'max_products', type: 'int', default: 100 }),
      new TableColumn({ name: 'max_agents', type: 'int', default: 2 }),
      new TableColumn({ name: 'max_sites', type: 'int', default: 1 }),
      new TableColumn({ name: 'features', type: 'json', isNullable: true }),
      new TableColumn({ name: 'expires_at', type: 'datetime', isNullable: true }),
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn('tenants', column.name))) await queryRunner.addColumn('tenants', column);
    if (!(await queryRunner.hasTable('users'))) await queryRunner.createTable(new Table({ name: 'users', columns: [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'tenant_id', type: 'varchar', length: '36', isNullable: true },
      { name: 'site_id', type: 'varchar', length: '36', isNullable: true },
      { name: 'phone', type: 'varchar', length: '50', isNullable: true, isUnique: true },
      { name: 'username', type: 'varchar', length: '80', isNullable: true, isUnique: true },
      { name: 'password_hash', type: 'varchar', length: '255' },
      { name: 'role', type: 'varchar', length: '30', default: "'admin'" },
      { name: 'status', type: 'varchar', length: '20', default: "'active'" },
      { name: 'last_login_at', type: 'datetime', isNullable: true },
      { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
    ], indices: [{ name: 'idx_users_tenant', columnNames: ['tenant_id'] }] }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('users')) await queryRunner.dropTable('users');
    for (const name of ['expires_at', 'features', 'max_sites', 'max_agents', 'max_products', 'plan']) if (await queryRunner.hasColumn('tenants', name)) await queryRunner.dropColumn('tenants', name);
  }
}
