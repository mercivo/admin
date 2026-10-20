import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('translation_units')
@Index('uq_translation_unit_resource', ['siteId', 'resourceType', 'resourceId', 'fieldKey'], { unique: true })
@Index('idx_translation_units_site_active_type_updated', ['siteId', 'isArchived', 'resourceType', 'updatedAt'])
export class TranslationUnit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ name: 'resource_type', length: 32 }) resourceType: string;
  @Column({ name: 'resource_id', length: 160 }) resourceId: string;
  @Column({ name: 'field_key', length: 255 }) fieldKey: string;
  @Column({ name: 'source_text', type: 'longtext' }) sourceText: string;
  @Column({ name: 'source_hash', length: 64 }) sourceHash: string;
  @Column({ name: 'content_format', length: 16, default: 'text' }) contentFormat: 'text' | 'html';
  @Column({ name: 'is_required', type: 'boolean', default: true }) isRequired: boolean;
  @Column({ name: 'is_archived', type: 'boolean', default: false }) isArchived: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
