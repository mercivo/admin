import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class ScopeDictionariesToSite1720938000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const entryTable = await queryRunner.getTable('dict_entries');
    if (entryTable) for (const foreignKey of entryTable.foreignKeys) await queryRunner.dropForeignKey(entryTable, foreignKey);
    for (const tableName of ['dict_types', 'dict_entries']) {
      if (!(await queryRunner.hasColumn(tableName, 'tenant_id'))) await queryRunner.addColumn(tableName, new TableColumn({ name: 'tenant_id', type: 'varchar', length: '36', default: "''" }));
      if (!(await queryRunner.hasColumn(tableName, 'site_id'))) await queryRunner.addColumn(tableName, new TableColumn({ name: 'site_id', type: 'varchar', length: '36', default: "''" }));
    }
    const typeTable = await queryRunner.getTable('dict_types');
    if (typeTable) for (const index of typeTable.indices.filter(index => index.isUnique && index.columnNames.join(',') === 'type_id')) await queryRunner.dropIndex(typeTable, index);
    if (!(await queryRunner.getTable('dict_types'))?.indices.some(index => index.name === 'uq_dict_types_site_type')) await queryRunner.createIndex('dict_types', new TableIndex({ name: 'uq_dict_types_site_type', columnNames: ['site_id', 'type_id'], isUnique: true }));
    if (!(await queryRunner.getTable('dict_entries'))?.indices.some(index => index.name === 'uq_dict_entries_site_type_code')) await queryRunner.createIndex('dict_entries', new TableIndex({ name: 'uq_dict_entries_site_type_code', columnNames: ['site_id', 'type_id', 'code'], isUnique: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ['dict_entries', 'dict_types']) {
      if (await queryRunner.hasColumn(tableName, 'site_id')) await queryRunner.dropColumn(tableName, 'site_id');
      if (await queryRunner.hasColumn(tableName, 'tenant_id')) await queryRunner.dropColumn(tableName, 'tenant_id');
    }
  }
}
