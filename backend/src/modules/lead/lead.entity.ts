import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'company', length: 255 })
  company: string;

  @Column({ name: 'email', length: 255 })
  email: string;

  @Column({ name: 'phone', length: 50 })
  phone: string;

  @Column({ name: 'country', length: 100 })
  country: string;

  @Column({ name: 'product', length: 255 })
  product: string;

  @Column({ name: 'summary', type: 'text' })
  summary: string;

  @Column({ name: 'status', length: 20, default: 'new' })
  status: 'new' | 'contacted' | 'converted';

  @Column({ name: 'score', type: 'int', default: 0 })
  score: number;

  @Column({ name: 'tag', length: 100 })
  tag: string;

  @Column({ name: 'assigned_to', length: 100, default: '' })
  assignedTo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
