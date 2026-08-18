import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('outreach_campaigns')
export class OutreachCampaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ length: 160 }) name: string;
  @Column({ name: 'audience_type', length: 30, default: 'customers' }) audienceType: 'customers' | 'leads';
  @Column({ name: 'audience_label', length: 160, default: '' }) audienceLabel: string;
  @Column({ length: 255 }) subject: string;
  @Column({ type: 'text' }) content: string;
  @Column({ length: 20, default: 'draft' }) status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true }) scheduledAt: Date | null;
  @Column({ name: 'recipient_count', type: 'int', default: 0 }) recipientCount: number;
  @Column({ name: 'sent_count', type: 'int', default: 0 }) sentCount: number;
  @Column({ name: 'open_count', type: 'int', default: 0 }) openCount: number;
  @Column({ name: 'reply_count', type: 'int', default: 0 }) replyCount: number;
  @Column({ name: 'created_by', length: 36 }) createdBy: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
