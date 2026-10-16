import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('storefront_inquiry_leads')
@Index('IDX_storefront_leads_site_created', ['siteId', 'createdAt'])
export class StorefrontInquiryLead {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ length: 20, default: 'inquiry' }) type: 'inquiry' | 'sample' | 'contact';
  @Column({ length: 24, default: 'new' }) status: 'new' | 'following' | 'converted' | 'closed';
  @Column({ length: 120, default: '' }) name: string;
  @Column({ length: 160, default: '' }) contact: string;
  @Column({ length: 160, default: '' }) email: string;
  @Column({ length: 160, default: '' }) company: string;
  @Column({ length: 50, default: '' }) phone: string;
  @Column({ length: 100, default: '' }) country: string;
  @Column({ name: 'product_id', type: 'varchar', length: 36, nullable: true }) productId: string | null;
  @Column({ name: 'product_name', length: 255, default: '' }) productName: string;
  @Column({ name: 'source_page', length: 500, default: '' }) sourcePage: string;
  @Column({ type: 'text' }) requirements: string;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'assigned_to_user_id', type: 'varchar', length: 36, nullable: true }) assignedToUserId: string | null;
  @Column({ name: 'assigned_to_name', length: 120, default: '' }) assignedToName: string;
  @Column({ name: 'close_reason', type: 'text', nullable: true }) closeReason: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
