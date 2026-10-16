import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("warehouses")
@Index("UQ_warehouses_site_code", ["siteId", "code"], { unique: true })
export class Warehouse {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ length: 40 }) code: string;
  @Column({ length: 120 }) name: string;
  @Column({ length: 80, default: "" }) contact: string;
  @Column({ length: 40, default: "" }) phone: string;
  @Column({ length: 500, default: "" }) address: string;
  @Column({ length: 20, default: "active" }) status: "active" | "disabled";
  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault: boolean;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("inventory_balances")
@Index(
  "UQ_inventory_balance_dimension",
  ["warehouseId", "productId", "variantKey"],
  { unique: true },
)
export class InventoryBalance {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ name: "on_hand", type: "int", default: 0 }) onHand: number;
  @Column({ type: "int", default: 0 }) reserved: number;
  @Column({ name: "in_transit", type: "int", default: 0 }) inTransit: number;
  @Column({ name: "warning_stock", type: "int", default: 0 })
  warningStock: number;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("inventory_ledger")
@Index("IDX_inventory_ledger_site_created", ["siteId", "createdAt"])
export class InventoryLedgerEntry {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ length: 30 }) type:
    | "opening"
    | "count_adjust"
    | "transfer_out"
    | "transfer_in"
    | "sales_out"
    | "purchase_in";
  @Column({ name: "quantity_change", type: "int" }) quantityChange: number;
  @Column({ name: "balance_after", type: "int" }) balanceAfter: number;
  @Column({ name: "reference_type", length: 30 }) referenceType: string;
  @Column({ name: "reference_id", length: 36 }) referenceId: string;
  @Column({ name: "actor_user_id", length: 36, default: "" })
  actorUserId: string;
  @Column({ length: 500, default: "" }) remark: string;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}

@Entity("stock_counts")
@Index("UQ_stock_counts_site_no", ["siteId", "documentNo"], { unique: true })
export class StockCount {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "document_no", length: 40 }) documentNo: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ length: 20, default: "draft" }) status:
    "draft" | "counting" | "completed" | "cancelled";
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "started_at", type: "datetime", nullable: true })
  startedAt: Date | null;
  @Column({ name: "completed_at", type: "datetime", nullable: true })
  completedAt: Date | null;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("stock_count_lines")
@Index(
  "UQ_stock_count_line_dimension",
  ["countId", "productId", "variantKey"],
  { unique: true },
)
export class StockCountLine {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "count_id", length: 36 }) countId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ name: "system_quantity", type: "int", default: 0 })
  systemQuantity: number;
  @Column({ name: "counted_quantity", type: "int", nullable: true })
  countedQuantity: number | null;
  @Column({ type: "int", default: 0 }) difference: number;
}

@Entity("stock_transfers")
@Index("UQ_stock_transfers_site_no", ["siteId", "documentNo"], { unique: true })
export class StockTransfer {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "document_no", length: 40 }) documentNo: string;
  @Column({ name: "source_warehouse_id", length: 36 })
  sourceWarehouseId: string;
  @Column({ name: "destination_warehouse_id", length: 36 })
  destinationWarehouseId: string;
  @Column({ length: 20, default: "shipped" }) status:
    "shipped" | "received" | "cancelled";
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "shipped_at", type: "datetime", nullable: true })
  shippedAt: Date | null;
  @Column({ name: "received_at", type: "datetime", nullable: true })
  receivedAt: Date | null;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("stock_transfer_lines")
export class StockTransferLine {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "transfer_id", length: 36 }) transferId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ type: "int" }) quantity: number;
}
