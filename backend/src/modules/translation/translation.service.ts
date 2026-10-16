import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { FilterXSS } from 'xss';
import ExcelJS = require('exceljs');
import { Product } from '../product/product.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { Site } from '../site/site.entity';
import { DEFAULT_HERO_TRUST_ITEMS, ensureSiteEditorPages } from '../site/site-editor-defaults';
import { AppConfig } from '../workspace/app-config.entity';
import { TranslationUnit } from './translation-unit.entity';
import { TranslationValue } from './translation-value.entity';
import { SaveTranslationsDto, TranslationQueryDto } from './translation.dto';
import { TranslationImportCacheService } from './translation-import-cache.service';

type Source = { resourceType: string; resourceId: string; fieldKey: string; sourceText: string; contentFormat?: 'text' | 'html'; required?: boolean; includeWhenEmpty?: boolean };
type EditorDescriptor = { key: string; path: string; fieldLabel: string; pageId?: string; pageName?: string; componentId?: string; componentType?: string; componentName: string; order: number; required?: boolean };
type ImportRowStatus = 'ready' | 'unchanged' | 'blank' | 'source_changed' | 'removed' | 'duplicate' | 'invalid';
type ImportPreviewRow = { row: number; unitId: string; key: string; sourceText: string; value: string; status: ImportRowStatus; reason: string };
type ImportPreviewCache = { siteId: string; userId: string; locale: string; fileHash: string; expiresAt: string; rows: ImportPreviewRow[] };

const IMPORT_TEMPLATE_VERSION = '2';
const IMPORT_PREVIEW_TTL = 30 * 60 * 1000;
const IMPORT_COLUMNS = ['模块', '业务对象', '字段', '中文原文', '目标语言', '译文', '当前状态', '稳定键', '翻译单元ID', '中文源文哈希'];
const RESOURCE_LABELS: Record<string, string> = { product: '商品信息', category: '商品分类', editor: '站点设计', seo: 'SEO 优化', system: '系统文案', constant: '业务常量' };

const excelCellText = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text || '');
    if ('result' in value) return String(value.result || '');
    if ('richText' in value) return value.richText.map(part => part.text).join('');
  }
  return String(value);
};

const worksheetRows = (sheet: ExcelJS.Worksheet): string[][] => Array.from(
  { length: sheet.rowCount },
  (_, index) => {
    const row = sheet.getRow(index + 1);
    return Array.from({ length: Math.max(sheet.columnCount, row.cellCount) }, (__, column) => excelCellText(row.getCell(column + 1).value));
  },
);

const worksheetObjects = (sheet: ExcelJS.Worksheet): Array<Record<string, string>> => {
  const rows = worksheetRows(sheet);
  const headers = rows[0] || [];
  return rows.slice(1).filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
};

const EDITOR_PAGE_NAMES: Record<string, string> = { home: '首页', products: '商品列表页', product: '商品详情页', about: '关于我们', contact: '联系我们' };
const EDITOR_COMPONENT_NAMES: Record<string, string> = { header: '页头导航', hero: '首屏横幅', text: '文本内容', products: '产品列表', form: '询盘表单', footer: '页脚' };
const EDITOR_TEXT_FIELDS: Record<string, Array<[string, string]>> = {
  header: [['eyebrow', '眉标文案'], ['title', '品牌名称']],
  hero: [['eyebrow', '眉标文案'], ['title', '主标题'], ['subtitle', '说明文字'], ['buttonText', '主按钮'], ['secondaryButtonText', '次按钮']],
  text: [['eyebrow', '眉标文案'], ['title', '主标题'], ['subtitle', '说明文字'], ['promiseTitle', '承诺标题'], ['promiseText', '承诺内容'], ['qualityBadgeText', '品质保证标识']],
  products: [['eyebrow', '眉标文案'], ['title', '主标题'], ['subtitle', '说明文字'], ['buttonText', '按钮文案']],
  form: [['eyebrow', '眉标文案'], ['title', '主标题'], ['subtitle', '说明文字'], ['buttonText', '按钮文案']],
  footer: [['title', '企业名称'], ['subtitle', '说明文字']],
};

const PRODUCT_CONSTANTS: Record<string, string> = { 'product.moq': '最低起订量', 'product.badges': '新品;爆品;热销;推荐' };
const STOREFRONT_CONSTANTS: Record<string, string> = { 'storefront.productBadge': '商品标记', 'storefront.quickNavigation': '快速导航' };

const SYSTEM_COPY: Record<string, string> = {
  'empty.products': '当前分类暂无商品', 'empty.categories': '暂无分类', 'empty.contactInformation': '暂无联系信息',
  'inquiry.submitting': '提交中…', 'inquiry.preview': '预览模式不会提交询盘。',
  'inquiry.validation': '请完整填写联系人、联系方式和采购需求。', 'inquiry.success': '询盘已提交，我们将尽快与您联系。',
  'apiErrors.SITE_NOT_FOUND_OR_UNPUBLISHED': '站点不存在或尚未发布。',
  'apiErrors.CONTACT_NAME_REQUIRED': '请填写联系人。', 'apiErrors.CONTACT_METHOD_REQUIRED': '请填写联系方式。',
  'apiErrors.PURCHASE_REQUIREMENTS_REQUIRED': '请填写采购需求。', 'apiErrors.INQUIRY_SUBMIT_FAILED': '询盘提交失败，请稍后重试。',
  'apiErrors.SERVICE_UNAVAILABLE': '服务暂时不可用，请稍后重试。', 'apiErrors.NETWORK_ERROR': '网络连接异常，请稍后重试。',
  'apiErrors.UNKNOWN_ERROR': '操作失败，请稍后重试。',
};

@Injectable()
export class TranslationService {
  private readonly htmlFilter = new FilterXSS({ whiteList: { p: [], br: [], strong: [], em: [], u: [], s: [], h1: [], h2: [], h3: [], ul: [], ol: [], li: [], blockquote: [], a: ['href', 'target', 'rel'], img: ['src', 'alt', 'title'] }, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
  constructor(
    @InjectRepository(TranslationUnit) private readonly units: Repository<TranslationUnit>,
    @InjectRepository(TranslationValue) private readonly values: Repository<TranslationValue>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductCategory) private readonly categories: Repository<ProductCategory>,
    @InjectRepository(AppConfig) private readonly configs: Repository<AppConfig>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    private readonly cache: TranslationImportCacheService,
  ) {}

  async sync(siteId: string) {
    await this.sites.findOneByOrFail({ id: siteId });
    const [products, categories, editor, seo] = await Promise.all([
      this.products.find({ where: { siteId, status: 'published' } }), this.categories.find({ where: { siteId, status: 'enabled' } }),
      this.configs.findOne({ where: { key: `${siteId}:siteEditor` } }), this.configs.findOne({ where: { key: `${siteId}:seo` } }),
    ]);
    const sources: Source[] = [];
    const add = (source: Source) => { if (source.includeWhenEmpty || String(source.sourceText || '').trim()) sources.push(source); };
    products.forEach(product => {
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:name`, sourceText: product.nameZh });
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:description`, sourceText: product.description || '', contentFormat: 'html' });
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:seoTitle`, sourceText: product.seoTitle || '' });
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:seoDescription`, sourceText: product.seoDescription || '' });
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:brand`, sourceText: product.brand || '' });
      add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:tags`, sourceText: (product.tags || []).join(';') });
      (product.variants || []).forEach(variant => { add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:variant:${variant.id}:specification`, sourceText: variant.specification }); add({ resourceType: 'product', resourceId: product.id, fieldKey: `product:${product.id}:variant:${variant.id}:option`, sourceText: variant.option }); });
    });
    add({ resourceType: 'category', resourceId: '__all__', fieldKey: 'category:__all__:label', sourceText: '全部商品' });
    categories.forEach(category => { add({ resourceType: 'category', resourceId: category.id, fieldKey: `category:${category.code}:label`, sourceText: category.label }); add({ resourceType: 'category', resourceId: category.id, fieldKey: `category:${category.code}:remark`, sourceText: category.remark || '', required: false }); });
    this.extractEditor(ensureSiteEditorPages(editor?.value as any), add);
    const seoValue = (seo?.value || {}) as Record<string, unknown>;
    ['title', 'description', 'keywords'].forEach(field => { const sourceText = String(seoValue[field] || ''); add({ resourceType: 'seo', resourceId: 'global', fieldKey: `seo:${field}`, sourceText, required: Boolean(sourceText.trim()), includeWhenEmpty: true }); });
    Object.entries(SYSTEM_COPY).forEach(([field, sourceText]) => add({ resourceType: 'system', resourceId: 'storefront', fieldKey: `system:${field}`, sourceText }));
    Object.entries(PRODUCT_CONSTANTS).forEach(([field, sourceText]) => add({ resourceType: 'constant', resourceId: 'product', fieldKey: `constant:${field}`, sourceText }));
    Object.entries(STOREFRONT_CONSTANTS).forEach(([field, sourceText]) => add({ resourceType: 'constant', resourceId: 'storefront', fieldKey: `constant:${field}`, sourceText }));
    const existing = await this.units.find({ where: { siteId } });
    const activeKeys = new Set(sources.map(item => item.fieldKey));
    for (const source of sources) {
      const current = existing.find(item => item.fieldKey === source.fieldKey);
      const sourceHash = this.hash(source.sourceText);
      await this.units.save(this.units.create({ ...current, siteId, resourceType: source.resourceType, resourceId: source.resourceId, fieldKey: source.fieldKey, sourceText: source.sourceText, sourceHash, contentFormat: source.contentFormat || 'text', isRequired: source.required !== false, isArchived: false }));
    }
    const archived = existing.filter(item => !activeKeys.has(item.fieldKey) && !item.isArchived);
    if (archived.length) await this.units.update({ id: In(archived.map(item => item.id)) }, { isArchived: true });
  }

  async list(siteId: string, query: TranslationQueryDto) {
    await this.sync(siteId);
    const site = await this.sites.findOneByOrFail({ id: siteId });
    const locale = query.locale || (site.supportedLanguages || []).find(item => item !== 'zh_CN') || 'en_US';
    const all = await this.units.find({ where: { siteId, isArchived: false }, order: { resourceType: 'ASC', updatedAt: 'DESC' } });
    const translations = all.length ? await this.values.find({ where: { unitId: In(all.map(item => item.id)), locale } }) : [];
    const valueMap = new Map(translations.map(item => [item.unitId, item]));
    const [products, categories, editor] = await Promise.all([
      this.products.find({ where: { siteId, status: 'published' }, select: { id: true, sku: true, moq: true, badge: true } }),
      this.categories.find({ where: { siteId, status: 'enabled' }, select: { id: true, code: true, label: true, parentCode: true, sort: true } }),
      this.configs.findOne({ where: { key: `${siteId}:siteEditor` } }),
    ]);
    const productMeta = new Map(products.map(item => [item.id, { sku: item.sku, moq: item.moq, badge: item.badge }]));
    const categoryByCode = new Map(categories.map(item => [item.code, item]));
    const categoryMeta = new Map(categories.map(item => {
      const path = [item.label]; let parentCode = item.parentCode; const seen = new Set<string>();
      while (parentCode && !seen.has(parentCode)) { seen.add(parentCode); const parent = categoryByCode.get(parentCode); if (!parent) break; path.unshift(parent.label); parentCode = parent.parentCode; }
      return [item.id, { code: item.code, parentCode: item.parentCode, sort: item.sort, level: path.length, path }] as const;
    }));
    categoryMeta.set('__all__', { code: '__all__', parentCode: null, sort: -1, level: 1, path: ['全部商品'] });
    const editorDescriptors = new Map(this.editorDescriptors(ensureSiteEditorPages(editor?.value as any)).map(item => [item.key, item]));
    let items = all.map(unit => { const translated = valueMap.get(unit.id); const status = !translated?.value.trim() ? 'missing' : translated.sourceHash === unit.sourceHash ? 'completed' : 'stale'; return { key: unit.fieldKey, resourceType: unit.resourceType, resourceId: unit.resourceId, sourceText: unit.sourceText, sourceHash: unit.sourceHash, contentFormat: unit.contentFormat, required: unit.isRequired, value: translated?.value || '', status, updatedAt: translated?.updatedAt || unit.updatedAt, meta: unit.resourceType === 'product' ? productMeta.get(unit.resourceId) : unit.resourceType === 'category' ? categoryMeta.get(unit.resourceId) : unit.resourceType === 'editor' ? editorDescriptors.get(unit.fieldKey) : undefined }; });
    if (query.resourceType) items = items.filter(item => item.resourceType === query.resourceType);
    if (query.status) items = items.filter(item => item.status === query.status);
    if (query.keyword?.trim()) { const keyword = query.keyword.trim().toLowerCase(); items = items.filter(item => `${item.key}\n${item.sourceText}\n${item.value}`.toLowerCase().includes(keyword)); }
    const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));
    const summary = await this.summary(siteId);
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, locale, summary };
  }

  async save(siteId: string, dto: SaveTranslationsDto) {
    if (dto.locale === 'zh_CN') throw new BadRequestException('简体中文是源语言，无需录入译文');
    const site = await this.sites.findOneByOrFail({ id: siteId });
    if (!(site.supportedLanguages || [site.defaultLanguage]).includes(dto.locale)) throw new BadRequestException('该语言未在站点中启用');
    const keys = dto.items.map(item => item.key);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('存在重复的翻译键');
    const units = keys.length ? await this.units.find({ where: { siteId, fieldKey: In(keys), isArchived: false } }) : [];
    if (units.length !== keys.length) throw new BadRequestException('包含不存在或已归档的翻译键');
    await this.values.manager.transaction(async manager => {
      for (const item of dto.items) {
        const unit = units.find(value => value.fieldKey === item.key)!;
        let value: string;
        try { value = this.normalizeTranslationValue(unit, item.value); } catch (error) { throw new BadRequestException(`${item.key} ${error instanceof Error ? error.message : '译文格式不合法'}`); }
        const existing = await manager.findOne(TranslationValue, { where: { unitId: unit.id, locale: dto.locale } });
        await manager.save(TranslationValue, manager.create(TranslationValue, { ...existing, unitId: unit.id, locale: dto.locale, value, sourceHash: unit.sourceHash }));
      }
    });
    return this.list(siteId, { locale: dto.locale, page: 1, pageSize: 50 });
  }

  async summary(siteId: string) {
    const site = await this.sites.findOneByOrFail({ id: siteId });
    const units = await this.units.find({ where: { siteId, isArchived: false, isRequired: true } });
    const locales = (site.supportedLanguages || [site.defaultLanguage]).filter(locale => locale !== 'zh_CN');
    const values = units.length && locales.length ? await this.values.find({ where: { unitId: In(units.map(item => item.id)), locale: In(locales) } }) : [];
    return locales.map(locale => { const localized = values.filter(item => item.locale === locale); const completed = units.filter(unit => localized.some(value => value.unitId === unit.id && value.value.trim() && value.sourceHash === unit.sourceHash)).length; const stale = units.filter(unit => localized.some(value => value.unitId === unit.id && value.value.trim() && value.sourceHash !== unit.sourceHash)).length; return { locale, total: units.length, completed, stale, missing: units.length - completed - stale, percent: units.length ? Math.round(completed / units.length * 100) : 100 }; });
  }

  async validateForPublish(siteId: string) {
    await this.sync(siteId);
    const summary = await this.summary(siteId);
    const invalid = summary.filter(item => item.missing || item.stale);
    if (invalid.length) throw new BadRequestException({ message: '多语言内容未完成，无法发布', languages: invalid });
    return this.messages(siteId);
  }

  async messages(siteId: string) {
    const site = await this.sites.findOneByOrFail({ id: siteId });
    const units = await this.units.find({ where: { siteId, isArchived: false } });
    const locales = site.supportedLanguages || [site.defaultLanguage];
    const values = units.length ? await this.values.find({ where: { unitId: In(units.map(item => item.id)), locale: In(locales.filter(item => item !== 'zh_CN')) } }) : [];
    const messages: Record<string, Record<string, string>> = { zh_CN: Object.fromEntries(units.map(item => [item.fieldKey, item.sourceText])) };
    locales.filter(item => item !== 'zh_CN').forEach(locale => { messages[locale] = Object.fromEntries(units.map(unit => [unit.fieldKey, values.find(value => value.unitId === unit.id && value.locale === locale)?.value || ''])); });
    return { sourceLocale: 'zh_CN', locales, messages };
  }

  async exportWorkbook(siteId: string, locale: string) {
    await this.assertTargetLocale(siteId, locale);
    await this.sync(siteId);
    const site = await this.sites.findOneByOrFail({ id: siteId });
    const units = await this.units.find({ where: { siteId, isArchived: false }, order: { resourceType: 'ASC', resourceId: 'ASC', fieldKey: 'ASC' } });
    const translations = units.length ? await this.values.find({ where: { unitId: In(units.map(item => item.id)), locale } }) : [];
    const valueMap = new Map(translations.map(item => [item.unitId, item]));
    const rows = units.map(unit => {
      const translated = valueMap.get(unit.id);
      const status = !translated?.value.trim() ? '未翻译' : translated.sourceHash === unit.sourceHash ? '已完成' : '已过期';
      return {
        '模块': RESOURCE_LABELS[unit.resourceType] || unit.resourceType,
        '业务对象': this.businessObjectName(unit, units),
        '字段': this.fieldLabel(unit),
        '中文原文': unit.sourceText,
        '目标语言': locale,
        '译文': translated?.value || '',
        '当前状态': status,
        '稳定键': unit.fieldKey,
        '翻译单元ID': unit.id,
        '中文源文哈希': unit.sourceHash,
      };
    });
    const workbook = new ExcelJS.Workbook();
    const content = workbook.addWorksheet('翻译内容');
    content.addRow(IMPORT_COLUMNS);
    rows.forEach(row => content.addRow(IMPORT_COLUMNS.map(column => row[column as keyof typeof row])));
    [14, 24, 20, 48, 14, 48, 12, 48, 18, 32].forEach((width, index) => { content.getColumn(index + 1).width = width; });
    content.getColumn(9).hidden = true;
    content.getColumn(10).hidden = true;
    content.autoFilter = `A1:J${Math.max(1, rows.length + 1)}`;
    const guide = workbook.addWorksheet('填写说明');
    [
      ['多语言翻译填写说明'],
      ['1', '本文件是当前中文内容的快照，请只填写“译文”列。'],
      ['2', '请勿删除、重命名或移动工作表和列，也不要修改目标语言。'],
      ['3', '中文原文、稳定键及隐藏技术列用于安全校验，修改后对应行会被跳过。'],
      ['4', 'HTML 内容可保留基础格式；脚本和危险标签会在导入时被清理。'],
      ['5', '标签、徽标等多值内容必须使用英文分号 ; 分隔，数量需与中文一致。'],
      ['6', '空白译文不会清空已有内容，只会被跳过。'],
    ].forEach(row => guide.addRow(row));
    guide.getColumn(1).width = 8;
    guide.getColumn(2).width = 100;
    const exportedAt = new Date();
    const meta = workbook.addWorksheet('_meta', { state: 'veryHidden' });
    [['key', 'value'], ['templateVersion', IMPORT_TEMPLATE_VERSION], ['siteId', siteId], ['sourceLocale', 'zh_CN'], ['targetLocale', locale], ['exportedAt', exportedAt.toISOString()]].forEach(row => meta.addRow(row));
    const stamp = exportedAt.toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const safeName = site.name.replace(/[\\/:*?"<>|]/g, '-').trim() || '站点';
    return { data: Buffer.from(await workbook.xlsx.writeBuffer()), filename: `${safeName}-多语言-${locale}-${stamp}.xlsx` };
  }

  async previewImport(siteId: string, userId: string, locale: string, buffer: Buffer) {
    await this.assertTargetLocale(siteId, locale);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(buffer as any); } catch { throw new BadRequestException('无法读取 Excel 文件，请使用系统导出的 .xlsx 文件'); }
    const sheet = workbook.getWorksheet('翻译内容');
    const metaSheet = workbook.getWorksheet('_meta');
    if (!sheet || !metaSheet) throw new BadRequestException('Excel 模板不完整，请重新导出最新模板');
    const headerRows = worksheetRows(sheet);
    const headers = (headerRows[0] || []).map(value => value.trim());
    const missingHeaders = IMPORT_COLUMNS.filter(column => !headers.includes(column));
    if (missingHeaders.length) throw new BadRequestException(`Excel 缺少必要列：${missingHeaders.join('、')}`);
    const metaRows = worksheetRows(metaSheet);
    const meta = Object.fromEntries(metaRows.slice(1).map(row => [String(row[0] || ''), String(row[1] || '')]));
    if (meta.templateVersion !== IMPORT_TEMPLATE_VERSION) throw new BadRequestException('Excel 模板版本已过期，请重新导出');
    if (meta.siteId !== siteId) throw new BadRequestException('Excel 不属于当前站点');
    if (meta.sourceLocale !== 'zh_CN' || meta.targetLocale !== locale) throw new BadRequestException('Excel 目标语言与当前选择不一致');
    const input = worksheetObjects(sheet);
    if (!input.length) throw new BadRequestException('Excel 中没有可导入的数据');
    await this.sync(siteId);
    const active = await this.units.find({ where: { siteId, isArchived: false } });
    const unitMap = new Map(active.map(unit => [unit.id, unit]));
    const currentValues = active.length ? await this.values.find({ where: { unitId: In(active.map(unit => unit.id)), locale } }) : [];
    const valueMap = new Map(currentValues.map(item => [item.unitId, item.value]));
    const counts = new Map<string, number>();
    input.forEach(row => { const id = String(row['翻译单元ID'] || '').trim(); if (id) counts.set(id, (counts.get(id) || 0) + 1); });
    const rows: ImportPreviewRow[] = input.map((row, index) => {
      const rowNumber = index + 2;
      const unitId = String(row['翻译单元ID'] || '').trim();
      const key = String(row['稳定键'] || '').trim();
      const sourceText = String(row['中文原文'] || '');
      const sourceHash = String(row['中文源文哈希'] || '').trim();
      const targetLocale = String(row['目标语言'] || '').trim();
      const rawValue = String(row['译文'] || '');
      const base = { row: rowNumber, unitId, key, sourceText, value: rawValue };
      if (!unitId || !key || !sourceHash || !targetLocale) return { ...base, status: 'invalid', reason: '缺少必要技术字段' };
      if (targetLocale !== locale) return { ...base, status: 'invalid', reason: '行目标语言不一致' };
      if ((counts.get(unitId) || 0) > 1) return { ...base, status: 'duplicate', reason: '翻译单元重复' };
      const unit = unitMap.get(unitId);
      if (!unit || unit.fieldKey !== key) return { ...base, status: 'removed', reason: '内容已删除、归档或稳定键已变化' };
      if (unit.sourceHash !== sourceHash || this.hash(sourceText) !== sourceHash) return { ...base, status: 'source_changed', reason: '中文原文已变化' };
      if (!rawValue.trim()) return { ...base, status: 'blank', reason: '译文为空，保持现有内容' };
      let value: string;
      try { value = this.normalizeTranslationValue(unit, rawValue); } catch (error) { return { ...base, status: 'invalid', reason: error instanceof Error ? error.message : '译文格式不合法' }; }
      if ((valueMap.get(unitId) || '') === value) return { ...base, value, status: 'unchanged', reason: '译文无变化' };
      return { ...base, value, status: 'ready', reason: '可导入' };
    });
    const importedUnitIds = new Set(input.map(row => String(row['翻译单元ID'] || '').trim()).filter(Boolean));
    const addedSinceExport = active.filter(unit => !importedUnitIds.has(unit.id)).length;
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + IMPORT_PREVIEW_TTL).toISOString();
    const cache: ImportPreviewCache = { siteId, userId, locale, fileHash: this.hash(buffer.toString('base64')), expiresAt, rows };
    await this.cache.set(this.importCacheKey(token), cache, IMPORT_PREVIEW_TTL);
    if (!await this.cache.get<ImportPreviewCache>(this.importCacheKey(token))) throw new BadRequestException('导入预检暂时不可用，请稍后重试');
    return { token, expiresAt, summary: this.importSummary(rows, addedSinceExport), rows };
  }

  async commitImport(siteId: string, userId: string, locale: string, token: string) {
    const preview = await this.getImportPreview(siteId, userId, locale, token);
    await this.sync(siteId);
    const ready = preview.rows.filter(row => row.status === 'ready');
    const units = ready.length ? await this.units.find({ where: { siteId, id: In(ready.map(row => row.unitId)), isArchived: false } }) : [];
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    let staleSkipped = preview.rows.filter(row => row.status === 'source_changed' || row.status === 'removed').length;
    let imported = 0;
    await this.values.manager.transaction(async manager => {
      for (const row of ready) {
        const unit = unitMap.get(row.unitId);
        if (!unit || unit.fieldKey !== row.key || unit.sourceHash !== this.hash(row.sourceText)) { staleSkipped += 1; continue; }
        const existing = await manager.findOne(TranslationValue, { where: { unitId: unit.id, locale } });
        await manager.save(TranslationValue, manager.create(TranslationValue, { ...existing, unitId: unit.id, locale, value: row.value, sourceHash: unit.sourceHash }));
        imported += 1;
      }
    });
    await this.cache.del(this.importCacheKey(token));
    return {
      imported,
      unchanged: preview.rows.filter(row => row.status === 'unchanged').length,
      blankSkipped: preview.rows.filter(row => row.status === 'blank').length,
      staleSkipped,
      invalidSkipped: preview.rows.filter(row => row.status === 'invalid' || row.status === 'duplicate').length,
    };
  }

  async importReport(siteId: string, userId: string, token: string) {
    const preview = await this.cache.get<ImportPreviewCache>(this.importCacheKey(token));
    if (!preview || preview.siteId !== siteId || preview.userId !== userId) throw new BadRequestException('预检结果已过期，请重新上传 Excel');
    const rows = preview.rows.map(row => ({ 'Excel 行号': row.row, '稳定键': row.key, '中文原文': row.sourceText, '译文': row.value, '校验结果': row.reason }));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('预检结果');
    const columns = ['Excel 行号', '稳定键', '中文原文', '译文', '校验结果'];
    sheet.addRow(columns);
    rows.forEach(row => sheet.addRow(columns.map(column => row[column as keyof typeof row])));
    [12, 48, 48, 48, 30].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private extractEditor(config: any, add: (source: Source) => void) {
    const descriptors = this.editorDescriptors(config);
    const descriptorKeys = new Set(descriptors.map(descriptor => descriptor.key));
    if (descriptors.length) {
      descriptors.forEach(descriptor => {
        const sourceText = this.resolveEditorSource(config, descriptor);
        add({ resourceType: 'editor', resourceId: descriptor.componentId || descriptor.pageId || 'siteInfo', fieldKey: descriptor.key, sourceText, required: descriptor.required !== false, includeWhenEmpty: descriptor.pageId === 'siteInfo' });
      });
    } else {
    const simpleFields = ['title', 'subtitle', 'eyebrow', 'buttonText', 'secondaryButtonText', 'promiseTitle', 'promiseText', 'qualityBadgeText'];
    Object.entries(config?.pages || {}).filter(([page]) => page === 'home').forEach(([page, pageConfig]: [string, any]) => (pageConfig?.sections || []).filter((section: any) => section.visible !== false && section.type !== 'contactModal').forEach((section: any) => {
      simpleFields.forEach(field => add({ resourceType: 'editor', resourceId: section.id, fieldKey: `editor:${page}:${section.id}:${field}`, sourceText: String(section[field] || '') }));
      (section.navItems || []).forEach((item: any) => add({ resourceType: 'editor', resourceId: section.id, fieldKey: `editor:${page}:${section.id}:nav:${item.id}:label`, sourceText: item.label || '' }));
      (section.formFields || []).filter((item: any) => item.enabled).forEach((item: any) => add({ resourceType: 'editor', resourceId: section.id, fieldKey: `editor:${page}:${section.id}:form:${item.key}:label`, sourceText: item.label || '' }));
      (section.stats || []).forEach((item: any) => add({ resourceType: 'editor', resourceId: section.id, fieldKey: `editor:${page}:${section.id}:stat:${item.id}:label`, sourceText: item.label || '' }));
    }));
    }
    const info = config?.siteInfo || {};
    if (!descriptorKeys.has('editor:siteInfo:contactModalTitle')) add({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: 'editor:siteInfo:contactModalTitle', sourceText: info.contactModalTitle || '' });
    if (!descriptorKeys.has('editor:siteInfo:contactModalSubtitle')) add({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: 'editor:siteInfo:contactModalSubtitle', sourceText: info.contactModalSubtitle || '' });
    const legacyContactFields = ['email', 'phone', 'whatsapp', 'hours', 'address'];
    const contactItems = Array.isArray(info.contactItems) ? info.contactItems : legacyContactFields.filter(field => String(info.contactDetails?.[field] || '').trim()).map(field => ({ id: `legacy-${field}`, label: info.contactLabels?.[field] || field, content: info.contactDetails?.[field] || '' }));
    contactItems.forEach((item: any) => {
      const id = String(item.id || '');
      if (!id) return;
      const label = String(item.label || '');
      const content = String(item.content || '');
      const labelKey = `editor:siteInfo:contact:${id}:label`;
      const contentKey = `editor:siteInfo:contact:${id}:content`;
      if (!descriptorKeys.has(labelKey)) add({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: labelKey, sourceText: label, required: Boolean(label.trim()), includeWhenEmpty: true });
      if (!descriptorKeys.has(contentKey)) add({ resourceType: 'editor', resourceId: 'siteInfo', fieldKey: contentKey, sourceText: content, required: Boolean(content.trim()), includeWhenEmpty: true });
    });
  }
  private editorDescriptors(config: any): EditorDescriptor[] {
    const inferred: EditorDescriptor[] = [];
    Object.entries(config?.pages || {}).filter(([pageId]) => pageId === 'home').forEach(([pageId, page]: [string, any], pageIndex) => {
      (page?.sections || []).forEach((section: any, sectionIndex: number) => {
        if (section?.visible === false || section?.type === 'contactModal' || (section?.type === 'header' && pageId !== 'home')) return;
        const componentName = EDITOR_COMPONENT_NAMES[section.type];
        if (!componentName || !section.id) return;
        const base = { pageId, pageName: EDITOR_PAGE_NAMES[pageId] || pageId, componentId: section.id, componentType: section.type, componentName };
        const add = (key: string, path: string, fieldLabel: string, order: number) => inferred.push({ ...base, key, path, fieldLabel, order, required: false });
        (EDITOR_TEXT_FIELDS[section.type] || []).forEach(([field, label], fieldIndex) => {
          if ((field === 'eyebrow' && section.showEyebrow === false) || (field === 'buttonText' && section.showButton === false) || (field === 'secondaryButtonText' && section.showSecondaryButton === false)) return;
          add(`editor:${pageId}:${section.id}:${field}`, `pages.${pageId}.sections.${section.id}.${field}`, label, pageIndex * 10000 + sectionIndex * 100 + fieldIndex);
        });
        const dynamic = section.type === 'header' || section.type === 'footer' ? ['navItems', 'nav', '导航文案'] : section.type === 'form' ? ['formFields', 'form', '表单字段'] : section.type === 'text' && section.showStats !== false ? ['stats', 'stat', '数据标签'] : null;
        if (dynamic) (section[dynamic[0]] || []).forEach((item: any, itemIndex: number) => {
          if (dynamic[0] === 'formFields' && item.enabled === false) return;
          const itemId = dynamic[0] === 'formFields' ? item.key : item.id;
          if (!itemId) return;
          add(`editor:${pageId}:${section.id}:${dynamic[1]}:${itemId}:label`, `pages.${pageId}.sections.${section.id}.${dynamic[0]}.${itemId}.label`, dynamic[2], pageIndex * 10000 + sectionIndex * 100 + 50 + itemIndex);
        });
        if (section.type === 'footer') (section.socialLinks || []).forEach((item: any, itemIndex: number) => {
          if (!item.id) return;
          add(`editor:${pageId}:${section.id}:social:${item.id}:label`, `pages.${pageId}.sections.${section.id}.socialLinks.${item.id}.label`, '社交媒体名称', pageIndex * 10000 + sectionIndex * 100 + 70 + itemIndex);
        });
        if (section.type === 'hero' && section.showTrustBar !== false) (section.trustItems?.length ? section.trustItems : DEFAULT_HERO_TRUST_ITEMS).forEach((item: any, itemIndex: number) => {
          if (!item.id) return;
          add(`editor:${pageId}:${section.id}:trust:${item.id}:title`, `pages.${pageId}.sections.${section.id}.trustItems.${item.id}.title`, '服务承诺标题', pageIndex * 10000 + sectionIndex * 100 + 60 + itemIndex * 2);
          add(`editor:${pageId}:${section.id}:trust:${item.id}:description`, `pages.${pageId}.sections.${section.id}.trustItems.${item.id}.description`, '服务承诺说明', pageIndex * 10000 + sectionIndex * 100 + 61 + itemIndex * 2);
        });
      });
    });
    const info = config?.siteInfo || {};
    const contactBase = { pageId: 'siteInfo', pageName: '联系我们', componentId: 'siteInfo', componentType: 'contactModal', componentName: '联系我们' };
    inferred.push({ ...contactBase, key: 'editor:siteInfo:contactModalTitle', path: 'siteInfo.contactModalTitle', fieldLabel: '区块标题', order: 0, required: true });
    inferred.push({ ...contactBase, key: 'editor:siteInfo:contactModalSubtitle', path: 'siteInfo.contactModalSubtitle', fieldLabel: '说明文字', order: 1, required: true });
    const legacyContactFields = ['email', 'phone', 'whatsapp', 'hours', 'address'];
    const contactItems = Array.isArray(info.contactItems) ? info.contactItems : legacyContactFields.filter(field => String(info.contactDetails?.[field] || '').trim()).map(field => ({ id: `legacy-${field}`, label: info.contactLabels?.[field] || field, content: info.contactDetails?.[field] || '' }));
    contactItems.forEach((item: any, index: number) => {
      if (!item.id) return;
      inferred.push({ ...contactBase, key: `editor:siteInfo:contact:${item.id}:label`, path: `siteInfo.contactItems.${item.id}.label`, fieldLabel: '标签', order: 2 + index * 2, required: Boolean(item.label?.trim()) });
      inferred.push({ ...contactBase, key: `editor:siteInfo:contact:${item.id}:content`, path: `siteInfo.contactItems.${item.id}.content`, fieldLabel: '内容', order: 3 + index * 2, required: Boolean(item.content?.trim()) });
    });
    const saved = (Array.isArray(config?.translationDescriptors) ? config.translationDescriptors : []) as EditorDescriptor[];
    const merged = new Map(inferred.map(item => [item.key, item]));
    saved.filter(item => {
      const section = (config?.pages?.[item.pageId || '']?.sections || []).find((value: any) => value.id === item.componentId);
      const removedField = ['categoryFilterTitle', 'productBadgeTitle', 'quickNavigationTitle', 'contactTitle'].some(field => item.key.endsWith(`:${field}`));
      return !removedField && item.pageId === 'home' && section && section.visible !== false && section.type !== 'contactModal';
    }).forEach(item => merged.set(item.key, item));
    return [...merged.values()].sort((a, b) => a.order - b.order);
  }
  private resolveEditorSource(config: any, descriptor: EditorDescriptor): string {
    if (descriptor.pageId === 'siteInfo') {
      const info = config?.siteInfo || {};
      const parts = descriptor.key.split(':');
      if (parts.includes('contact')) {
        const id = parts[parts.indexOf('contact') + 1];
        const field = parts[parts.length - 1];
        const legacyField = id.startsWith('legacy-') ? id.slice('legacy-'.length) : '';
        const item = (info.contactItems || []).find((value: any) => value.id === id);
        return String(item?.[field] || (field === 'label' ? info.contactLabels?.[legacyField] : info.contactDetails?.[legacyField]) || '');
      }
      return String(descriptor.key.endsWith('contactModalTitle') ? info.contactModalTitle || '' : info.contactModalSubtitle || '');
    }
    const page = config?.pages?.[descriptor.pageId || ''];
    const section = (page?.sections || []).find((item: any) => item.id === descriptor.componentId);
    if (!section) return '';
    const parts = descriptor.key.split(':');
    const field = parts[parts.length - 1];
    if (parts.includes('nav')) return String((section.navItems || []).find((item: any) => item.id === parts[parts.indexOf('nav') + 1])?.label || '');
    if (parts.includes('form')) return String((section.formFields || []).find((item: any) => item.key === parts[parts.indexOf('form') + 1])?.label || '');
    if (parts.includes('stat')) return String((section.stats || []).find((item: any) => item.id === parts[parts.indexOf('stat') + 1])?.label || '');
    if (parts.includes('trust')) return String((section.trustItems?.length ? section.trustItems : DEFAULT_HERO_TRUST_ITEMS).find((item: any) => item.id === parts[parts.indexOf('trust') + 1])?.[field] || '');
    if (parts.includes('social')) return String((section.socialLinks || []).find((item: any) => item.id === parts[parts.indexOf('social') + 1])?.label || '');
    return String(section[field] || '');
  }
  private async assertTargetLocale(siteId: string, locale: string) {
    const site = await this.sites.findOneByOrFail({ id: siteId });
    if (locale === 'zh_CN') throw new BadRequestException('简体中文是源语言，无需导入或导出译文');
    if (!(site.supportedLanguages || [site.defaultLanguage]).includes(locale)) throw new BadRequestException('该语言未在站点中启用');
    return site;
  }
  private businessObjectName(unit: TranslationUnit, units: TranslationUnit[]) {
    if (unit.resourceType === 'product') return units.find(item => item.resourceId === unit.resourceId && item.fieldKey.endsWith(':name'))?.sourceText || unit.resourceId;
    if (unit.resourceType === 'category') return units.find(item => item.resourceId === unit.resourceId && item.fieldKey.endsWith(':label'))?.sourceText || unit.resourceId;
    if (unit.resourceType === 'editor') return unit.fieldKey.startsWith('editor:siteInfo:') ? '联系我们' : EDITOR_PAGE_NAMES[unit.fieldKey.split(':')[1]] || '站点页面';
    if (unit.resourceType === 'seo') return '站点设置';
    if (unit.resourceType === 'system') return '独立站公共交互';
    if (unit.resourceType === 'constant') return unit.resourceId === 'product' ? '商品常量' : '独立站常量';
    return unit.resourceId;
  }
  private fieldLabel(unit: TranslationUnit) {
    const tail = unit.fieldKey.split(':').pop() || unit.fieldKey;
    const labels: Record<string, string> = { name: '名称', description: '描述', seoTitle: 'SEO 标题', seoDescription: 'SEO 描述', brand: '品牌', tags: '标签', specification: '规格名', option: '规格值', label: '标签', remark: '备注', title: '标题', subtitle: '说明文字', eyebrow: '眉标文案', buttonText: '按钮文案', secondaryButtonText: '次按钮', content: '内容', keywords: 'SEO 关键词' };
    return labels[tail] || tail.replace(/([A-Z])/g, ' $1').trim() || '-';
  }
  private normalizeTranslationValue(unit: TranslationUnit, raw: string) {
    let value = raw.trim();
    if (unit.contentFormat === 'html') value = this.htmlFilter.process(value).trim();
    if ((unit.fieldKey.endsWith(':tags') || unit.fieldKey === 'constant:product.badges') && value) {
      const sourceTags = unit.sourceText.split(';').map(tag => tag.trim()).filter(Boolean);
      const translatedTags = value.split(';').map(tag => tag.trim()).filter(Boolean);
      if (translatedTags.length !== sourceTags.length) throw new Error('译文需与中文内容数量一致，并使用分号 ; 分隔');
      value = translatedTags.join(';');
    }
    if (value.length > 100000) throw new Error('译文超过 100000 字符');
    return value;
  }
  private importSummary(rows: ImportPreviewRow[], addedSinceExport: number) {
    const count = (status: ImportRowStatus) => rows.filter(row => row.status === status).length;
    return { total: rows.length, ready: count('ready'), unchanged: count('unchanged'), blank: count('blank'), sourceChanged: count('source_changed'), removed: count('removed'), duplicate: count('duplicate'), invalid: count('invalid'), addedSinceExport };
  }
  private importCacheKey(token: string) { return `translation-import:${token}`; }
  private async getImportPreview(siteId: string, userId: string, locale: string, token: string) {
    const preview = await this.cache.get<ImportPreviewCache>(this.importCacheKey(token));
    if (!preview || preview.siteId !== siteId || preview.userId !== userId || preview.locale !== locale || new Date(preview.expiresAt).getTime() <= Date.now()) throw new BadRequestException('预检结果已过期，请重新上传 Excel');
    return preview;
  }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
