import { ExecutionContext } from '@nestjs/common';
import { PlanPermissionsGuard } from './plan-permissions.guard';

describe('PlanPermissionsGuard', () => {
  const tenantRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'tenant-1',
      permissions: ['page.site.settings', 'settings.site', 'settings.team', 'site.publish', 'site.domain', 'page.settings.team', 'page.site.translations', 'site.translation.edit'],
    }),
  };
  const guard = new PlanPermissionsGuard(tenantRepository as never);

  const context = (method: string, originalUrl: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        originalUrl,
        user: { role: 'admin', tenantId: 'tenant-1', permissions: [] },
      }),
    }),
  } as unknown as ExecutionContext);

  it.each([
    ['PUT', '/api/v1/workspace/settings/site-info'],
    ['PUT', '/api/v1/workspace/settings/site-languages'],
    ['GET', '/api/v1/workspace/settings/site-contact'],
    ['PUT', '/api/v1/workspace/settings/site-contact'],
    ['GET', '/api/v1/workspace/config/seo'],
    ['PUT', '/api/v1/workspace/config/seo'],
    ['POST', '/api/v1/product/site-logo'],
    ['POST', '/api/v1/product/site-favicon'],
    ['POST', '/api/v1/workspace/team'],
    ['PUT', '/api/v1/workspace/team/member-1'],
    ['POST', '/api/v1/admin/sites/site-1/publish'],
    ['POST', '/api/v1/admin/sites/site-1/rollback'],
    ['GET', '/api/v1/admin/sites/site-1/domains'],
    ['POST', '/api/v1/admin/sites/site-1/domains'],
    ['POST', '/api/v1/admin/sites/domains/domain-1/verify'],
    ['DELETE', '/api/v1/admin/sites/domains/domain-1'],
    ['GET', '/api/v1/translations?locale=en_US'],
    ['PUT', '/api/v1/translations'],
    ['POST', '/api/v1/translations/import/en_US/preview'],
    ['POST', '/api/v1/translations/import/en_US/commit'],
    ['GET', '/api/v1/translations/import/report/token-1'],
  ])('allows merchant administrators to use granted setting permission: %s %s', async (method, path) => {
    await expect(guard.canActivate(context(method, path))).resolves.toBe(true);
  });

  it('separates viewing site settings from editing them', async () => {
    const viewOnlyGuard = new PlanPermissionsGuard({ findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', permissions: ['page.site.settings'] }) } as never);
    await expect(viewOnlyGuard.canActivate(context('GET', '/api/v1/workspace/config/seo'))).resolves.toBe(true);
    await expect(viewOnlyGuard.canActivate(context('PUT', '/api/v1/workspace/config/seo'))).rejects.toThrow('当前账号未开通此权限');
  });

  it('separates viewing translations from editing them', async () => {
    const viewOnlyGuard = new PlanPermissionsGuard({ findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', permissions: ['page.site.translations'] }) } as never);
    await expect(viewOnlyGuard.canActivate(context('GET', '/api/v1/translations?locale=en_US'))).resolves.toBe(true);
    await expect(viewOnlyGuard.canActivate(context('PUT', '/api/v1/translations'))).rejects.toThrow('当前账号未开通此权限');
  });
});
