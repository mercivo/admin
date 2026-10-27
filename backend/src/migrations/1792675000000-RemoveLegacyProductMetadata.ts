import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLegacyProductMetadata1792675000000 implements MigrationInterface {
  name = 'RemoveLegacyProductMetadata1792675000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
        DROP COLUMN \`brand\`,
        DROP COLUMN \`gtin\`,
        DROP COLUMN \`enable_reviews\`,
        DROP COLUMN \`review_rating\`,
        DROP COLUMN \`seo_title\`,
        DROP COLUMN \`seo_description\`,
        DROP COLUMN \`seo_image\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD \`brand\` varchar(255) NULL,
        ADD \`gtin\` varchar(50) NULL,
        ADD \`enable_reviews\` tinyint NOT NULL DEFAULT 0,
        ADD \`review_rating\` decimal(2,1) NULL,
        ADD \`seo_title\` varchar(255) NULL,
        ADD \`seo_description\` text NULL,
        ADD \`seo_image\` varchar(500) NULL
    `);
  }
}
