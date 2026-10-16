import { TranslationService } from './translation.service';
import { createHash } from 'crypto';
import ExcelJS = require('exceljs');

describe('TranslationService public site source catalog', () => {
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
      expect.objectContaining({ fieldKey: 'constant:storefront.productBadge', sourceText: '商品标记' }),
      expect.objectContaining({ fieldKey: 'constant:storefront.quickNavigation', sourceText: '快速导航' }),
    ]));
    expect(saved.some(source => String(source.fieldKey).startsWith('system:customer.'))).toBe(false);
    expect(saved.some(source => source.fieldKey === 'constant:storefront.categoryFilter')).toBe(false);
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
  const createService = (activeUnits: any[], existingValues: any[] = []) => {
    const stored = new Map<string, unknown>();
    const units = { find: jest.fn().mockResolvedValue(activeUnits) };
    const values = { find: jest.fn().mockResolvedValue(existingValues), manager: { transaction: jest.fn() } };
    const emptyList = { find: jest.fn().mockResolvedValue([]) };
    const sites = { findOneByOrFail: jest.fn().mockResolvedValue({ id: 'site-1', name: '演示站点', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] }) };
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
    expect(workbook.getWorksheet('翻译内容')?.actualRowCount).toBe(206);
    expect(workbook.getWorksheet('_meta')).toBeDefined();
    expect(result.filename).toMatch(/^演示站点-多语言-en_US-/);
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
});
