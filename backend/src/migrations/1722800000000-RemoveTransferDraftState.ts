import { MigrationInterface, QueryRunner } from 'typeorm';

/** New transfers are issued atomically; legacy drafts become removable cancelled records. */
export class RemoveTransferDraftState1722800000000 implements MigrationInterface {
  name = 'RemoveTransferDraftState1722800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('stock_transfers')) {
      await queryRunner.query("UPDATE `stock_transfers` SET `status` = 'cancelled' WHERE `status` = 'draft'");
      await queryRunner.query("ALTER TABLE `stock_transfers` MODIFY `status` varchar(20) NOT NULL DEFAULT 'shipped'");
    }
  }

  async down(): Promise<void> {
    // Cancelled records cannot be distinguished safely from former drafts.
  }
}
