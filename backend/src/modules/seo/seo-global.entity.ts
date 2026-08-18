import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('seo_global')
export class SeoGlobal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_name', length: 255 })
  siteName: string;

  @Column({ name: 'title_template', length: 255, nullable: true })
  titleTemplate: string;

  @Column({ name: 'description_template', type: 'text', nullable: true })
  descriptionTemplate: string;

  @Column({ name: 'default_share_image', length: 500, nullable: true })
  defaultShareImage: string;

  @Column({ name: 'ga_id', length: 50, nullable: true })
  gaId: string;

  @Column({ name: 'gc_verification', type: 'text', nullable: true })
  gcVerification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}