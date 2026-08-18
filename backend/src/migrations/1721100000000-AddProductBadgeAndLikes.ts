import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductBadgeAndLikes1721100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('products', 'badge'))) await queryRunner.addColumn('products', new TableColumn({ name: 'badge', type: 'varchar', length: '30', default: "''" }));
    if (!(await queryRunner.hasColumn('products', 'like_count'))) await queryRunner.addColumn('products', new TableColumn({ name: 'like_count', type: 'int', default: 0 }));
    await queryRunner.query("UPDATE products SET badge = 'hot' WHERE hot = 1 AND (badge IS NULL OR badge = '')");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('products', 'like_count')) await queryRunner.dropColumn('products', 'like_count');
    if (await queryRunner.hasColumn('products', 'badge')) await queryRunner.dropColumn('products', 'badge');
  }
}
