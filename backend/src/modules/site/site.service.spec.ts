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
  const service = new SiteService(
    tenantRepo as any,
    siteRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    emptyRepo as any,
    {} as any,
    config as any,
    {} as any,
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
    await expect(service.publish('site-1', 'tester', 'tenant-1')).resolves.toBeDefined();
    expect(siteRepo.count).not.toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', status: 'published' } });
  });
});
