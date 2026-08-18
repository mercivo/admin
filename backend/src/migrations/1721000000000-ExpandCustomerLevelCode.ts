import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCustomerLevelCode1721000000000 implements MigrationInterface {
  name = 'ExpandCustomerLevelCode1721000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE customer_level_rules MODIFY code varchar(36) NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM customer_level_rules WHERE CHAR_LENGTH(code) > 2");
    await queryRunner.query('ALTER TABLE customer_level_rules MODIFY code varchar(2) NOT NULL');
  }
}
