import { BadRequestException } from '@nestjs/common';
import { SiteService } from './site.service';

describe('SiteService single site model', () => {
  const tenantRepo = {
    findOne: jest.fn(),
  };
  const siteRepo = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const emptyRepo = {
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ id: 'version-1', version: 1, ...value })),
    create: jest.fn((value) => value),
    delete: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => key === 'STOREFRONT_PREVIEW_HOSTS' ? 'site.aihubflux.com' : undefined),
  };
  const translations = {
    validateForPublish: jest.fn(),
    messages: jest.fn().mockResolvedValue({ sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } }),
    publicSiteAccessNotice: jest.fn().mockResolvedValue({ locale: 'zh_CN', title: '站点暂时无法访问', description: '访问权限已关闭。' }),
  };
  const customHostnames = {
    isConfigured: jest.fn().mockReturnValue(false),
    create: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  };
  const service = new SiteService(
    tenantRepo as any,
    siteRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    config as any,
    translations as any,
    customHostnames as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('activates a domain only when both the hostname and TLS are active', () => {
    const domain = { status: 'provisioning', sslStatus: 'pending', providerError: null, providerSyncedAt: null } as any;
    (service as any).applyProviderStatus(domain, { id: 'cf-1', hostname: 'shop.example.com', status: 'active', ssl: { status: 'active' } });
    expect(domain).toMatchObject({ status: 'active', sslStatus: 'active', providerError: null });
  });

  it('keeps a domain provisioning while Cloudflare TLS is pending', () => {
    const domain = { status: 'provisioning', sslStatus: 'pending', providerError: null, providerSyncedAt: null } as any;
    (service as any).applyProviderStatus(domain, { id: 'cf-1', hostname: 'shop.example.com', status: 'pending', ssl: { status: 'pending_validation' } });
    expect(domain).toMatchObject({ status: 'provisioning', sslStatus: 'pending', providerError: null });
  });

  it('normalizes and deduplicates Cloudflare ownership and certificate validation records', () => {
    const domain = { status: 'provisioning', sslStatus: 'pending', providerError: null, providerSyncedAt: null } as any;
    (service as any).applyProviderStatus(domain, {
      id: 'cf-1', hostname: 'shop.example.com', status: 'pending',
      ownership_verification: { type: 'txt', name: '_cf-custom-hostname.shop.example.com', value: 'ownership' },
      ssl: { status: 'pending_validation', validation_records: [
        { txt_name: '_acme-challenge.shop.example.com', txt_value: 'certificate' },
        { txt_name: '_acme-challenge.shop.example.com', txt_value: 'certificate' },
      ] },
    });
    expect(domain.providerValidationRecords).toEqual([
      { type: 'TXT', name: '_cf-custom-hostname.shop.example.com', value: 'ownership' },
      { type: 'TXT', name: '_acme-challenge.shop.example.com', value: 'certificate' },
    ]);
  });

  it('records a retryable failure when provider synchronization fails', async () => {
    const domain = { id: 'domain-1', hostname: 'shop.example.com', status: 'provisioning', sslStatus: 'pending', providerHostnameId: 'cf-1' } as any;
    customHostnames.get.mockRejectedValueOnce(new Error('rate limited'));
    await expect((service as any).provisionOrSyncDomain(domain)).rejects.toThrow('rate limited');
    expect(emptyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', sslStatus: 'failed', providerError: 'rate limited' }));
  });

  it('does not delete the local domain when provider deletion fails', async () => {
    emptyRepo.findOne.mockResolvedValueOnce({ id: 'domain-1', siteId: 'site-1', providerHostnameId: 'cf-1' });
    siteRepo.findOne.mockResolvedValueOnce({ id: 'site-1', tenantId: 'tenant-1' });
    customHostnames.remove.mockRejectedValueOnce(new Error('provider unavailable'));
    await expect(service.removeDomain('domain-1', 'tenant-1')).rejects.toThrow('provider unavailable');
    expect(emptyRepo.delete).not.toHaveBeenCalled();
  });

  it('resolves the shared storefront path by tenant id or site slug', async () => {
    const publishedSite = { id: 'site-1', tenantId: 'tenant-1', slug: 'shop-one', status: 'published', publishedVersionId: 'version-1' };
    siteRepo.findOne.mockResolvedValue(publishedSite);
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-1', status: 'active', expiresAt: null, permissions: ['site.publish'] });
    emptyRepo.findOne.mockResolvedValue({ id: 'version-1', siteId: 'site-1' });

    await expect(service.resolvePublicSite('site.aihubflux.com', 'tenant-1')).resolves.toBe(publishedSite);
    expect(siteRepo.findOne).toHaveBeenCalledWith({ where: [{ slug: 'tenant-1' }, { tenantId: 'tenant-1' }] });
  });

  it('resolves an active custom domain to its own published tenant site', async () => {
    const publishedSite = { id: 'site-domain', tenantId: 'tenant-domain', slug: 'domain-shop', status: 'published', publishedVersionId: 'version-domain' };
    emptyRepo.findOne
      .mockResolvedValueOnce({ id: 'domain-1', hostname: 'shop.example.com', siteId: 'site-domain', status: 'active' })
      .mockResolvedValueOnce({ id: 'version-domain', siteId: 'site-domain', snapshot: { site: {}, products: [] } })
      .mockResolvedValueOnce(null);
    siteRepo.findOne.mockResolvedValue(publishedSite);
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-domain', status: 'active', expiresAt: null, permissions: ['site.publish'] });

    await expect(service.resolvePublished('SHOP.EXAMPLE.COM:443')).resolves.toMatchObject({ siteId: 'site-domain', versionId: 'version-domain' });
    expect(emptyRepo.findOne).toHaveBeenNthCalledWith(1, { where: { hostname: 'shop.example.com', status: 'active' } });
    expect(siteRepo.findOne).toHaveBeenCalledWith({ where: { id: 'site-domain' } });
  });

  it('serves current product-pool products and categories independently of the published layout snapshot', async () => {
    const publishedSite = { id: 'site-live', tenantId: 'tenant-live', slug: 'live-shop', status: 'published', publishedVersionId: 'version-live', defaultCurrency: 'CNY' };
    emptyRepo.findOne
      .mockResolvedValueOnce({ id: 'domain-live', hostname: 'live.example.com', siteId: 'site-live', status: 'active' })
      .mockResolvedValueOnce({ id: 'version-live', siteId: 'site-live', version: 3, snapshot: { site: { defaultLanguage: 'zh_CN', defaultCurrency: 'CNY' }, config: { themeColor: '#123456' }, products: [{ id: 'stale-product' }], categories: [{ code: 'stale-category' }] } })
      .mockResolvedValueOnce(null);
    emptyRepo.find
      .mockResolvedValueOnce([{ id: 'live-product', siteId: 'site-live', status: 'published', basePrice: 99, currencyPrices: { CNY: { basePrice: 128 } }, variants: [] }])
      .mockResolvedValueOnce([{ code: 'live-category', label: '实时分类', parentCode: null, sort: 1 }]);
    siteRepo.findOne.mockResolvedValue(publishedSite);
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-live', status: 'active', expiresAt: null, permissions: ['site.publish'] });

    await expect(service.resolvePublished('live.example.com')).resolves.toMatchObject({
      config: { themeColor: '#123456' },
      products: [expect.objectContaining({ id: 'live-product', basePrice: 128, price: '128.00' })],
      categories: [{ code: 'live-category', label: '实时分类', parentCode: null, sort: 1 }],
    });
  });

  it.each([
    ['SITE_PLAN_EXPIRED', { permissions: ['site.publish'], expiresAt: new Date(Date.now() - 1_000) }],
    ['SITE_PUBLISH_PERMISSION_REQUIRED', { permissions: [], expiresAt: null }],
  ])('blocks published site content with %s while retaining the published version', async (errorCode, tenantState) => {
    siteRepo.findOne.mockResolvedValue({ id: 'site-blocked', tenantId: 'tenant-blocked', slug: 'blocked', status: 'published', publishedVersionId: 'version-blocked' });
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-blocked', status: 'active', ...tenantState });
    emptyRepo.findOne.mockResolvedValue({ id: 'version-blocked', siteId: 'site-blocked' });

    await expect(service.resolvePublished('site.aihubflux.com', 'blocked', 'zh_CN')).rejects.toMatchObject({
      response: { errorCode, data: expect.objectContaining({ title: '站点暂时无法访问' }) },
    });
    await expect(service.sitemap('site.aihubflux.com', 'blocked')).rejects.toMatchObject({ response: { errorCode } });
    await expect(service.robots('site.aihubflux.com', 'blocked')).rejects.toMatchObject({ response: { errorCode } });
    expect(siteRepo.save).not.toHaveBeenCalled();
  });

  it('denies domain authorization when the tenant lacks publish permission', async () => {
    emptyRepo.findOne.mockResolvedValueOnce({ id: 'domain-1', hostname: 'blocked.example.com', siteId: 'site-blocked', status: 'active' });
    siteRepo.findOne.mockResolvedValue({ id: 'site-blocked', tenantId: 'tenant-blocked', status: 'published', publishedVersionId: 'version-blocked' });
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-blocked', status: 'active', expiresAt: null, permissions: [] });

    await expect(service.authorizeDomain('blocked.example.com')).resolves.toBe(false);
  });

  it('allows creating the merchant single draft site', async () => {
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-1' });
    siteRepo.count.mockResolvedValue(0);

    await expect(service.createSite({ tenantId: 'tenant-1', name: 'Draft' } as any)).resolves.toMatchObject({ name: 'Draft' });
    expect(siteRepo.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
  });

  it('blocks creating a second site for the same merchant', async () => {
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-1' });
    siteRepo.count.mockResolvedValue(1);
    await expect(service.createSite({ tenantId: 'tenant-1', name: 'Second' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not use a numeric quota when publishing', async () => {
    siteRepo.findOne.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', status: 'draft' });
    await expect(service.publish('site-1', 'tester', '首次发布', 'tenant-1')).resolves.toBeDefined();
    expect(emptyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ publishedBy: 'tester', releaseNote: '首次发布', version: 1 }));
    expect(siteRepo.count).not.toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', status: 'published' } });
  });

  it('requires a release note when publishing', async () => {
    siteRepo.findOne.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', status: 'draft' });
    await expect(service.publish('site-1', 'tester', '   ', 'tenant-1')).rejects.toThrow('请填写发版备注');
    expect(emptyRepo.save).not.toHaveBeenCalled();
  });

  it('paginates site versions in the database', async () => {
    siteRepo.findOne.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    emptyRepo.findAndCount.mockResolvedValueOnce([[{ id: 'version-11', version: 11 }], 21]);

    await expect(service.listVersions('site-1', 'tenant-1', { page: 2, pageSize: 10 })).resolves.toEqual({
      items: [{ id: 'version-11', version: 11 }], total: 21, page: 2, pageSize: 10,
    });
    expect(emptyRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      where: { siteId: 'site-1' }, skip: 10, take: 10, order: { version: 'DESC' },
    }));
  });
});
