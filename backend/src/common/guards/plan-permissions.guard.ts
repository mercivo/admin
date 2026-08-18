import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../modules/site/tenant.entity';

const RULES: Array<{ method?: string; pattern: RegExp; permission: string }> = [
  { method: 'GET', pattern: /^\/api\/v1\/dashboard/, permission: 'menu.dashboard' },
  { method: 'GET', pattern: /^\/api\/v1\/product/, permission: 'menu.products' },
  { method: 'POST', pattern: /^\/api\/v1\/product$/, permission: 'product.create' },
  { method: 'POST', pattern: /^\/api\/v1\/product\/images/, permission: 'product.edit' },
  { method: 'PUT', pattern: /^\/api\/v1\/product\//, permission: 'product.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/product\//, permission: 'product.delete' },
  { method: 'GET', pattern: /^\/api\/v1\/customers/, permission: 'menu.customers' },
  { method: 'POST', pattern: /^\/api\/v1\/customers/, permission: 'customer.create' },
  { method: 'PUT', pattern: /^\/api\/v1\/customers/, permission: 'customer.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/customers/, permission: 'customer.delete' },
  { method: 'GET', pattern: /^\/api\/v1\/opportunities/, permission: 'menu.opportunities' },
  { method: 'POST', pattern: /^\/api\/v1\/opportunities/, permission: 'opportunity.create' },
  { method: 'PUT', pattern: /^\/api\/v1\/opportunities/, permission: 'opportunity.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/opportunities/, permission: 'opportunity.delete' },
  { method: 'GET', pattern: /^\/api\/v1\/outreach/, permission: 'menu.outreach' },
  { method: 'POST', pattern: /^\/api\/v1\/outreach\/[^/]+\/schedule$/, permission: 'outreach.schedule' },
  { method: 'POST', pattern: /^\/api\/v1\/outreach$/, permission: 'outreach.create' },
  { method: 'PUT', pattern: /^\/api\/v1\/outreach\//, permission: 'outreach.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/outreach\//, permission: 'outreach.delete' },
  { method: 'GET', pattern: /^\/api\/v1\/lead/, permission: 'menu.leads' },
  { method: 'POST', pattern: /^\/api\/v1\/lead\/[^/]+\/convert/, permission: 'lead.convert' },
  { method: 'PUT', pattern: /^\/api\/v1\/lead\//, permission: 'lead.assign' },
  { method: 'DELETE', pattern: /^\/api\/v1\/lead\//, permission: 'lead.delete' },
  { method: 'GET', pattern: /^\/api\/v1\/agent/, permission: 'menu.agents' },
  { method: 'POST', pattern: /^\/api\/v1\/agent\/presets\/install$/, permission: 'agent.create' },
  { method: 'POST', pattern: /^\/api\/v1\/agent$/, permission: 'agent.create' },
  { method: 'PUT', pattern: /^\/api\/v1\/agent\//, permission: 'agent.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/agent\//, permission: 'agent.delete' },
  { method: 'POST', pattern: /^\/api\/v1\/workspace\/knowledge/, permission: 'agent.knowledge' },
  { method: 'DELETE', pattern: /^\/api\/v1\/workspace\/knowledge/, permission: 'agent.knowledge' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/settings\/account/, permission: 'settings.account' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/settings\/site/, permission: 'settings.site' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/config\/seo/, permission: 'settings.seo' },
  { method: 'GET', pattern: /^\/api\/v1\/workspace\/team$/, permission: 'menu.team' },
  { pattern: /^\/api\/v1\/workspace\/team(?:\/|$)/, permission: 'settings.team' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/publish/, permission: 'site.publish' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/rollback/, permission: 'site.publish' },
  { method: 'GET', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/domains/, permission: 'site.domain' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/domains/, permission: 'site.domain' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/domains\/[^/]+\/verify/, permission: 'site.domain' },
  { method: 'DELETE', pattern: /^\/api\/v1\/admin\/sites\/domains\//, permission: 'site.domain' },
  { pattern: /^\/api\/v1\/dict/, permission: 'dictionary.manage' },
];

@Injectable()
export class PlanPermissionsGuard implements CanActivate {
  constructor(@InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl: string; user?: { role?: string; tenantId?: string; permissions?: string[] } }>();
    if (!request.user?.tenantId || request.user.role === 'system_admin') return true;
    const path = request.originalUrl.split('?')[0];
    const rule = RULES.find(item => (!item.method || item.method === request.method) && item.pattern.test(path));
    if (!rule) return true;
    const tenant = await this.tenants.findOne({ where: { id: request.user.tenantId } });
    const permissions = request.user.role === 'admin' ? tenant?.permissions || [] : request.user.permissions || [];
    if (permissions.includes(rule.permission)) return true;
    throw new ForbiddenException('当前账号未开通此权限');
  }
}
