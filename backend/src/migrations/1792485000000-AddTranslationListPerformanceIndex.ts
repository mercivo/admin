import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTranslationListPerformanceIndex1792485000000 implements MigrationInterface {
  name = 'AddTranslationListPerformanceIndex1792485000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `idx_translation_units_site_active_type_updated` ON `translation_units` (`site_id`, `is_archived`, `resource_type`, `updated_at`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_translation_units_site_active_type_updated` ON `translation_units`');
  }
}
