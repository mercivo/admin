import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("suppliers")
@Index("UQ_suppliers_site_code", ["siteId", "code"], { unique: true })
export class Supplier {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ length: 40 }) code: string;
  @Column({ length: 160 }) name: string;
  @Column({ length: 80, default: "" }) contact: string;
  @Column({ length: 40, default: "" }) phone: string;
  @Column({ length: 160, default: "" }) email: string;
  @Column({ length: 500, default: "" }) address: string;
  @Column({ name: "tax_no", length: 80, default: "" }) taxNo: string;
  @Column({ name: "payment_terms", length: 100, default: "" })
  paymentTerms: string;
  @Column({ name: "payment_days", type: "int", default: 0 })
  paymentDays: number;
  @Column({ length: 20, default: "active" }) status: "active" | "disabled";
  @Column({ length: 500, default: "" }) remark: string;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

export type PurchaseOrderStatus =
  "draft" | "confirmed" | "partially_received" | "completed" | "cancelled";

@Entity("purchase_orders")
@Index("UQ_purchase_orders_site_no", ["siteId", "orderNo"], { unique: true })
@Index("IDX_purchase_orders_site_status_created", ["siteId", "status", "createdAt"])
export class PurchaseOrder {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "order_no", length: 40 }) orderNo: string;
  @Column({ name: "supplier_id", length: 36 }) supplierId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ length: 3, default: "CNY" }) currency: string;
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  amount: number;
  @Column({
    name: "tax_amount",
    type: "decimal",
    precision: 14,
    scale: 2,
    default: 0,
  })
  taxAmount: number;
  @Column({
    name: "shipping_fee",
    type: "decimal",
    precision: 14,
    scale: 2,
    default: 0,
  })
  shippingFee: number;
  @Column({
    name: "total_amount",
    type: "decimal",
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalAmount: number;
  @Column({ length: 24, default: "draft" }) status: PurchaseOrderStatus;
  @Column({ name: "expected_date", type: "date", nullable: true })
  expectedDate: string | null;
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "confirmed_at", type: "datetime", nullable: true })
  confirmedAt: Date | null;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("purchase_order_lines")
@Index(
  "UQ_purchase_order_line_dimension",
  ["orderId", "productId", "variantKey"],
  { unique: true },
)
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "order_id", length: 36 }) orderId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ name: "product_name", length: 255 }) productName: string;
  @Column({ name: "product_sku", length: 100 }) productSku: string;
  @Column({ name: "variant_label", length: 160, default: "默认规格" })
  variantLabel: string;
  @Column({ type: "int" }) quantity: number;
  @Column({ name: "received_quantity", type: "int", default: 0 })
  receivedQuantity: number;
  @Column({ name: "unit_price", type: "decimal", precision: 14, scale: 2 })
  unitPrice: number;
  @Column({ type: "decimal", precision: 14, scale: 2 }) amount: number;
}

@Entity("purchase_receipts")
@Index("UQ_purchase_receipts_site_no", ["siteId", "receiptNo"], {
  unique: true,
})
export class PurchaseReceipt {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "receipt_no", length: 40 }) receiptNo: string;
  @Column({ name: "order_id", length: 36 }) orderId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ length: 20, default: "received" }) status: "received";
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "received_at", type: "datetime" }) receivedAt: Date;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}

@Entity("purchase_receipt_lines")
export class PurchaseReceiptLine {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "receipt_id", length: 36 }) receiptId: string;
  @Column({ name: "order_line_id", length: 36 }) orderLineId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ type: "int" }) quantity: number;
}
