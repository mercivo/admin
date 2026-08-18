import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('hreflang_config')
export class HreflangConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'language', length: 10 })
  language: string;

  @Column({ name: 'base_url', length: 500 })
  baseUrl: string;
}