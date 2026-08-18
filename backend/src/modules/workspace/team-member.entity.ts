import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true, unique: true }) userId: string | null;
  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;
  @Column({ length: 255 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) email: string | null;
  @Column({ length: 20, default: 'viewer' }) role: 'admin' | 'editor' | 'viewer';
  @Column({ type: 'json', nullable: true }) permissions: string[] | null;
  @Column({ length: 10 }) avatar: string;
  @Column({ length: 100, default: 'bg-gray-500 text-white' }) color: string;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
