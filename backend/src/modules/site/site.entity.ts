import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36 }) tenantId: string;
  @Column({ length: 120, unique: true }) slug: string;
  @Column({ length: 255 }) name: string;
  @Column({ length: 20, default: 'draft' }) status: 'draft' | 'published';
  @Column({ name: 'default_language', length: 10, default: 'zh' }) defaultLanguage: string;
  @Column({ name: 'supported_languages', type: 'json', nullable: true }) supportedLanguages: string[] | null;
  @Column({ name: 'translation_agent_id', type: 'varchar', length: 36, nullable: true }) translationAgentId: string | null;
  @Column({ name: 'default_currency', length: 10, default: 'CNY' }) defaultCurrency: string;
  @Column({ name: 'guest_price_mode', length: 20, default: 'base' }) guestPriceMode: 'base' | 'hidden';
  @Column({ name: 'published_version_id', type: 'varchar', length: 36, nullable: true }) publishedVersionId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
