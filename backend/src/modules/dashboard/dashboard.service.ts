import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { Lead } from '../lead/lead.entity';
import { Agent } from '../agent/agent.entity';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Agent) private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(AppConfig) private readonly configRepository: Repository<AppConfig>,
  ) {}

  async getStats(siteId: string) {
    const [totalProducts, totalLeads, newLeads, convertedLeads, agents, customers, dashboardConfig] = await Promise.all([
      this.productRepository.count({ where: { siteId } }),
      this.leadRepository.count({ where: { siteId } }),
      this.leadRepository.count({ where: { siteId, status: 'new' } }),
      this.leadRepository.count({ where: { siteId, status: 'converted' } }),
      this.agentRepository.find({ where: { siteId } }),
      this.customerRepository.find({ where: { siteId } }),
      this.configRepository.findOne({ where: { key: `${siteId}:dashboard` } }).then(async scoped => scoped || this.configRepository.findOne({ where: { key: 'dashboard' } })),
    ]);

    const topProducts = await this.productRepository.find({
      where: { siteId, status: 'published' },
      order: { stock: 'DESC' },
      take: 4,
    });

    const recentLeads = await this.leadRepository.find({
      where: { siteId }, order: { createdAt: 'DESC' },
      take: 5,
    });

    const leads = await this.leadRepository.find({ where: { siteId } });

    return {
      totalProducts,
      totalLeads,
      newLeads,
      convertedLeads,
      aiChats: agents.reduce((sum, agent) => sum + agent.chats, 0),
      aiLeads: agents.reduce((sum, agent) => sum + agent.leads, 0),
      activeAgents: agents.filter(agent => agent.status === 'active').length,
      aiSatisfaction: agents.length ? Number((agents.reduce((sum, agent) => sum + Number(agent.satisfaction), 0) / agents.length).toFixed(1)) : 0,
      customerValue: customers.reduce((sum, customer) => sum + Number(customer.totalAmount), 0),
      traffic: Array.isArray((dashboardConfig?.value as { traffic?: unknown[] } | undefined)?.traffic) ? (dashboardConfig?.value as { traffic: unknown[] }).traffic : [],
      topProducts: topProducts.map((p) => {
        const inquiries = leads.filter((lead) =>
          `${lead.product} ${lead.summary}`.toLowerCase().includes(p.category.toLowerCase()),
        ).length;
        return {
          name: p.nameEn,
          views: p.stock,
          inquiries,
          rate: totalLeads ? Math.round((inquiries / totalLeads) * 100) : 0,
        };
      }),
      recentLeads,
    };
  }
}
