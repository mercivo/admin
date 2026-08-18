import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dict_entries')
@Index('uq_dict_entries_site_type_code', ['siteId', 'typeId', 'code'], { unique: true })
export class DictEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'type_id', length: 100 })
  typeId: string;

  @Column({ name: 'code', length: 100 })
  code: string;

  @Column({ name: 'label', length: 255 })
  label: string;

  @Column({ name: 'sort', type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status', length: 20, default: 'enabled' })
  status: 'enabled' | 'disabled';

  @Column({ name: 'remark', length: 500, default: '' })
  remark: string;

  @Column({ name: 'parent_code', length: 100, nullable: true })
  parentCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
