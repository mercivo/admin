import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ name: 'source_lead_id', type: 'varchar', length: 36, nullable: true }) sourceLeadId: string | null;
  @Column({ name: 'customer_id', type: 'varchar', length: 36, nullable: true }) customerId: string | null;
  @Column({ length: 255 }) company: string;
  @Column({ length: 255 }) contact: string;
  @Column({ length: 255, default: '' }) email: string;
  @Column({ length: 100, default: '' }) country: string;
  @Column({ length: 255 }) product: string;
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 }) value: number;
  @Column({ type: 'int', default: 20 }) probability: number;
  @Column({ length: 100, default: '' }) owner: string;
  @Column({ name: 'next_follow_up', type: 'datetime', nullable: true }) nextFollowUp: Date | null;
  @Column({ length: 30, default: 'new' }) stage: string;
  @Column({ length: 30, default: 'website' }) source: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
