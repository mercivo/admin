import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dict_types')
@Index('uq_dict_types_site_type', ['siteId', 'typeId'], { unique: true })
export class DictType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'type_id', length: 100 })
  typeId: string;

  @Column({ name: 'label', length: 255 })
  label: string;

  @Column({ name: 'icon', length: 50 })
  icon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
