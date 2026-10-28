import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_domains')
export class SiteDomain {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'site_id', length: 36 }) siteId: string;
  @Column({ name: 'requested_hostname', type: 'varchar', length: 255, nullable: true }) requestedHostname: string | null;
  @Column({ length: 255, unique: true }) hostname: string;
  @Column({ name: 'is_primary', type: 'boolean', default: false }) isPrimary: boolean;
  @Column({ name: 'ssl_status', length: 20, default: 'pending' }) sslStatus: 'pending' | 'active' | 'failed';
  @Column({ length: 20, default: 'pending_dns' }) status: 'pending_dns' | 'pending_verification' | 'provisioning' | 'active' | 'failed';
  @Column({ name: 'verification_token', type: 'varchar', length: 64, nullable: true, select: false }) verificationToken: string | null;
  @Column({ name: 'verified_at', type: 'datetime', nullable: true }) verifiedAt: Date | null;
  @Column({ name: 'provider_hostname_id', type: 'varchar', length: 64, nullable: true }) providerHostnameId: string | null;
  @Column({ name: 'provider_error', type: 'varchar', length: 500, nullable: true }) providerError: string | null;
  @Column({ name: 'provider_synced_at', type: 'datetime', nullable: true }) providerSyncedAt: Date | null;
  @Column({ name: 'provider_validation_records', type: 'json', nullable: true }) providerValidationRecords: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string }> | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
