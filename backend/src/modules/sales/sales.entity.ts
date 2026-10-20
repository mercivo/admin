import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type SalesOrderStatus =
  "confirmed" | "partially_shipped" | "completed" | "cancelled";

@Entity("sales_orders")
@Index("UQ_sales_orders_site_no", ["siteId", "orderNo"], { unique: true })
@Index("IDX_sales_orders_site_status_created", ["siteId", "status", "createdAt"])
export class SalesOrder {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "order_no", length: 40 }) orderNo: string;
  @Column({ name: "customer_id", length: 36 }) customerId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ length: 3, default: "CNY" }) currency: string;
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  amount: number;
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  discount: number;
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
  @Column({ length: 24, default: "confirmed" }) status: SalesOrderStatus;
  @Column({ name: "delivery_date", type: "date", nullable: true })
  deliveryDate: string | null;
  @Column({ name: "shipping_address", length: 500, default: "" })
  shippingAddress: string;
  @Column({ name: "contact_name", length: 80, default: "" })
  contactName: string;
  @Column({ name: "contact_phone", length: 40, default: "" })
  contactPhone: string;
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "confirmed_at", type: "datetime", nullable: true })
  confirmedAt: Date | null;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}

@Entity("sales_order_lines")
@Index(
  "UQ_sales_order_line_dimension",
  ["orderId", "productId", "variantKey"],
  { unique: true },
)
export class SalesOrderLine {
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
  @Column({ name: "shipped_quantity", type: "int", default: 0 })
  shippedQuantity: number;
  @Column({ name: "unit_price", type: "decimal", precision: 14, scale: 2 })
  unitPrice: number;
  @Column({ type: "decimal", precision: 14, scale: 2 }) amount: number;
}

@Entity("sales_shipments")
@Index("UQ_sales_shipments_site_no", ["siteId", "shipmentNo"], { unique: true })
export class SalesShipment {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "shipment_no", length: 40 }) shipmentNo: string;
  @Column({ name: "order_id", length: 36 }) orderId: string;
  @Column({ name: "warehouse_id", length: 36 }) warehouseId: string;
  @Column({ length: 20, default: "shipped" }) status: "shipped" | "cancelled";
  @Column({ name: "delivery_method", length: 20, default: "offline" })
  deliveryMethod: "offline" | "logistics";
  @Column({ name: "logistics_company", length: 100, default: "" })
  logisticsCompany: string;
  @Column({ name: "tracking_no", length: 100, default: "" }) trackingNo: string;
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "shipped_at", type: "datetime" }) shippedAt: Date;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}

@Entity("sales_shipment_lines")
export class SalesShipmentLine {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "shipment_id", length: 36 }) shipmentId: string;
  @Column({ name: "order_line_id", length: 36 }) orderLineId: string;
  @Column({ name: "product_id", length: 36 }) productId: string;
  @Column({ name: "variant_key", length: 36, default: "BASE" })
  variantKey: string;
  @Column({ type: "int" }) quantity: number;
}
