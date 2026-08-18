import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_versions')
export class SiteVersion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ type: 'int' }) version: number;
  @Column({ length: 20, default: 'published' }) status: 'published' | 'archived';
  @Column({ type: 'json' }) snapshot: Record<string, unknown>;
  @Column({ name: 'published_by', length: 255, default: 'system' }) publishedBy: string;
  @CreateDateColumn({ name: 'published_at' }) publishedAt: Date;
}
