import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 36, default: '' }) tenantId: string;
  @Column({ name: 'site_id', length: 36, default: '' }) siteId: string;

  @Column({ name: 'agent_id', length: 100, unique: true })
  agentId: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'status', length: 20, default: 'draft' })
  status: 'active' | 'paused' | 'draft';

  @Column({ name: 'model', length: 100 })
  model: string;

  @Column({ name: 'lang', length: 100 })
  lang: string;

  @Column({ name: 'agent_type', length: 30, default: 'sales' })
  agentType: 'sales' | 'translation' | 'sourcing';

  @Column({ name: 'system_prompt', type: 'text', nullable: true })
  systemPrompt: string | null;

  @Column({ name: 'chats', type: 'int', default: 0 })
  chats: number;

  @Column({ name: 'leads', type: 'int', default: 0 })
  leads: number;

  @Column({ name: 'rate', length: 20, default: '—' })
  rate: string;

  @Column({ name: 'satisfaction', type: 'decimal', precision: 2, scale: 1, default: 0 })
  satisfaction: number;

  @Column({ name: 'icon', length: 100 })
  icon: string;

  @Column({ name: 'color', length: 200 })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
