import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const readJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export class AddInventoryManagement1722700000000 implements MigrationInterface {
  name = 'AddInventoryManagement1722700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('warehouses'))) await queryRunner.query("CREATE TABLE `warehouses` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `code` varchar(40) NOT NULL, `name` varchar(120) NOT NULL, `contact` varchar(80) NOT NULL DEFAULT '', `phone` varchar(40) NOT NULL DEFAULT '', `address` varchar(500) NOT NULL DEFAULT '', `status` varchar(20) NOT NULL DEFAULT 'active', `is_default` tinyint NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_warehouses_site_code` (`site_id`,`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('inventory_balances'))) await queryRunner.query("CREATE TABLE `inventory_balances` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `warehouse_id` varchar(36) NOT NULL, `product_id` varchar(36) NOT NULL, `variant_key` varchar(36) NOT NULL DEFAULT 'BASE', `on_hand` int NOT NULL DEFAULT 0, `reserved` int NOT NULL DEFAULT 0, `in_transit` int NOT NULL DEFAULT 0, `warning_stock` int NOT NULL DEFAULT 0, `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_inventory_balance_dimension` (`warehouse_id`,`product_id`,`variant_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('inventory_ledger'))) await queryRunner.query("CREATE TABLE `inventory_ledger` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `warehouse_id` varchar(36) NOT NULL, `product_id` varchar(36) NOT NULL, `variant_key` varchar(36) NOT NULL DEFAULT 'BASE', `type` varchar(30) NOT NULL, `quantity_change` int NOT NULL, `balance_after` int NOT NULL, `reference_type` varchar(30) NOT NULL, `reference_id` varchar(36) NOT NULL, `actor_user_id` varchar(36) NOT NULL DEFAULT '', `remark` varchar(500) NOT NULL DEFAULT '', `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_inventory_ledger_site_created` (`site_id`,`created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('stock_counts'))) await queryRunner.query("CREATE TABLE `stock_counts` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `document_no` varchar(40) NOT NULL, `warehouse_id` varchar(36) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'draft', `remark` varchar(500) NOT NULL DEFAULT '', `created_by` varchar(36) NOT NULL, `started_at` datetime NULL, `completed_at` datetime NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_stock_counts_site_no` (`site_id`,`document_no`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('stock_count_lines'))) await queryRunner.query("CREATE TABLE `stock_count_lines` (`id` varchar(36) NOT NULL, `count_id` varchar(36) NOT NULL, `product_id` varchar(36) NOT NULL, `variant_key` varchar(36) NOT NULL DEFAULT 'BASE', `system_quantity` int NOT NULL DEFAULT 0, `counted_quantity` int NULL, `difference` int NOT NULL DEFAULT 0, UNIQUE INDEX `UQ_stock_count_line_dimension` (`count_id`,`product_id`,`variant_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('stock_transfers'))) await queryRunner.query("CREATE TABLE `stock_transfers` (`id` varchar(36) NOT NULL, `tenant_id` varchar(36) NOT NULL, `site_id` varchar(36) NOT NULL, `document_no` varchar(40) NOT NULL, `source_warehouse_id` varchar(36) NOT NULL, `destination_warehouse_id` varchar(36) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'draft', `remark` varchar(500) NOT NULL DEFAULT '', `created_by` varchar(36) NOT NULL, `shipped_at` datetime NULL, `received_at` datetime NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_stock_transfers_site_no` (`site_id`,`document_no`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    if (!(await queryRunner.hasTable('stock_transfer_lines'))) await queryRunner.query("CREATE TABLE `stock_transfer_lines` (`id` varchar(36) NOT NULL, `transfer_id` varchar(36) NOT NULL, `product_id` varchar(36) NOT NULL, `variant_key` varchar(36) NOT NULL DEFAULT 'BASE', `quantity` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");

    const sites: Array<{ id: string; tenant_id: string }> = await queryRunner.query('SELECT `id`, `tenant_id` FROM `sites`');
    for (const site of sites) {
      const existing: Array<{ id: string }> = await queryRunner.query("SELECT `id` FROM `warehouses` WHERE `site_id` = ? AND `is_default` = 1 LIMIT 1", [site.id]);
      const warehouseId = existing[0]?.id || randomUUID();
      if (!existing.length) await queryRunner.query("INSERT INTO `warehouses` (`id`,`tenant_id`,`site_id`,`code`,`name`,`status`,`is_default`) VALUES (?,?,?,?,?,'active',1)", [warehouseId, site.tenant_id, site.id, 'DEFAULT', '默认仓库']);
      const products: Array<{ id: string; variants: unknown; stock: number }> = await queryRunner.query('SELECT `id`,`variants`,`stock` FROM `products` WHERE `site_id` = ?', [site.id]);
      for (const product of products) {
        const variants = readJson<Array<{ id?: string; specification: string; option: string; stock: number; surcharge: number }>>(product.variants, []);
        const dimensions = variants.length ? variants.map(variant => { variant.id ||= randomUUID(); return { key: variant.id, stock: Math.max(0, Number(variant.stock) || 0) }; }) : [{ key: 'BASE', stock: Math.max(0, Number(product.stock) || 0) }];
        if (variants.length) await queryRunner.query('UPDATE `products` SET `variants` = ? WHERE `id` = ?', [JSON.stringify(variants), product.id]);
        for (const dimension of dimensions) {
          const rows: Array<{ id: string }> = await queryRunner.query('SELECT `id` FROM `inventory_balances` WHERE `warehouse_id`=? AND `product_id`=? AND `variant_key`=? LIMIT 1', [warehouseId, product.id, dimension.key]);
          if (rows.length) continue;
          const balanceId = randomUUID();
          await queryRunner.query('INSERT INTO `inventory_balances` (`id`,`tenant_id`,`site_id`,`warehouse_id`,`product_id`,`variant_key`,`on_hand`) VALUES (?,?,?,?,?,?,?)', [balanceId, site.tenant_id, site.id, warehouseId, product.id, dimension.key, dimension.stock]);
          if (dimension.stock) await queryRunner.query("INSERT INTO `inventory_ledger` (`id`,`tenant_id`,`site_id`,`warehouse_id`,`product_id`,`variant_key`,`type`,`quantity_change`,`balance_after`,`reference_type`,`reference_id`,`remark`) VALUES (?,?,?,?,?,?,'opening',?,?, 'migration',?,'历史库存初始化')", [randomUUID(), site.tenant_id, site.id, warehouseId, product.id, dimension.key, dimension.stock, dimension.stock, balanceId]);
        }
      }
    }

    const readPermissions = ['group.inventory', 'menu.inventory.stocks', 'page.inventory.stocks', 'inventory.ledger.view'];
    for (const table of ['plans', 'tenants', 'users', 'team_members']) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, 'permissions'))) continue;
      const rows: Array<{ id: string; permissions: unknown }> = await queryRunner.query(`SELECT \`id\`, \`permissions\` FROM \`${table}\` WHERE \`permissions\` IS NOT NULL`);
      for (const row of rows) {
        const permissions = readJson<string[]>(row.permissions, []);
        if (!permissions.includes('group.products')) continue;
        await queryRunner.query(`UPDATE \`${table}\` SET \`permissions\`=? WHERE \`id\`=?`, [JSON.stringify([...new Set([...permissions, ...readPermissions])]), row.id]);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['stock_transfer_lines', 'stock_transfers', 'stock_count_lines', 'stock_counts', 'inventory_ledger', 'inventory_balances', 'warehouses']) if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table);
  }
}
