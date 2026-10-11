import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('product_categories')
@Index('uq_product_categories_site_code', ['siteId', 'code'], { unique: true })
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;
  @Column({ length: 100 }) code: string;
  @Column({ length: 255 }) label: string;
  @Column({ type: 'int', default: 0 }) sort: number;
  @Column({ length: 20, default: 'enabled' }) status: 'enabled' | 'disabled';
  @Column({ length: 500, default: '' }) remark: string;
  @Column({ name: 'parent_code', type: 'varchar', length: 100, nullable: true }) parentCode: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
