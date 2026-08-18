import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 30, unique: true }) code: string;
  @Column({ length: 80 }) name: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) price: number;
  @Column({ length: 10, default: 'CNY' }) currency: string;
  @Column({ name: 'billing_cycle', length: 20, default: 'month' }) billingCycle: 'month' | 'year';
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'max_products', type: 'int', default: 100 }) maxProducts: number;
  @Column({ name: 'max_agents', type: 'int', default: 2 }) maxAgents: number;
  @Column({ name: 'max_members', type: 'int', default: 1 }) maxMembers: number;
  @Column({ name: 'max_sites', type: 'int', default: 1 }) maxSites: number;
  @Column({ type: 'json', nullable: true }) features: Record<string, boolean> | null;
  @Column({ type: 'json', nullable: true }) permissions: string[] | null;
  @Column({ type: 'boolean', default: true }) enabled: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
