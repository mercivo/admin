import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductBasePrice1720990000000 implements MigrationInterface {
  name = 'AddProductBasePrice1720990000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('products', 'base_price'))) {
      await queryRunner.addColumn('products', new TableColumn({ name: 'base_price', type: 'decimal', precision: 14, scale: 2, default: 0 }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('products', 'base_price')) await queryRunner.dropColumn('products', 'base_price');
  }
}
