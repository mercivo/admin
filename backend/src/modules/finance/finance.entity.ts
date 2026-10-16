import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type FinanceTransactionType = "receipt" | "payment";
export type FinanceTransactionStatus = "pending" | "confirmed" | "cancelled";
export type FinancePaymentMethod =
  | "bank_transfer"
  | "cash"
  | "wechat"
  | "alipay"
  | "other";

@Entity("finance_transactions")
@Index("UQ_finance_transactions_site_no", ["siteId", "transactionNo"], {
  unique: true,
})
@Index("IDX_finance_transactions_site_type_date", [
  "siteId",
  "type",
  "transactionDate",
])
export class FinanceTransaction {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ name: "tenant_id", length: 36 }) tenantId: string;
  @Column({ name: "site_id", length: 36 }) siteId: string;
  @Column({ name: "transaction_no", length: 40 }) transactionNo: string;
  @Column({ length: 16 }) type: FinanceTransactionType;
  @Column({ name: "order_id", length: 36 }) orderId: string;
  @Column({ name: "partner_id", length: 36 }) partnerId: string;
  @Column({ name: "partner_name", length: 160 }) partnerName: string;
  @Column({ length: 3, default: "CNY" }) currency: string;
  @Column({ type: "decimal", precision: 14, scale: 2 }) amount: number;
  @Column({ name: "payment_method", length: 24 })
  paymentMethod: FinancePaymentMethod;
  @Column({ name: "account_name", length: 100, default: "" })
  accountName: string;
  @Column({ name: "reference_no", length: 100, default: "" })
  referenceNo: string;
  @Column({ name: "transaction_date", type: "date" })
  transactionDate: string;
  @Column({ length: 16, default: "pending" })
  status: FinanceTransactionStatus;
  @Column({ length: 500, default: "" }) remark: string;
  @Column({ name: "void_reason", length: 500, default: "" })
  cancelReason: string;
  @Column({ name: "created_by", length: 36 }) createdBy: string;
  @Column({ name: "voided_by", type: "varchar", length: 36, nullable: true })
  cancelledBy: string | null;
  @Column({ name: "voided_at", type: "datetime", nullable: true })
  cancelledAt: Date | null;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}
