import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImages1792161700000 implements MigrationInterface {
  name = 'AddProductImages1792161700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `products` ADD `images` json NULL AFTER `img`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `products` DROP COLUMN `images`');
  }
}
