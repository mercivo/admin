import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetChineseSiteDefaults1720940000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE sites MODIFY default_language varchar(10) NOT NULL DEFAULT 'zh'");
    await queryRunner.query("ALTER TABLE sites MODIFY default_currency varchar(10) NOT NULL DEFAULT 'CNY'");
    await queryRunner.query("UPDATE sites SET default_language = 'zh', default_currency = 'CNY'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE sites MODIFY default_language varchar(10) NOT NULL DEFAULT 'en'");
    await queryRunner.query("ALTER TABLE sites MODIFY default_currency varchar(10) NOT NULL DEFAULT 'USD'");
  }
}
