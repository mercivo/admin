import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let products: Record<string, jest.Mock>;
  let tenants: Record<string, jest.Mock>;
  let dictionaries: Record<string, jest.Mock>;
  const dto = {
    nameZh: '测试商品', nameEn: 'Test Product', sku: 'P-001', description: '<p>安全<strong>描述</strong><script>alert(1)</script></p>',
    basePrice: 10, variants: [{ specification: '尺寸', option: 'L', stock: 8, surcharge: 2 }], tags: ['新品', ' 新品 ', '推荐'],
    stock: 8, moq: 1, category: 'bags', img: 'https://storage.googleapis.com/bucket/image.webp',
  };

  beforeEach(() => {
    products = {
      find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0),
      create: jest.fn(value => value), save: jest.fn(value => Promise.resolve({ id: 'product-1', ...value })), remove: jest.fn().mockResolvedValue(undefined),
    };
    tenants = { findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', maxProducts: 20 }) };
    dictionaries = { exist: jest.fn().mockResolvedValue(true) };
    service = new ProductService(products as never, tenants as never, dictionaries as never);
  });

  it('lists products only from the active site', async () => {
    await service.findAll('site-1');
    expect(products.find).toHaveBeenCalledWith({ where: { siteId: 'site-1' }, order: { createdAt: 'DESC' } });
  });

  it('creates a scoped product and derives price, variants and tags', async () => {
    const result = await service.create(dto, 'tenant-1', 'site-1');
    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', price: '12.00', tags: ['新品', '推荐'] });
    expect(result.description).toBe('<p>安全<strong>描述</strong></p>');
    expect(dictionaries.exist).toHaveBeenCalledWith({ where: { siteId: 'site-1', typeId: 'category', code: 'bags', status: 'enabled' } });
  });

  it('calculates a price range from base price and specification surcharges', async () => {
    const result = await service.create({ ...dto, variants: [{ specification: '尺寸', option: 'S', stock: 2, surcharge: 0 }, { specification: '尺寸', option: 'L', stock: 3, surcharge: 5 }] }, 'tenant-1', 'site-1');
    expect(result.price).toBe('10.00–15.00');
  });

  it('rejects disabled or foreign-site categories', async () => {
    dictionaries.exist.mockResolvedValue(false);
    await expect(service.create(dto, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces the tenant product quota', async () => {
    products.count.mockResolvedValue(20);
    await expect(service.create(dto, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate product codes only within the same site', async () => {
    products.findOne.mockResolvedValue({ id: 'existing', siteId: 'site-1', sku: dto.sku });
    await expect(service.create(dto, 'tenant-1', 'site-1')).rejects.toBeInstanceOf(ConflictException);
    expect(products.findOne).toHaveBeenCalledWith({ where: { siteId: 'site-1', sku: dto.sku } });
  });

  it('updates only a product belonging to the active site', async () => {
    const product = { id: 'product-1', siteId: 'site-1', sku: 'P-001', basePrice: 10, variants: [], tags: [] };
    products.findOne.mockResolvedValue(product);
    const result = await service.update('product-1', { basePrice: 20, description: '<img src="javascript:bad"><p>正常</p>' }, 'site-1');
    expect(result.price).toBe('20.00');
    expect(result.description).toContain('<p>正常</p>');
    expect(result.description).not.toContain('javascript:');
  });

  it('returns not found for products outside the active site', async () => {
    await expect(service.findById('foreign', 'site-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('foreign', 'site-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes and updates SEO through site-scoped lookup', async () => {
    const product = { id: 'product-1', siteId: 'site-1', sku: 'P-001' };
    products.findOne.mockResolvedValue(product);
    await service.updateProductSeo('product-1', { seoTitle: 'SEO 标题' }, 'site-1');
    expect(products.save).toHaveBeenCalledWith(expect.objectContaining({ seoTitle: 'SEO 标题' }));
    await service.remove('product-1', 'site-1');
    expect(products.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'product-1' }));
  });
});
