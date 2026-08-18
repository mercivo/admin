import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLeadAssignment1720937000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('leads') && !(await queryRunner.hasColumn('leads', 'assigned_to'))) {
      await queryRunner.addColumn('leads', new TableColumn({ name: 'assigned_to', type: 'varchar', length: '100', default: "''" }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('leads') && await queryRunner.hasColumn('leads', 'assigned_to')) await queryRunner.dropColumn('leads', 'assigned_to');
  }
}
