import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'company', length: 255 })
  company: string;

  @Column({ name: 'text', type: 'text' })
  text: string;

  @Column({ name: 'rating', type: 'int', default: 5 })
  rating: number;

  @Column({ name: 'img', length: 500 })
  img: string;

  @Column({ name: 'orders', length: 100 })
  orders: string;

  @Column({ name: 'sort', type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
