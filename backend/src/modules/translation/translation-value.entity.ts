import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('translation_values')
@Index('uq_translation_value_locale', ['unitId', 'locale'], { unique: true })
export class TranslationValue {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'unit_id', length: 36 }) unitId: string;
  @Column({ length: 10 }) locale: string;
  @Column({ type: 'longtext' }) value: string;
  @Column({ name: 'source_hash', length: 64 }) sourceHash: string;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
