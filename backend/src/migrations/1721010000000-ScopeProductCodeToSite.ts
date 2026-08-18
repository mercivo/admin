import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeProductCodeToSite1721010000000 implements MigrationInterface {
  name = 'ScopeProductCodeToSite1721010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    const oldUnique = table?.uniques.find(unique => unique.columnNames.length === 1 && unique.columnNames[0] === 'sku');
    if (oldUnique) await queryRunner.dropUniqueConstraint('products', oldUnique);
    const hasScopedIndex = table?.indices.some(index => index.name === 'UQ_products_site_sku');
    if (!hasScopedIndex) await queryRunner.query('CREATE UNIQUE INDEX `UQ_products_site_sku` ON `products` (`site_id`, `sku`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `UQ_products_site_sku` ON `products`');
    await queryRunner.query('ALTER TABLE `products` ADD UNIQUE INDEX `IDX_products_sku` (`sku`)');
  }
}
