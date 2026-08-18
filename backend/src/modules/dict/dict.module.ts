import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictType } from './dict-type.entity';
import { DictEntry } from './dict-entry.entity';
import { DictService } from './dict.service';
import { DictController } from './dict.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DictType, DictEntry])],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}