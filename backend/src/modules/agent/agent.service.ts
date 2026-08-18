import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';
import { Tenant } from '../site/tenant.entity';
import { AgentPreset } from './agent-preset.entity';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(AgentPreset) private readonly presetRepository: Repository<AgentPreset>,
  ) {}

  async findAll(siteId: string): Promise<Agent[]> {
    return this.agentRepository.find({ where: { siteId }, order: { createdAt: 'DESC' } });
  }

  listPresets(): Promise<AgentPreset[]> {
    return this.presetRepository.find({ where: { enabled: true }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async installPreset(presetId: string, tenantId: string, siteId: string): Promise<Agent> {
    const preset = await this.presetRepository.findOne({ where: { id: presetId, enabled: true } });
    if (!preset) throw new NotFoundException('预制智能体不存在或已下架');
    return this.create({
      agentId: `preset-${preset.code}-${Date.now().toString(36)}`,
      name: preset.name,
      description: preset.description,
      status: 'draft',
      model: preset.model,
      lang: preset.lang,
      agentType: preset.agentType,
      systemPrompt: preset.systemPrompt || undefined,
      icon: preset.icon,
      color: preset.color,
    }, tenantId, siteId);
  }

  async findById(agentId: string, siteId: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: [{ agentId, siteId }, { id: agentId, siteId }] });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }
    return agent;
  }

  async create(dto: CreateAgentDto, tenantId: string, siteId: string): Promise<Agent> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.features?.ai === false || await this.agentRepository.count({ where: { tenantId } }) >= tenant.maxAgents) throw new ForbiddenException('智能体权限未开通或已达到套餐上限');
    const agent = this.agentRepository.create({ ...dto, tenantId, siteId });
    return this.agentRepository.save(agent);
  }

  async update(agentId: string, dto: UpdateAgentDto, siteId: string): Promise<Agent> {
    const agent = await this.findById(agentId, siteId);
    Object.assign(agent, dto);
    return this.agentRepository.save(agent);
  }

  async remove(agentId: string, siteId: string): Promise<void> {
    const agent = await this.findById(agentId, siteId);
    await this.agentRepository.remove(agent);
  }
}
