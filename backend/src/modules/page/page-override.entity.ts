import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PageType {
  HOME = 'home',
  PRODUCT_LIST = 'product_list',
  PRODUCT_DETAIL = 'product_detail',
  CUSTOM = 'custom',
}

@Entity('page_overrides')
export class PageOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'page_type', type: 'enum', enum: PageType })
  pageType: PageType;

  @Column({ name: 'page_id', length: 255, nullable: true })
  pageId: string;

  @Column({ name: 'language', length: 10 })
  language: string;

  @Column({ name: 'title', length: 255, nullable: true })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'keywords', type: 'json', nullable: true })
  keywords: string[];

  @Column({ name: 'social_title', length: 255, nullable: true })
  socialTitle: string;

  @Column({ name: 'social_description', type: 'text', nullable: true })
  socialDescription: string;

  @Column({ name: 'social_image', length: 500, nullable: true })
  socialImage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}