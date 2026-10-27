import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let products: Record<string, any>;
  let tenants: Record<string, jest.Mock>;
  let categories: Record<string, jest.Mock>;
  let warehouses: Record<string, jest.Mock>;
  let balances: Record<string, jest.Mock>;
  let ledger: Record<string, jest.Mock>;
  let configs: Record<string, jest.Mock>;
  let levels: Record<string, jest.Mock>;
  let storage: Record<string, jest.Mock>;
  let queryBuilder: Record<string, jest.Mock>;
  const dto = {
    nameZh: '测试商品', sku: 'P-001', description: '<p>安全<strong>描述</strong><script>alert(1)</script></p>',
    basePrice: 10, variants: [{ specification: '尺寸', option: 'L', stock: 8, surcharge: 2 }], tags: ['新品', ' 新品 ', '推荐'],
    stock: 8, moq: 1, category: 'bags', img: 'https://storage.googleapis.com/bucket/image.webp',
  };
  const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const exportImage = (width = 120, height = 90) => ({ buffer: imageBuffer, extension: 'png', width, height });

  beforeEach(() => {
    queryBuilder = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]), getMany: jest.fn().mockResolvedValue([]), getManyAndCount: jest.fn().mockResolvedValue([[], 0]) };
    products = {
      find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => queryBuilder), create: jest.fn(value => value), save: jest.fn(value => Promise.resolve({ id: 'product-1', ...value })), remove: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    products.manager = { transaction: jest.fn(async callback => callback({ getRepository: () => products })) };
    tenants = { findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', maxProducts: 20 }) };
    categories = { exist: jest.fn().mockResolvedValue(true), find: jest.fn().mockResolvedValue([]) };
    warehouses = { findOne: jest.fn().mockResolvedValue(null) };
    balances = { find: jest.fn().mockResolvedValue([]), create: jest.fn(value => value), save: jest.fn(value => Promise.resolve(value)), createQueryBuilder: jest.fn(() => ({ where: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) })) };
    ledger = { exist: jest.fn().mockResolvedValue(false), createQueryBuilder: jest.fn(() => ({ where: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) })) };
    configs = { findOne: jest.fn().mockResolvedValue(null) };
    levels = { find: jest.fn().mockResolvedValue([]) };
    storage = { readExportImage: jest.fn().mockResolvedValue(null) };
    service = new ProductService(products as never, tenants as never, categories as never, warehouses as never, balances as never, ledger as never, configs as never, levels as never, storage as never);
  });

  it('lists products only from the active site', async () => {
    await service.findAll('site-1');
    expect(products.createQueryBuilder).toHaveBeenCalledWith('product');
    expect(queryBuilder.where).toHaveBeenCalledWith('product.site_id = :siteId', { siteId: 'site-1' });
  });

  it('returns unfiltered category totals and live inventory balances', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'product-1', category: 'bags', stock: 99, variants: [{ id: 'v-red', specification: '颜色', option: '红', stock: 99 }] }], 1]);
    queryBuilder.getRawMany.mockResolvedValue([{ category: 'bags', count: '12' }, { category: 'shoes', count: '4' }]);
    balances.find.mockResolvedValue([{ productId: 'product-1', variantKey: 'v-red', onHand: 7 }]);
    const result = await service.findAll('site-1', { keyword: '测试' });
    expect(result.items[0]).toMatchObject({ stock: 7, variants: [expect.objectContaining({ id: 'v-red', stock: 7 })] });
    expect(result.summary.categoryCounts).toEqual({ bags: 12, shoes: 4 });
    expect(result.summary.totalProducts).toBe(16);
  });

  it('creates a scoped product and derives price, variants and tags', async () => {
    const result = await service.create({ ...dto, images: [dto.img, 'https://storage.googleapis.com/bucket/second.webp', dto.img] }, 'tenant-1', 'site-1');
    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', status: 'pending', price: '12.00', img: dto.img, images: [dto.img, 'https://storage.googleapis.com/bucket/second.webp'], tags: ['新品', '推荐'] });
    expect(result.description).toBe('<p>安全<strong>描述</strong></p>');
    expect(categories.exist).toHaveBeenCalledWith({ where: { siteId: 'site-1', code: 'bags', status: 'enabled' } });
  });

  it('calculates a price range from base price and specification surcharges', async () => {
    const result = await service.create({ ...dto, variants: [{ specification: '尺寸', option: 'S', stock: 2, surcharge: 0 }, { specification: '尺寸', option: 'L', stock: 3, surcharge: 5 }] }, 'tenant-1', 'site-1');
    expect(result.price).toBe('10.00～15.00');
  });

  it('rejects disabled or foreign-site categories', async () => {
    categories.exist.mockResolvedValue(false);
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
    const product = { id: 'product-1', siteId: 'site-1', sku: 'P-001', basePrice: 10, variants: [], tags: [], img: dto.img, images: null };
    products.findOne.mockResolvedValue(product);
    const result = await service.update('product-1', { basePrice: 20, description: '<img src="javascript:bad"><p>正常</p>' }, 'site-1');
    expect(result.price).toBe('20.00');
    expect(result.description).toContain('<p>正常</p>');
    expect(result.description).not.toContain('javascript:');
  });

  it('keeps at most ten product images and synchronizes the first image', async () => {
    const product = { id: 'product-1', siteId: 'site-1', sku: 'P-001', basePrice: 10, variants: [], tags: [], img: dto.img, images: null };
    products.findOne.mockResolvedValue(product);
    const images = Array.from({ length: 12 }, (_, index) => `https://storage.googleapis.com/bucket/${index}.webp`);
    const result = await service.update('product-1', { images }, 'site-1');
    expect(result.images).toHaveLength(10);
    expect(result.img).toBe(images[0]);
  });

  it('returns not found for products outside the active site', async () => {
    await expect(service.findById('foreign', 'site-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('foreign', 'site-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes through a site-scoped lookup', async () => {
    const product = { id: 'product-1', siteId: 'site-1', sku: 'P-001' };
    products.findOne.mockResolvedValue(product);
    await service.remove('product-1', 'site-1');
    expect(products.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'product-1' }));
  });

  it('publishes only a complete batch of pending products and removes duplicate ids', async () => {
    products.find.mockResolvedValue([{ id: 'product-1', status: 'pending' }, { id: 'product-2', status: 'pending' }]);
    products.update.mockResolvedValue({ affected: 2 });
    await expect(service.batchStatus(['product-1', 'product-1', 'product-2'], 'published', 'site-1'))
      .resolves.toEqual({ updated: 2, status: 'published' });
    expect(products.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ siteId: 'site-1' }) }));
    expect(products.update).toHaveBeenCalledWith(expect.objectContaining({ siteId: 'site-1', status: 'pending' }), { status: 'published' });
  });

  it('rejects mixed, missing, or foreign-site products without updating the batch', async () => {
    products.find.mockResolvedValue([{ id: 'product-1', status: 'published' }]);
    await expect(service.batchStatus(['product-1', 'product-2'], 'published', 'site-1')).rejects.toThrow('请选择还未同步的商品数据');
    expect(products.update).not.toHaveBeenCalled();
  });

  it('unpublishes only published products and rejects a concurrent state change', async () => {
    products.find.mockResolvedValue([{ id: 'product-1', status: 'published' }]);
    products.update.mockResolvedValue({ affected: 0 });
    await expect(service.batchStatus(['product-1'], 'pending', 'site-1')).rejects.toThrow('请选择已同步的商品数据');
    expect(products.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }), { status: 'pending' });
  });

  it('exports a merged preview block with thumbnails, labels, plain text and final prices', async () => {
    const imageUrls = Array.from({ length: 10 }, (_, index) => `https://storage.googleapis.com/bucket/image-${index + 1}.webp`);
    configs.findOne.mockResolvedValue({ value: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', enabled: true }, { code: 'USD', enabled: true }] } });
    levels.find.mockResolvedValue([{ code: 'lvl_vip', name: 'VIP', sort: 1 }]);
    categories.find.mockResolvedValue([{ code: 'bags', label: '箱包', parentCode: null }, { code: 'totes', label: '托特包', parentCode: 'bags' }]);
    queryBuilder.getMany.mockResolvedValue([{ id: 'product-1', sku: 'SKU-1', nameZh: '测试商品', category: 'totes', description: '<p>Hello&nbsp;<strong>World</strong></p><ul><li>First</li><li>Second</li></ul><script>bad()</script>', img: imageUrls[0], images: imageUrls, tags: ['环保', '定制'], badge: 'recommended', likeCount: 9, currencyPrices: { CNY: { basePrice: 100, levelPrices: { lvl_vip: 80 } }, USD: { basePrice: 20, levelPrices: {} } }, variants: [{ id: 'v1', specification: '颜色', option: '红', surcharge: 5, surcharges: { CNY: 5, USD: 1 } }, { id: 'v2', specification: '颜色', option: '蓝', surcharge: 10, surcharges: { CNY: 10, USD: 2 } }], moq: 2, status: 'published', createdAt: new Date() }]);
    storage.readExportImage.mockResolvedValue(exportImage());
    const result = await service.exportWorkbook('site-1', { keyword: '测试', category: 'bags', status: 'published', currency: 'USD' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('(product.name_zh LIKE :keyword OR product.sku LIKE :keyword)', { keyword: '%测试%' });
    expect(queryBuilder.skip).not.toHaveBeenCalled();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    const firstHeader = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
    const secondHeader = (sheet.getRow(2).values as unknown[]).slice(1).map(String);
    expect(firstHeader).toContain('商品图片');
    expect(firstHeader).toContain('点赞数量');
    expect(firstHeader).toContain('币种：CNY');
    expect(firstHeader).toContain('币种：USD');
    expect(secondHeader.filter(value => value === '商品单价')).toHaveLength(2);
    expect(secondHeader.filter(value => value === 'VIP价')).toHaveLength(2);
    expect([...firstHeader, ...secondHeader].some(value => /规格单价|基础单价|规格加价|图片URL|价格区间|库存/.test(value))).toBe(false);
    expect(workbook.worksheets.map(item => item.name)).toEqual(['商品数据']);
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.getImages()[0].range.tl.col).toBeGreaterThan(3);
    expect(storage.readExportImage).toHaveBeenCalledTimes(1);
    expect(storage.readExportImage).toHaveBeenCalledWith(imageUrls[0]);
    expect(sheet.getCell('A2').master.address).toBe('A1');
    expect(sheet.getCell('N1').master.address).toBe('M1');
    expect(sheet.getCell('P1').master.address).toBe('O1');
    expect(sheet.getCell('M2').text).toBe('商品单价');
    expect(sheet.getCell('N2').text).toBe('VIP价');
    expect(sheet.getCell(4, 1).master.address).toBe('A3');
    expect(sheet.getCell(4, 10).master.address).toBe('J3');
    expect(sheet.getCell('C3').text).toBe('箱包 / 托特包');
    expect(sheet.getCell('E3').text).toBe('Hello World\n• First\n• Second');
    expect(sheet.getCell('G3').text).toBe('推荐');
    expect(sheet.getCell('M3').value).toBe(105);
    expect(sheet.getCell('N3').value).toBe(85);
    expect(sheet.getCell('O4').value).toBe(22);
    expect(sheet.getCell('P4').value).toBe(22);
    expect(sheet.getRow(1).height).toBe(32);
    expect(sheet.getRow(2).height).toBe(32);
    expect(sheet.getRow(3).height).toBeGreaterThanOrEqual(30);
    expect(sheet.getCell('B3').font.bold).toBe(true);
    expect(sheet.getCell('E3').alignment.vertical).toBe('top');
    expect(sheet.getCell('K3').alignment.horizontal).toBe('center');
    expect(sheet.getCell('M3').alignment.horizontal).toBe('right');
    expect(sheet.getColumn(13).numFmt).toBe('0.00');
    expect(sheet.getCell('M4').border.bottom?.style).toBe('medium');
    expect(sheet.getCell('A3').fill).not.toEqual(sheet.getCell('K3').fill);
  });

  it('exports an empty workbook with headers when the query has no matches', async () => {
    queryBuilder.getMany.mockResolvedValue([]);
    const result = await service.exportWorkbook('site-1', { currency: 'CNY' });
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toContain('商品图片');
    expect(sheet.getRow(2).values).toContain('商品单价');
    expect(sheet.rowCount).toBe(2);
  });

  it('shows a placeholder and completes export when a thumbnail cannot be loaded', async () => {
    const imageUrl = 'https://storage.googleapis.com/bucket/broken.webp';
    queryBuilder.getMany.mockResolvedValue([{ id: 'product-1', sku: 'SKU-1', nameZh: '坏图商品', category: 'bags', img: imageUrl, images: [imageUrl, 'https://storage.googleapis.com/bucket/good.png'], likeCount: 0, currencyPrices: {}, variants: [], moq: 1, status: 'pending' }]);
    storage.readExportImage.mockResolvedValue(null);
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    expect(sheet.getImages()).toHaveLength(0);
    expect(sheet.getCell('D3').text).toBe('-');
    expect(sheet.getCell('K3').text).toBe('-');
    expect(sheet.getCell('L3').text).toBe('-');
    expect(storage.readExportImage).toHaveBeenCalledTimes(1);
    expect(storage.readExportImage).toHaveBeenCalledWith(imageUrl);
  });

  it.each([
    [800, 600, (400 + 12 - 5) / 7, 234, 1],
    [1200, 1600, (600 + 12 - 5) / 7, 304.5, 2],
  ])('renders the first %ix%i image at half width and height', async (width, height, expectedColumnWidth, expectedRowHeight, expectedRows) => {
    const imageUrls = ['https://storage.googleapis.com/bucket/first.png', 'https://storage.googleapis.com/bucket/second.png'];
    queryBuilder.getMany.mockResolvedValue([{
      id: 'product-layout', sku: 'LAYOUT', nameZh: '图片布局', category: 'bags', images: imageUrls,
      likeCount: 0, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } }, variants: [], moq: 1, status: 'pending',
    }]);
    storage.readExportImage.mockResolvedValue(exportImage(width, height));
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.rowCount).toBe(2 + expectedRows);
    expect(sheet.getColumn(4).width).toBeCloseTo(Math.min(255, expectedColumnWidth), 4);
    expect(sheet.getRow(3).height).toBeCloseTo(expectedRowHeight, 4);
    expect(storage.readExportImage).toHaveBeenCalledTimes(1);
    expect(storage.readExportImage).toHaveBeenCalledWith(imageUrls[0]);
  });

  it('falls back to the legacy image only when the images collection is empty', async () => {
    const legacyImage = 'https://storage.googleapis.com/bucket/legacy.png';
    queryBuilder.getMany.mockResolvedValue([{
      id: 'product-legacy', sku: 'LEGACY', nameZh: '旧图商品', category: 'bags', images: [], img: legacyImage,
      likeCount: 0, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } }, variants: [], moq: 1, status: 'pending',
    }]);
    storage.readExportImage.mockResolvedValue(exportImage(80, 60));
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    expect(workbook.getWorksheet('商品数据')!.getImages()).toHaveLength(1);
    expect(storage.readExportImage).toHaveBeenCalledWith(legacyImage);
  });

  it.each([
    [400, (400 + 12 - 5) / 7],
    [2000, 255],
  ])('expands the image column for a %ipx source width within Excel limits', async (width, expectedColumnWidth) => {
    queryBuilder.getMany.mockResolvedValue([{
      id: 'product-wide', sku: 'WIDE', nameZh: '宽图商品', category: 'bags', images: ['https://storage.googleapis.com/bucket/wide.png'],
      likeCount: 0, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } }, variants: [], moq: 1, status: 'pending',
    }]);
    storage.readExportImage.mockResolvedValue(exportImage(width * 2, 100));
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    expect(workbook.getWorksheet('商品数据')!.getColumn(4).width).toBeCloseTo(expectedColumnWidth, 4);
  });

  it('estimates wrapped text height from display width, explicit lines and column width', () => {
    const exportTextHeight = (value: string, width: number) => (service as any).exportTextHeight(value, width);
    expect(exportTextHeight('-', 18)).toBe(30);
    expect(exportTextHeight('123', 18)).toBe(30);
    expect(exportTextHeight('abcdefghijklmnopq', 18)).toBe(42);
    expect(exportTextHeight('一二三四五六七八九', 18)).toBe(42);
    expect(exportTextHeight('😀😀😀😀😀😀😀😀😀', 18)).toBe(42);
    expect(exportTextHeight('第一行\nsecond line', 18)).toBe(42);
    expect(exportTextHeight('一'.repeat(30), 18)).toBeGreaterThan(exportTextHeight('一'.repeat(30), 42));
  });

  it('distributes product-level extra height evenly without violating variant minimums', () => {
    const distribute = (minimums: number[], total: number) => (service as any).distributeExportRowHeights(minimums, total);
    expect(distribute([30, 30], 150)).toEqual([75, 75]);
    expect(distribute([100, 30], 160)).toEqual([100, 60]);
  });

  it('expands and evenly distributes long product text across specification rows', async () => {
    queryBuilder.getMany.mockResolvedValue([{
      id: 'product-long-text', sku: 'LONG', nameZh: '长文本商品', category: 'bags', description: `<p>${'商品说明'.repeat(50)}</p>`, images: [],
      tags: [], likeCount: 0, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } },
      variants: [{ specification: '颜色', option: '红' }, { specification: '颜色', option: '蓝' }], moq: 1, status: 'pending',
    }]);
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    expect(sheet.getRow(3).height).toBeGreaterThan(30);
    expect(sheet.getRow(3).height).toBeCloseTo(sheet.getRow(4).height!, 4);
    expect(sheet.getCell('A4').master.address).toBe('A3');
  });

  it('preserves a long specification row minimum and adds continuation rows for very long product text', async () => {
    queryBuilder.getMany.mockResolvedValue([{
      id: 'product-continuation', sku: 'CONTINUE', nameZh: '延续行商品', category: 'bags', description: `<p>${'文'.repeat(1200)}</p>`, images: [],
      tags: [], likeCount: 0, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } },
      variants: [{ specification: '规格'.repeat(40), option: '长选项' }, { specification: '尺寸', option: 'S' }], moq: 1, status: 'pending',
    }]);
    const result = await service.exportWorkbook('site-1', {});
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.data as any);
    const sheet = workbook.getWorksheet('商品数据')!;
    expect(sheet.rowCount).toBeGreaterThan(4);
    for (let row = 3; row <= sheet.rowCount; row += 1) expect(sheet.getRow(row).height).toBeLessThanOrEqual(409);
    expect(sheet.getRow(3).height).toBeGreaterThanOrEqual(170);
    expect(sheet.getCell(sheet.rowCount, 1).master.address).toBe('A3');
    expect(sheet.getCell(5, 11).text).toBe('');
  });
});
