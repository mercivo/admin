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
    findOne: jest.fn(),
    save: jest.fn(async (value) => ({ id: 'version-1', version: 1, ...value })),
    create: jest.fn((value) => value),
  };
  const config = {
    get: jest.fn((key: string) => key === 'STOREFRONT_PREVIEW_HOSTS' ? 'site.aihubflux.com' : undefined),
  };
  const translations = { validateForPublish: jest.fn(), messages: jest.fn().mockResolvedValue({ sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } }) };
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
  );

  beforeEach(() => jest.clearAllMocks());

  it('resolves the shared storefront path by tenant id or site slug', async () => {
    const publishedSite = { id: 'site-1', tenantId: 'tenant-1', slug: 'shop-one', status: 'published', publishedVersionId: 'version-1' };
    siteRepo.findOne.mockResolvedValue(publishedSite);
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-1', status: 'active', expiresAt: null });
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
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-domain', status: 'active', expiresAt: null });

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
    tenantRepo.findOne.mockResolvedValue({ id: 'tenant-live', status: 'active', expiresAt: null });

    await expect(service.resolvePublished('live.example.com')).resolves.toMatchObject({
      config: { themeColor: '#123456' },
      products: [expect.objectContaining({ id: 'live-product', price: '128.00' })],
      categories: [{ code: 'live-category', label: '实时分类', parentCode: null, sort: 1 }],
    });
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
});
