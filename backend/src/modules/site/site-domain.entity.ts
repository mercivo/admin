import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_domains')
export class SiteDomain {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ length: 255, unique: true }) hostname: string;
  @Column({ name: 'is_primary', type: 'boolean', default: false }) isPrimary: boolean;
  @Column({ name: 'ssl_status', length: 20, default: 'pending' }) sslStatus: 'pending' | 'active' | 'failed';
  @Column({ length: 20, default: 'active' }) status: 'active' | 'disabled';
  @Column({ name: 'verification_token', type: 'varchar', length: 64, nullable: true, select: false }) verificationToken: string | null;
  @Column({ name: 'verified_at', type: 'datetime', nullable: true }) verifiedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
