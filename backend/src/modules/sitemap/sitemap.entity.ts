import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('sitemap_info')
export class SitemapInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'last_generated_at', type: 'datetime', nullable: true })
  lastGeneratedAt: Date;

  @Column({ name: 'status', length: 50, default: 'generated' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}