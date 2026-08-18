import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120, unique: true }) slug: string;
  @Column({ length: 255 }) name: string;
  @Column({ length: 20, default: 'active' }) status: 'active' | 'suspended';
  @Column({ length: 30, default: 'trial' }) plan: string;
  @Column({ name: 'max_products', type: 'int', default: 100 }) maxProducts: number;
  @Column({ name: 'max_agents', type: 'int', default: 2 }) maxAgents: number;
  @Column({ name: 'max_members', type: 'int', default: 1 }) maxMembers: number;
  @Column({ name: 'max_sites', type: 'int', default: 0 }) maxSites: number;
  @Column({ type: 'json', nullable: true }) features: Record<string, boolean> | null;
  @Column({ type: 'json', nullable: true }) permissions: string[] | null;
  @Column({ name: 'permissions_customized', type: 'boolean', default: false }) permissionsCustomized: boolean;
  @Column({ name: 'expires_at', type: 'datetime', nullable: true }) expiresAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
