import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../modules/site/tenant.entity';

const RULES: Array<{ method?: string; pattern: RegExp; permission: string | string[] }> = [
  { method: 'GET', pattern: /^\/api\/v1\/dashboard/, permission: 'page.dashboard' },
  { method: 'GET', pattern: /^\/api\/v1\/storefront\/overview/, permission: ['page.dashboard', 'page.storefront.leads'] },
  { method: 'GET', pattern: /^\/api\/v1\/storefront\/product-pool/, permission: 'page.storefront.products' },
  { method: 'GET', pattern: /^\/api\/v1\/storefront\/leads/, permission: 'page.storefront.leads' },
  { method: 'GET', pattern: /^\/api\/v1\/storefront\/lead-assignees$/, permission: 'storefront.lead.assign' },
  { method: 'POST', pattern: /^\/api\/v1\/storefront\/leads$/, permission: 'storefront.lead.manage' },
  { method: 'PATCH', pattern: /^\/api\/v1\/storefront\/leads\//, permission: ['storefront.lead.assign', 'storefront.lead.manage'] },
  { method: 'GET', pattern: /^\/api\/v1\/product/, permission: 'page.products' },
  { method: 'POST', pattern: /^\/api\/v1\/product$/, permission: 'product.create' },
  { method: 'POST', pattern: /^\/api\/v1\/product\/images/, permission: 'product.edit' },
  { method: 'POST', pattern: /^\/api\/v1\/product\/site-logo/, permission: 'settings.site' },
  { method: 'PATCH', pattern: /^\/api\/v1\/product\/batch-status$/, permission: 'product.publish' },
  { method: 'PUT', pattern: /^\/api\/v1\/product\//, permission: 'product.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/product\//, permission: 'product.delete' },
  { method: 'POST', pattern: /^\/api\/v1\/customers\/levels(?:\/|$)/, permission: 'customer.level.manage' },
  { method: 'PUT', pattern: /^\/api\/v1\/customers\/levels(?:\/|$)/, permission: 'customer.level.manage' },
  { method: 'DELETE', pattern: /^\/api\/v1\/customers\/levels(?:\/|$)/, permission: 'customer.level.manage' },
  { method: 'GET', pattern: /^\/api\/v1\/customers/, permission: 'page.customers' },
  { method: 'POST', pattern: /^\/api\/v1\/customers/, permission: 'customer.create' },
  { method: 'PUT', pattern: /^\/api\/v1\/customers/, permission: 'customer.edit' },
  { method: 'DELETE', pattern: /^\/api\/v1\/customers/, permission: 'customer.delete' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/settings\/site-info/, permission: 'settings.site' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/settings\/site-languages/, permission: 'settings.site' },
  { method: 'GET', pattern: /^\/api\/v1\/workspace\/settings\/site-contact/, permission: 'page.site.settings' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/settings\/site-contact/, permission: 'settings.site' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/config\/seo/, permission: 'settings.site' },
  { method: 'GET', pattern: /^\/api\/v1\/workspace\/config\/seo/, permission: 'page.site.settings' },
  { method: 'GET', pattern: /^\/api\/v1\/workspace\/config\/siteEditor/, permission: 'page.site.editor' },
  { method: 'PUT', pattern: /^\/api\/v1\/workspace\/config\/siteEditor/, permission: 'site.edit' },
  { method: 'GET', pattern: /^\/api\/v1\/translations/, permission: 'page.site.translations' },
  { method: 'PUT', pattern: /^\/api\/v1\/translations/, permission: 'site.translation.edit' },
  { method: 'POST', pattern: /^\/api\/v1\/translations\/import/, permission: 'site.translation.edit' },
  { method: 'GET', pattern: /^\/api\/v1\/workspace\/team$/, permission: 'page.settings.team' },
  { pattern: /^\/api\/v1\/workspace\/team(?:\/|$)/, permission: 'settings.team' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/publish/, permission: 'site.publish' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/rollback/, permission: 'site.publish' },
  { method: 'GET', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/domains/, permission: 'site.domain' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/domains/, permission: 'site.domain' },
  { method: 'POST', pattern: /^\/api\/v1\/admin\/sites\/domains\/[^/]+\/verify/, permission: 'site.domain' },
  { method: 'DELETE', pattern: /^\/api\/v1\/admin\/sites\/domains\//, permission: 'site.domain' },
  { method: 'GET', pattern: /^\/api\/v1\/admin\/sites\/[^/]+\/versions/, permission: 'page.storefront.releases' },
  { method: 'GET', pattern: /^\/api\/v1\/admin\/sites(?:\/|$)/, permission: 'page.site.editor' },
  { method: 'PUT', pattern: /^\/api\/v1\/admin\/sites\/[^/]+$/, permission: 'site.edit' },
  { method: 'GET', pattern: /^\/api\/v1\/product-categories/, permission: 'page.product-categories' },
  { pattern: /^\/api\/v1\/product-categories/, permission: 'product-category.manage' },
  { method: 'GET', pattern: /^\/api\/v1\/inventory\/stocks/, permission: 'group.inventory' },
  { method: 'GET', pattern: /^\/api\/v1\/inventory\/ledger/, permission: 'inventory.ledger.view' },
  { method: 'GET', pattern: /^\/api\/v1\/inventory\/warehouses/, permission: 'group.inventory' },
  { pattern: /^\/api\/v1\/inventory\/warehouses/, permission: 'inventory.warehouse.manage' },
  { method: 'GET', pattern: /^\/api\/v1\/inventory\/counts/, permission: 'page.inventory.counts' },
  { method: 'POST', pattern: /^\/api\/v1\/inventory\/counts\/[^/]+\/(start|complete|cancel)$/, permission: 'inventory.count.complete' },
  { pattern: /^\/api\/v1\/inventory\/counts/, permission: 'inventory.count.create' },
  { method: 'GET', pattern: /^\/api\/v1\/inventory\/transfers/, permission: 'page.inventory.transfers' },
  { method: 'POST', pattern: /^\/api\/v1\/inventory\/transfers\/[^/]+\/receive$/, permission: 'inventory.transfer.receive' },
  { pattern: /^\/api\/v1\/inventory\/transfers/, permission: 'inventory.transfer.create' },
  { method: 'GET', pattern: /^\/api\/v1\/finance\/receipts/, permission: 'page.finance.receipts' },
  { method: 'POST', pattern: /^\/api\/v1\/finance\/receipts$/, permission: 'finance.receipt.create' },
  { method: 'PATCH', pattern: /^\/api\/v1\/finance\/receipts\/[^/]+\/confirm$/, permission: 'finance.receipt.confirm' },
  { method: 'PATCH', pattern: /^\/api\/v1\/finance\/receipts\/[^/]+\/cancel$/, permission: 'finance.receipt.cancel' },
  { method: 'GET', pattern: /^\/api\/v1\/finance\/receivable-orders/, permission: 'finance.receipt.create' },
  { method: 'GET', pattern: /^\/api\/v1\/finance\/payments/, permission: 'page.finance.payments' },
  { method: 'POST', pattern: /^\/api\/v1\/finance\/payments$/, permission: 'finance.payment.create' },
  { method: 'PATCH', pattern: /^\/api\/v1\/finance\/payments\/[^/]+\/confirm$/, permission: 'finance.payment.confirm' },
  { method: 'PATCH', pattern: /^\/api\/v1\/finance\/payments\/[^/]+\/cancel$/, permission: 'finance.payment.cancel' },
  { method: 'GET', pattern: /^\/api\/v1\/finance\/payable-orders/, permission: 'finance.payment.create' },
  { method: 'GET', pattern: /^\/api\/v1\/finance\/statistics/, permission: 'page.finance.statistics' },
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
    const required = Array.isArray(rule.permission) ? rule.permission : [rule.permission];
    if (required.some(permission => permissions.includes(permission))) return true;
    throw new ForbiddenException('当前账号未开通此权限');
  }
}
