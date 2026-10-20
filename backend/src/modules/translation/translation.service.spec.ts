import { TranslationService } from './translation.service';
import { createHash } from 'crypto';
import ExcelJS = require('exceljs');

describe('TranslationService public site source catalog', () => {
  it('excludes removed product brand and SEO fields and archives their legacy translation units', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const legacy = ['seoTitle', 'seoDescription', 'brand'].map((field, index) => ({ id: `legacy-${index}`, siteId: 'site-1', resourceType: 'product', resourceId: 'product-1', fieldKey: `product:product-1:${field}`, sourceText: field, sourceHash: field, contentFormat: 'text', isRequired: true, isArchived: false }));
    const units = { find: jest.fn().mockResolvedValue(legacy), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const products = { find: jest.fn().mockResolvedValue([{ id: 'product-1', siteId: 'site-1', status: 'published', nameZh: '商品一', description: '商品描述', seoTitle: '旧 SEO 标题', seoDescription: '旧 SEO 描述', brand: '旧品牌', tags: [], variants: [] }]) };
    const categories = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: {}, siteInfo: { contactDetails: {}, contactItems: [] } } } : key.endsWith(':seo') ? { value: {} } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, products as any, categories as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'product:product-1:name', sourceText: '商品一' }),
      expect.objectContaining({ fieldKey: 'product:product-1:description', sourceText: '商品描述' }),
    ]));
    expect(saved.some(source => /:(seoTitle|seoDescription|brand)$/.test(String(source.fieldKey)))).toBe(false);
    expect(units.update).toHaveBeenCalledWith(expect.objectContaining({ id: expect.anything() }), { isArchived: true });
    expect((units.update.mock.calls[0][0].id as any)._value).toEqual(expect.arrayContaining(legacy.map(item => item.id)));
  });

  it('uses the editor translation descriptor catalog as the source of truth', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = { find: jest.fn().mockResolvedValue([]), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: { home: { sections: [{ id: 'header-1', type: 'header', visible: true, eyebrow: '全球交付', title: '品牌名称', navItems: [{ id: 'nav-1', label: '产品中心', targetId: 'hero-1' }] }, { id: 'hero-1', type: 'hero', visible: true, title: '品牌主张', stats: [{ id: 'stat-1', label: '全球客户' }] }, { id: 'text-1', type: 'text', visible: true, title: '品牌故事', qualityBadgeText: '品质认证', showStats: false }] } }, translationDescriptors: [{ key: 'editor:home:hero-1:title', path: 'pages.home.sections.hero-1.title', fieldLabel: '主标题', pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', order: 100, required: false }, { key: 'editor:home:hero-1:stat:stat-1:label', path: 'pages.home.sections.hero-1.stats.stat-1.label', fieldLabel: '数据标签', pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', order: 101, required: false }] } } : key.endsWith(':seo') ? { value: {} } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'editor:home:hero-1:title', sourceText: '品牌主张' }),
      expect.objectContaining({ fieldKey: 'editor:home:hero-1:stat:stat-1:label', sourceText: '全球客户' }),
      expect.objectContaining({ fieldKey: 'editor:home:header-1:eyebrow', sourceText: '全球交付' }),
      expect.objectContaining({ fieldKey: 'editor:home:header-1:title', sourceText: '品牌名称' }),
      expect.objectContaining({ fieldKey: 'editor:home:header-1:nav:nav-1:label', sourceText: '产品中心' }),
      expect.objectContaining({ fieldKey: 'editor:home:hero-1:trust:quality:title', sourceText: '品质保障' }),
      expect.objectContaining({ fieldKey: 'editor:home:hero-1:trust:quality:description', sourceText: '严格质检与稳定品质' }),
      expect.objectContaining({ fieldKey: 'editor:home:text-1:qualityBadgeText', sourceText: '品质认证' }),
    ]));
    expect(saved.some(source => String(source.fieldKey).startsWith('editor:home:text-1:stat:'))).toBe(false);
    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'category:__all__:label', sourceText: '全部商品' }),
      expect.objectContaining({ fieldKey: 'system:empty.products', sourceText: '当前分类暂无商品' }),
      expect.objectContaining({ fieldKey: 'system:empty.categories', sourceText: '暂无分类' }),
      expect.objectContaining({ fieldKey: 'system:empty.contactInformation', sourceText: '暂无联系信息' }),
      expect.objectContaining({ fieldKey: 'system:guestAccess.disabledTitle', sourceText: '暂不开放游客访问' }),
      expect.objectContaining({ fieldKey: 'system:guestAccess.disabledDescription', sourceText: '当前站点仅对授权客户开放，请联系站点管理员获取访问权限。' }),
      expect.objectContaining({ fieldKey: 'constant:storefront.productBadge', sourceText: '商品标记' }),
      expect.objectContaining({ fieldKey: 'constant:storefront.quickNavigation', sourceText: '快速导航' }),
      expect.objectContaining({ resourceType: 'editor', resourceId: 'product-detail', fieldKey: 'editor:product:product-detail:likes', sourceText: '人喜欢' }),
      expect.objectContaining({ resourceType: 'editor', resourceId: 'product-detail', fieldKey: 'editor:product:product-detail:contactNote', sourceText: '联系我们获取报价、定制方案与交付信息。' }),
      expect.objectContaining({ resourceType: 'editor', resourceId: 'product-detail', fieldKey: 'editor:product:product-detail:descriptionTitle', sourceText: '商品详情' }),
    ]));
    expect(saved.some(source => String(source.fieldKey).startsWith('system:customer.'))).toBe(false);
    expect(saved.some(source => source.fieldKey === 'constant:storefront.categoryFilter')).toBe(false);
  });

  it('adds footer copyright copy to the page-content translation catalog', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = { find: jest.fn().mockResolvedValue([]), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: { home: { sections: [{ id: 'footer-1', type: 'footer', visible: true, title: '企业名称', subtitle: '企业说明', copyrightText: '版权所有', navItems: [], socialLinks: [] }] } } } } : key.endsWith(':seo') ? { value: {} } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourceType: 'editor', resourceId: 'footer-1', fieldKey: 'editor:home:footer-1:copyrightText', sourceText: '版权所有' }),
    ]));
  });

  it('uses the site editor contact module as the translation source for legacy configs', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = { find: jest.fn().mockResolvedValue([]), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: { home: { sections: [{ id: 'contact-1', type: 'contactModal', title: '获取专属报价', subtitle: '请留下您的采购需求' }] } }, siteInfo: { contactModalTitle: '', contactModalSubtitle: '', contactItems: [] } } } : key.endsWith(':seo') ? { value: {} } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'editor:siteInfo:contactModalTitle', sourceText: '获取专属报价' }),
      expect.objectContaining({ fieldKey: 'editor:siteInfo:contactModalSubtitle', sourceText: '请留下您的采购需求' }),
    ]));
  });

  it('keeps internal site metadata out and groups public settings sources', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => { saved.push(value); return value; }),
      update: jest.fn(),
    };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = {
      findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? {
        value: {
          pages: { home: { sections: [{ id: 'contact-section', type: 'contactModal', visible: true, title: '联系我们', subtitle: '请留下需求' }] } },
          siteInfo: {
            contactModalTitle: '联系我们',
            contactModalSubtitle: '请留下需求',
            contactLabels: { email: '业务邮箱', phone: '联系电话', whatsapp: 'WhatsApp', address: '联系地址', hours: '工作时间' },
            contactDetails: { email: 'sales@example.com', phone: '400-800-1234', whatsapp: '', address: '上海市', hours: '周一至周五' },
            contactItems: [{ id: 'email-item', label: '业务邮箱', content: 'sales@example.com' }, { id: 'address-item', label: '联系地址', content: '上海市' }],
          },
        },
      } : key.endsWith(':seo') ? { value: { title: '官方站', description: '官方站描述', keywords: '外贸' } } : null),
    };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1', name: '内部站点名称' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).not.toEqual(expect.arrayContaining([expect.objectContaining({ fieldKey: 'site:site-1:name' })]));
    expect(saved.filter(source => source.fieldKey === 'editor:siteInfo:contactModalTitle')).toHaveLength(1);
    expect(saved).not.toEqual(expect.arrayContaining([expect.objectContaining({ fieldKey: 'editor:home:contact-section:title' })]));
    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: 'editor:siteInfo:contact:email-item:label', sourceText: '业务邮箱' }),
      expect.objectContaining({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: 'editor:siteInfo:contact:email-item:content', sourceText: 'sales@example.com' }),
      expect.objectContaining({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: 'editor:siteInfo:contact:address-item:content', sourceText: '上海市' }),
      expect.objectContaining({ resourceType: 'seo', resourceId: 'global', fieldKey: 'seo:title', sourceText: '官方站' }),
    ]));
    expect(saved.some(source => String(source.fieldKey).includes('socialLabels'))).toBe(false);
  });

  it('creates non-required public settings units when their Chinese source is empty', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = { find: jest.fn().mockResolvedValue([]), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: {}, siteInfo: { contactDetails: {}, contactItems: [{ id: 'empty-item', label: '', content: '' }] } } } : key.endsWith(':seo') ? { value: { title: '', description: '', keywords: '' } } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'seo:title', sourceText: '', isRequired: false }),
      expect.objectContaining({ fieldKey: 'seo:description', sourceText: '', isRequired: false }),
      expect.objectContaining({ fieldKey: 'seo:keywords', sourceText: '', isRequired: false }),
      expect.objectContaining({ fieldKey: 'editor:siteInfo:contact:empty-item:label', sourceText: '', isRequired: false }),
      expect.objectContaining({ fieldKey: 'editor:siteInfo:contact:empty-item:content', sourceText: '', isRequired: false }),
    ]));
  });

  it('only syncs components shown in the site editor home page structure', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const units = { find: jest.fn().mockResolvedValue([]), create: jest.fn((value) => value), save: jest.fn(async (value) => { saved.push(value); return value; }), update: jest.fn() };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const configs = { findOne: jest.fn(async ({ where: { key } }) => key.endsWith(':siteEditor') ? { value: { pages: {
      home: { sections: [{ id: 'home-header', type: 'header', visible: true, title: '品牌名称' }, { id: 'home-hero', type: 'hero', visible: true, title: '首页主张' }, { id: 'home-footer', type: 'footer', visible: true, title: '企业名称', socialLinks: [{ id: 'linkedin', label: '领英', url: 'https://linkedin.example' }] }] },
      products: { sections: [{ id: 'products-header', type: 'header', visible: true, title: '重复页头' }, { id: 'products-list', type: 'products', visible: true, title: '重复产品列表' }, { id: 'products-footer', type: 'footer', visible: true, title: '重复页脚' }] },
    }, siteInfo: { contactModalTitle: '联系我们', contactModalSubtitle: '联系说明', contactDetails: {}, socialLinks: [] } } } : key.endsWith(':seo') ? { value: {} } : null) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    const service = new TranslationService(units as any, {} as any, emptyList as any, emptyList as any, configs as any, sites as any, {} as any);

    await service.sync('site-1');

    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'editor:home:home-header:title', sourceText: '品牌名称' }),
      expect.objectContaining({ fieldKey: 'editor:home:home-hero:title', sourceText: '首页主张' }),
      expect.objectContaining({ fieldKey: 'editor:home:home-footer:social:linkedin:label', sourceText: '领英' }),
      expect.objectContaining({ fieldKey: 'editor:siteInfo:contactModalTitle', sourceText: '联系我们' }),
    ]));
    expect(saved.some(source => String(source.fieldKey).startsWith('editor:products:'))).toBe(false);
  });
});

describe('TranslationService Excel safety workflow', () => {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const unit = (index: number, sourceText = `中文 ${index}`) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, siteId: 'site-1', resourceType: 'product', resourceId: `product-${index}`, fieldKey: `product:product-${index}:name`, sourceText, sourceHash: hash(sourceText), contentFormat: 'text', isRequired: true, isArchived: false, updatedAt: new Date() });
  const createService = (activeUnits: any[], existingValues: any[] = [], supportedLanguages = ['zh_CN', 'en_US']) => {
    const stored = new Map<string, unknown>();
    const units = { find: jest.fn(async (options?: any) => options?.where?.isRequired === true ? activeUnits.filter(item => item.isRequired) : activeUnits) };
    const transactionManager = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async value => value),
    };
    const values = { find: jest.fn().mockResolvedValue(existingValues), manager: { transaction: jest.fn(async callback => callback(transactionManager)) } };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1', name: '演示站点', defaultLanguage: 'zh_CN', supportedLanguages }) };
    const cache = { set: jest.fn(async (key, value) => { stored.set(key, value); }), get: jest.fn(async key => stored.get(key) || null), del: jest.fn(async key => { stored.delete(key); }) };
    const service = new TranslationService(units as any, values as any, emptyList as any, emptyList as any, {} as any, sites as any, cache as any);
    jest.spyOn(service, 'sync').mockResolvedValue(undefined);
    return service;
  };

  it('exports every active unit without the former 200 row limit', async () => {
    const activeUnits = Array.from({ length: 205 }, (_, index) => unit(index + 1));
    const result = await createService(activeUnits).exportWorkbook('site-1', 'en_US');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.data as any);
    expect(workbook.getWorksheet('批量翻译')?.actualRowCount).toBe(206);
    expect(workbook.getWorksheet('单项覆盖')?.actualRowCount).toBe(206);
    expect(workbook.getWorksheet('完整明细')?.actualRowCount).toBe(206);
    expect(workbook.getWorksheet('_meta')).toBeDefined();
    expect(result.filename).toMatch(/^演示站点-多语言-en_US-/);
  });

  it('deduplicates compatible variant copy in the v3 batch sheet', async () => {
    const first = { ...unit(1, '颜色'), fieldKey: 'product:p1:variant:v1:specification', resourceId: 'p1' };
    const second = { ...unit(2, '颜色'), fieldKey: 'product:p2:variant:v2:specification', resourceId: 'p2' };
    const result = await createService([first, second]).exportWorkbook('site-1', 'en_US');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.data as any);
    expect(workbook.getWorksheet('批量翻译')?.actualRowCount).toBe(2);
    expect(workbook.getWorksheet('批量翻译')?.getRow(2).getCell(7).value).toBe(2);
    expect(workbook.getWorksheet('单项覆盖')?.actualRowCount).toBe(3);
  });

  it('fans a v3 batch translation out to every compatible unit during preview', async () => {
    const first = { ...unit(1, '颜色'), fieldKey: 'product:p1:variant:v1:specification', resourceId: 'p1' };
    const second = { ...unit(2, '颜色'), fieldKey: 'product:p2:variant:v2:specification', resourceId: 'p2' };
    const service = createService([first, second]);
    const exported = await service.exportWorkbook('site-1', 'en_US');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.data as any);
    workbook.getWorksheet('批量翻译')!.getRow(2).getCell(6).value = 'Color';
    const preview = await service.previewImport('site-1', 'user-1', 'en_US', Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(preview.summary).toEqual(expect.objectContaining({ ready: 2, invalid: 0, duplicate: 0 }));
    expect(preview.rows.map(row => row.key)).toEqual(expect.arrayContaining([first.fieldKey, second.fieldKey]));
  });

  it('reports visible content progress across required and optional fields', async () => {
    const required = unit(1);
    const optional = { ...unit(2), isRequired: false };
    const service = createService([required, optional], [{ unitId: required.id, locale: 'en_US', value: 'Translated', sourceHash: required.sourceHash }]);
    await expect(service.summary('site-1')).resolves.toEqual([expect.objectContaining({ total: 1, completed: 1, missing: 0, percent: 100 })]);
    await expect(service.contentSummary('site-1')).resolves.toEqual([expect.objectContaining({ total: 2, completed: 1, missing: 1, percent: 50 })]);
  });

  it('previews valid, blank and changed-source rows without writing translations', async () => {
    const current = [unit(1), unit(2), unit(3, '新中文')];
    const oldSource = '旧中文';
    const rows = [
      { '模块': '商品信息', '业务对象': '商品一', '字段': '名称', '中文原文': current[0].sourceText, '目标语言': 'en_US', '译文': 'Product one', '当前状态': '未翻译', '稳定键': current[0].fieldKey, '翻译单元ID': current[0].id, '中文源文哈希': current[0].sourceHash },
      { '模块': '商品信息', '业务对象': '商品二', '字段': '名称', '中文原文': current[1].sourceText, '目标语言': 'en_US', '译文': '', '当前状态': '未翻译', '稳定键': current[1].fieldKey, '翻译单元ID': current[1].id, '中文源文哈希': current[1].sourceHash },
      { '模块': '商品信息', '业务对象': '商品三', '字段': '名称', '中文原文': oldSource, '目标语言': 'en_US', '译文': 'Old product', '当前状态': '未翻译', '稳定键': current[2].fieldKey, '翻译单元ID': current[2].id, '中文源文哈希': hash(oldSource) },
    ];
    const workbook = new ExcelJS.Workbook();
    const content = workbook.addWorksheet('翻译内容');
    content.addRow(Object.keys(rows[0]));
    rows.forEach(row => content.addRow(Object.keys(rows[0]).map(key => row[key as keyof typeof row])));
    const meta = workbook.addWorksheet('_meta');
    [['key', 'value'], ['templateVersion', '2'], ['siteId', 'site-1'], ['sourceLocale', 'zh_CN'], ['targetLocale', 'en_US']].forEach(row => meta.addRow(row));
    const preview = await createService(current).previewImport('site-1', 'user-1', 'en_US', Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(preview.summary).toEqual(expect.objectContaining({ ready: 1, blank: 1, sourceChanged: 1 }));
  });

  it('previews and commits a 79-row hr_HR workbook with five blank translations', async () => {
    const activeUnits = Array.from({ length: 79 }, (_, index) => unit(index + 1));
    const columns = ['模块', '业务对象', '字段', '中文原文', '目标语言', '译文', '当前状态', '稳定键', '翻译单元ID', '中文源文哈希'];
    const workbook = new ExcelJS.Workbook();
    const content = workbook.addWorksheet('翻译内容');
    content.addRow(columns);
    activeUnits.forEach((current, index) => content.addRow([
      '商品信息', `商品 ${index + 1}`, '名称', current.sourceText, 'hr_HR', index < 74 ? `Prijevod ${index + 1}` : '', '未翻译', current.fieldKey, current.id, current.sourceHash,
    ]));
    const meta = workbook.addWorksheet('_meta');
    [['key', 'value'], ['templateVersion', '2'], ['siteId', 'site-1'], ['sourceLocale', 'zh_CN'], ['targetLocale', 'hr_HR']].forEach(row => meta.addRow(row));
    const service = createService(activeUnits, [], ['zh_CN', 'hr_HR']);

    const preview = await service.previewImport('site-1', 'user-1', 'hr_HR', Buffer.from(await workbook.xlsx.writeBuffer()));
    const result = await service.commitImport('site-1', 'user-1', 'hr_HR', preview.token);

    expect(preview.summary).toEqual(expect.objectContaining({ total: 79, ready: 74, blank: 5, invalid: 0 }));
    expect(result).toEqual({ imported: 74, unchanged: 0, blankSkipped: 5, staleSkipped: 0, invalidSkipped: 0 });
    await expect(service.commitImport('site-1', 'user-1', 'hr_HR', preview.token)).rejects.toMatchObject({
      response: { message: '预检结果已过期，请重新上传 Excel', statusCode: 400 },
      status: 400,
    });
  });
});
