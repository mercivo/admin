import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageOverride } from './page-override.entity';
import { PageService } from './page.service';
import { PageController } from './page.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PageOverride])],
  controllers: [PageController],
  providers: [PageService],
  exports: [PageService],
})
export class PageModule {}