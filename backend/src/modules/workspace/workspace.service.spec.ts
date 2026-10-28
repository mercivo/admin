import { WorkspaceService } from './workspace.service';

describe('WorkspaceService quota usage', () => {
  it('returns limits and current usage without a site quota', async () => {
    const configRepo = {
      findOne: jest.fn().mockImplementation(({ where }: { where: { key: string } }) => Promise.resolve({ key: where.key, value: {} })),
    };
    const teamRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1', role: 'admin', phone: null, createdAt: new Date() }),
      count: jest.fn().mockResolvedValue(3),
    };
    const tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Demo', plan: 'pro', status: 'active', expiresAt: null, maxProducts: 100, maxMembers: 5, maxWarehouses: 4, permissions: [], features: {} }),
    };
    const siteRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', slug: 'demo', name: 'Demo Site', status: 'draft', defaultLanguage: 'zh_CN', defaultCurrency: 'CNY' }),
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
      {} as never,
    );

    const result = await service.getSettings('user-1', 'tenant-1', 'site-1');

    expect(result.billing.limits).toEqual({ products: 100, members: 5, warehouses: 4 });
    expect(result.billing.usage).toEqual({ products: 12, members: 3, warehouses: 2 });
  });

  it('returns member-effective permissions instead of all tenant permissions', async () => {
    const configRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const teamRepo = { findOne: jest.fn().mockResolvedValue({ userId: 'user-2', name: '销售小李', email: null }) };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-2', tenantId: 'tenant-1', role: 'member', phone: '13900000000', permissions: ['menu.dashboard', 'page.dashboard'], createdAt: new Date() }),
      count: jest.fn().mockResolvedValue(2),
    };
    const tenantRepo = { findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Demo', plan: 'pro', status: 'active', expiresAt: null, maxProducts: 100, maxMembers: 5, maxWarehouses: 4, permissions: ['menu.dashboard', 'page.dashboard', 'group.products', 'menu.products', 'page.products'], features: {} }) };
    const siteRepo = { findOne: jest.fn().mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', slug: 'demo', name: 'Demo Site', status: 'draft', defaultLanguage: 'zh_CN', defaultCurrency: 'CNY' }) };
    const service = new WorkspaceService(configRepo as never, teamRepo as never, userRepo as never, tenantRepo as never, siteRepo as never, { findOne: jest.fn().mockResolvedValue(null) } as never, { count: jest.fn().mockResolvedValue(0) } as never, { count: jest.fn().mockResolvedValue(1) } as never, {} as never);

    const result = await service.getSettings('user-2', 'tenant-1', 'site-1');

    expect(result.billing.permissions).toEqual(['menu.dashboard', 'page.dashboard']);
  });

  it('changes the site default currency only through the central currency config', async () => {
    const current = {
      defaultCurrency: 'CNY', purchaseDefaultCurrency: 'CNY', salesDefaultCurrency: 'BAM',
      currencies: [
        { code: 'CNY', name: '人民币', symbol: '¥', enabled: true },
        { code: 'BAM', name: '波黑可兑换马克', symbol: 'KM', enabled: true },
      ],
    };
    const configRepo = {
      findOne: jest.fn().mockResolvedValue({ key: 'site-1:currency', value: current }),
      save: jest.fn(async (value) => value),
    };
    const site = { id: 'site-1', tenantId: 'tenant-1', name: 'Demo', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' };
    const siteRepo = { findOne: jest.fn().mockResolvedValue(site), save: jest.fn(async (value) => value) };
    const service = new WorkspaceService(
      configRepo as never, {} as never, {} as never, {} as never, siteRepo as never, {} as never,
      { find: jest.fn() } as never, {} as never, {} as never,
    );

    await service.updateConfig('currency', { ...current, defaultCurrency: 'BAM' }, 'site-1');

    expect(site.defaultCurrency).toBe('BAM');
    expect(siteRepo.save).toHaveBeenCalledWith(expect.objectContaining({ defaultCurrency: 'BAM' }));
  });

  it('does not let site-information updates overwrite the central default currency', async () => {
    const previousPublicBase = process.env.GCS_PUBLIC_BASE_URL;
    process.env.GCS_PUBLIC_BASE_URL = 'https://cdn.example';
    const site = { id: 'site-1', tenantId: 'tenant-1', name: 'Demo', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' };
    const configRepo = { findOne: jest.fn().mockResolvedValue({ value: { faviconUrl: 'https://cdn.example/tenants/tenant-1/sites/site-1/favicon/icon.png' } }), save: jest.fn(async (value) => value) };
    const siteRepo = { findOne: jest.fn().mockResolvedValue(site), save: jest.fn(async (value) => value) };
    const service = new WorkspaceService(
      configRepo as never, {} as never, {} as never, {} as never, siteRepo as never, {} as never,
      {} as never, {} as never, {} as never,
    );

    await service.updateSiteInfo({ name: 'New name', description: '' }, 'tenant-1', 'site-1');
    await service.updateSiteLanguages({ defaultLanguage: 'en_US', supportedLanguages: ['en_US'] }, 'tenant-1', 'site-1');

    expect(site).toMatchObject({ name: 'New name', defaultLanguage: 'en_US', defaultCurrency: 'CNY' });
    expect(configRepo.save).toHaveBeenCalledWith(expect.objectContaining({ value: expect.objectContaining({ faviconUrl: 'https://cdn.example/tenants/tenant-1/sites/site-1/favicon/icon.png' }) }));
    if (previousPublicBase === undefined) delete process.env.GCS_PUBLIC_BASE_URL; else process.env.GCS_PUBLIC_BASE_URL = previousPublicBase;
  });
});

describe('WorkspaceService member removal', () => {
  it('releases only active leads before deleting the member account', async () => {
    const member = { id: 'member-row-1', userId: 'user-2', siteId: 'site-1', role: 'member' };
    const teamRepo = { findOne: jest.fn().mockResolvedValue(member), remove: jest.fn().mockResolvedValue(member) };
    const userRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const leadRepo = { update: jest.fn().mockResolvedValue({ affected: 2 }) };
    const service = new WorkspaceService(
      {} as never, teamRepo as never, userRepo as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, leadRepo as never,
    );

    await service.deleteMember('member-row-1', { userId: 'admin-1', role: 'admin', tenantId: 'tenant-1', siteId: 'site-1' } as never);

    expect(leadRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: 'site-1', assignedToUserId: 'user-2', status: expect.anything() }),
      { status: 'new', assignedToUserId: null, assignedToName: '' },
    );
    expect((leadRepo.update.mock.calls[0][0].status as { value: string[] }).value).toEqual(['new', 'following']);
    expect(teamRepo.remove).toHaveBeenCalledWith(member);
    expect(userRepo.delete).toHaveBeenCalledWith({ id: 'user-2', tenantId: 'tenant-1' });
  });
});

describe('WorkspaceService account settings', () => {
  it('lets a member update only their name and email', async () => {
    const member = { userId: 'user-2', name: '销售小李', email: 'old@example.com' };
    const teamRepo = { findOne: jest.fn().mockResolvedValue(member), exists: jest.fn().mockResolvedValue(false), save: jest.fn(async value => value) };
    const userRepo = { findOne: jest.fn().mockResolvedValue({ id: 'user-2', role: 'member', phone: '13900000000' }) };
    const tenant = { id: 'tenant-1', name: '验收企业' };
    const tenantRepo = { findOne: jest.fn().mockResolvedValue(tenant), save: jest.fn() };
    const service = new WorkspaceService({} as never, teamRepo as never, userRepo as never, tenantRepo as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(service, 'getSettings').mockResolvedValue({} as never);

    await service.updateAccount({ enterpriseName: '恶意改名', memberName: '销售小王', phone: '18800000000', email: 'wang@example.com', timezone: 'Asia/Shanghai' }, 'user-2', 'tenant-1', 'site-1');

    expect(member).toMatchObject({ name: '销售小王', email: 'wang@example.com' });
    expect(tenant.name).toBe('验收企业');
    expect(tenantRepo.save).not.toHaveBeenCalled();
  });

  it('lets an administrator update the enterprise name without changing the phone', async () => {
    const user = { id: 'admin-1', role: 'admin', phone: '13800000000' };
    const userRepo = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn() };
    const tenant = { id: 'tenant-1', name: '旧企业' };
    const tenantRepo = { findOne: jest.fn().mockResolvedValue(tenant), save: jest.fn(async value => value) };
    const configRepo = { save: jest.fn(async value => value) };
    const teamRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new WorkspaceService(configRepo as never, teamRepo as never, userRepo as never, tenantRepo as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(service, 'getSettings').mockResolvedValue({} as never);

    await service.updateAccount({ enterpriseName: '新企业', phone: '18800000000', email: 'admin@example.com', timezone: 'Asia/Shanghai' }, 'admin-1', 'tenant-1', 'site-1');

    expect(tenant.name).toBe('新企业');
    expect(user.phone).toBe('13800000000');
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
