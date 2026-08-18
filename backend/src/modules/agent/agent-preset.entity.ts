import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('agent_presets')
export class AgentPreset {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 60, unique: true }) code: string;
  @Column({ length: 120 }) name: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'agent_type', length: 30 }) agentType: 'sales' | 'translation' | 'sourcing';
  @Column({ length: 100, default: 'gpt-4o-mini' }) model: string;
  @Column({ length: 100, default: '多语言' }) lang: string;
  @Column({ name: 'system_prompt', type: 'text', nullable: true }) systemPrompt: string | null;
  @Column({ length: 100, default: 'Bot' }) icon: string;
  @Column({ length: 200, default: 'bg-primary/10 text-primary border-primary/20' }) color: string;
  @Column({ type: 'boolean', default: true }) enabled: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
