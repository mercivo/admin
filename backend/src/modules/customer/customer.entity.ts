import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ length: 255 }) name: string;
  @Column({ length: 255 }) company: string;
  @Column({ length: 255, default: '' }) email: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({ name: 'phone_normalized', type: 'varchar', length: 50, nullable: true }) phoneNormalized: string | null;
  @Column({ length: 20, default: 'active' }) status: 'active' | 'disabled';
  @Column({ length: 100, default: '' }) country: string;
  @Column({ length: 36, default: '' }) level: string;
  @Column({ type: 'int', default: 0 }) orders: number;
  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 }) totalAmount: number;
  @Column({ name: 'last_order_at', type: 'date', nullable: true }) lastOrderAt: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('customer_level_rules')
export class CustomerLevelRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ length: 36 }) code: string;
  @Column({ length: 50 }) name: string;
  @Column({ type: 'varchar', length: 500, default: '' }) note: string;
  @Column({ name: 'min_amount', type: 'decimal', precision: 14, scale: 2, default: 0 }) minAmount: number;
  @Column({ name: 'min_orders', type: 'int', default: 0 }) minOrders: number;
  @Column({ name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0 }) discountRate: number;
  @Column({ type: 'int', default: 0 }) sort: number;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
