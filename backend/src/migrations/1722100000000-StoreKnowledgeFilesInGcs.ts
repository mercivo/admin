import { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreKnowledgeFilesInGcs1722100000000 implements MigrationInterface {
  name = 'StoreKnowledgeFilesInGcs1722100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `knowledge_files` ADD `object_name` varchar(1024) NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `knowledge_files` DROP COLUMN `object_name`');
  }
}
