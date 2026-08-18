import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('app_configs')
export class AppConfig {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'json' })
  value: Record<string, unknown> | unknown[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
