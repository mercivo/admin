import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true }) tenantId: string | null;
  @Column({ name: 'site_id', type: 'varchar', length: 36, nullable: true }) siteId: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true }) phone: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true }) username: string | null;
  @Column({ name: 'password_hash', length: 255 }) passwordHash: string;
  @Column({ length: 30, default: 'admin' }) role: 'system_admin' | 'admin' | 'editor' | 'viewer';
  @Column({ type: 'json', nullable: true }) permissions: string[] | null;
  @Column({ length: 20, default: 'active' }) status: 'active' | 'disabled';
  @Column({ name: 'last_login_at', type: 'datetime', nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
