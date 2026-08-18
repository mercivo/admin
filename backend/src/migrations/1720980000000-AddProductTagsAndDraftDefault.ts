import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductTagsAndDraftDefault1720980000000 implements MigrationInterface {
  name = 'AddProductTagsAndDraftDefault1720980000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('products', 'tags'))) {
      await queryRunner.addColumn('products', new TableColumn({ name: 'tags', type: 'json', isNullable: true }));
    }
    await queryRunner.query("ALTER TABLE products MODIFY status varchar(20) NOT NULL DEFAULT 'draft'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE products MODIFY status varchar(20) NOT NULL DEFAULT 'published'");
    if (await queryRunner.hasColumn('products', 'tags')) await queryRunner.dropColumn('products', 'tags');
  }
}
