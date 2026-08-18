import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './agent.entity';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { Tenant } from '../site/tenant.entity';
import { AgentPreset } from './agent-preset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentPreset, Tenant])],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
