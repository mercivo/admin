import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeContent1722000000000 implements MigrationInterface {
  name = 'AddKnowledgeContent1722000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('knowledge_files', 'content'))) {
      await queryRunner.query("ALTER TABLE `knowledge_files` ADD `content` longtext NULL");
      await queryRunner.query("UPDATE `knowledge_files` SET `content` = '' WHERE `content` IS NULL");
      await queryRunner.query('ALTER TABLE `knowledge_files` MODIFY `content` longtext NOT NULL');
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `knowledge_files` DROP COLUMN `content`'); }
}
