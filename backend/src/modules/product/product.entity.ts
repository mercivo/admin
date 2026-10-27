import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('products')
@Index('UQ_products_site_sku', ['siteId', 'sku'], { unique: true })
@Index('IDX_products_site_status_created', ['siteId', 'status', 'createdAt'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'name_zh', length: 255 })
  nameZh: string;

  @Column({ name: 'sku', length: 100 })
  sku: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'price', length: 100 })
  price: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  basePrice: number;

  @Column({ name: 'level_prices', type: 'json', nullable: true })
  levelPrices: Record<string, number> | null;

  @Column({ name: 'currency_prices', type: 'json', nullable: true })
  currencyPrices: Record<string, { basePrice: number; levelPrices: Record<string, number> }> | null;

  @Column({ type: 'json', nullable: true })
  variants: Array<{ id: string; specification: string; option: string; stock: number; surcharge: number; surcharges?: Record<string, number> }> | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'stock', type: 'int' })
  stock: number;

  @Column({ name: 'moq', type: 'int' })
  moq: number;

  @Column({ name: 'status', length: 20, default: 'pending' })
  status: 'published' | 'pending';

  @Column({ name: 'category', length: 100 })
  category: string;

  @Column({ name: 'img', length: 500 })
  img: string;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ name: 'hot', type: 'boolean', default: false })
  hot: boolean;

  @Column({ name: 'badge', length: 30, default: '' })
  badge: string;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'main_image', length: 500, nullable: true })
  mainImage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
