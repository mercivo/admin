import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;
  @Column({ name: 'visitor_id', type: 'varchar', length: 100, nullable: true }) visitorId: string | null;
  @Column({ length: 255, default: '新对话' }) title: string;
  @Column({ type: 'boolean', default: false }) starred: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
