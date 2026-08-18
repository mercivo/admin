import { ExecutionContext } from '@nestjs/common';
import { PlanPermissionsGuard } from './plan-permissions.guard';

describe('PlanPermissionsGuard', () => {
  const tenantRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'tenant-1',
      permissions: ['settings.site', 'settings.team', 'site.publish', 'site.domain'],
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
    ['PUT', '/api/v1/workspace/settings/site'],
    ['POST', '/api/v1/workspace/team'],
    ['PUT', '/api/v1/workspace/team/member-1'],
    ['POST', '/api/v1/admin/sites/site-1/publish'],
    ['POST', '/api/v1/admin/sites/site-1/rollback'],
    ['GET', '/api/v1/admin/sites/site-1/domains'],
    ['POST', '/api/v1/admin/sites/site-1/domains'],
    ['POST', '/api/v1/admin/sites/domains/domain-1/verify'],
    ['DELETE', '/api/v1/admin/sites/domains/domain-1'],
  ])('allows merchant administrators to use granted setting permission: %s %s', async (method, path) => {
    await expect(guard.canActivate(context(method, path))).resolves.toBe(true);
  });
});
