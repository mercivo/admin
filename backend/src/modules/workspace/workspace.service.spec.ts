import { WorkspaceService } from './workspace.service';

describe('WorkspaceService quota usage', () => {
  it('returns limits and current usage for every user-facing quota', async () => {
    const configRepo = {
      findOne: jest.fn().mockImplementation(({ where }: { where: { key: string } }) => Promise.resolve({ key: where.key, value: {} })),
    };
    const teamRepo = {};
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1', role: 'admin', phone: null, createdAt: new Date() }),
      count: jest.fn().mockResolvedValue(3),
    };
    const tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Demo', plan: 'pro', status: 'active', expiresAt: null, maxProducts: 100, maxMembers: 5, maxSites: 2, maxWarehouses: 4, permissions: [], features: {} }),
    };
    const siteRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', slug: 'demo', name: 'Demo Site', status: 'draft', defaultLanguage: 'zh', defaultCurrency: 'CNY' }),
      count: jest.fn().mockResolvedValue(1),
    };
    const domainRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const productRepo = { count: jest.fn().mockResolvedValue(12) };
    const warehouseRepo = { count: jest.fn().mockResolvedValue(2) };
    const service = new WorkspaceService(
      configRepo as never,
      teamRepo as never,
      userRepo as never,
      tenantRepo as never,
      siteRepo as never,
      domainRepo as never,
      productRepo as never,
      warehouseRepo as never,
    );

    const result = await service.getSettings('user-1', 'tenant-1', 'site-1');

    expect(result.billing.limits).toEqual({ products: 100, members: 5, sites: 2, warehouses: 4 });
    expect(result.billing.usage).toEqual({ products: 12, members: 3, sites: 1, warehouses: 2 });
  });
});
