import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', length: 100 })
  sessionId: string;

  @Column({ name: 'type', length: 20 })
  type: 'system' | 'user' | 'ai' | 'product' | 'confirm' | 'form';

  @Column({ name: 'text', type: 'text', nullable: true })
  text: string;

  @Column({ name: 'product_data', type: 'json', nullable: true })
  productData: { name: string; price: string; img: string };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}