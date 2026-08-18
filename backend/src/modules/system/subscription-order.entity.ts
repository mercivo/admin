import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscription_orders')
export class SubscriptionOrder {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'order_no', length: 40, unique: true }) orderNo: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'plan_id', length: 36 }) planId: string;
  @Column({ name: 'plan_code', length: 30 }) planCode: string;
  @Column({ name: 'plan_name', length: 80 }) planName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ length: 10, default: 'CNY' }) currency: string;
  @Column({ length: 20, default: 'confirmed' }) status: 'confirmed' | 'cancelled';
  @Column({ name: 'payment_status', length: 20, default: 'not_required' }) paymentStatus: 'not_required' | 'pending' | 'paid';
  @Column({ name: 'effective_at', type: 'datetime' }) effectiveAt: Date;
  @Column({ name: 'expires_at', type: 'datetime', nullable: true }) expiresAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
