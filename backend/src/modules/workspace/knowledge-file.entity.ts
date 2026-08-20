import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_files')
export class KnowledgeFile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;
  @Column({ length: 255 }) name: string;
  @Column({ length: 30 }) type: string;
  @Column({ length: 30 }) size: string;
  @Column({ type: 'longtext', select: false }) content: string;
  @Column({ name: 'object_name', type: 'varchar', length: 1024, nullable: true }) objectName: string | null;
  @Column({ length: 20, default: 'indexed' }) status: 'indexed' | 'processing' | 'failed';
  @Column({ type: 'int', default: 0 }) chunks: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
