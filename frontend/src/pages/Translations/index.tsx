import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, Pagination, Progress, Select, Skeleton, Table, Tabs, Tag, Upload, message } from 'antd';
import { ChevronDown, Copy, Download, Languages, LayoutTemplate, Package, Save, Search, Type, Upload as UploadIcon } from 'lucide-react';
import { AppModal, PageContent, PageHeader, RichTextEditor } from '../../components/shared';
import { translationApi, workspaceApi, type TranslationImportPreview, type TranslationImportPreviewRow, type TranslationImportRowStatus, type TranslationItem, type TranslationSummary, type TranslationTaskTab } from '../../services/api/index';
import { ANTD_LOCALE_OPTIONS, antdLocaleLabel } from '../../config/antdLocales';
import { can } from '../../utils/permissions';
import { useTablePagination } from '../../hooks/useTablePagination';

type ContentTab = TranslationTaskTab;
type ItemGroup = { key: string; title: string; description?: string; code?: string; items: TranslationItem[]; total: number; completed: number; stale: number; missing: number };

const tabMeta: Record<ContentTab, { label: string; icon: React.ReactNode }> = {
  product: { label: '商品内容', icon: <Package size={16}/> },
  page: { label: '页面内容', icon: <LayoutTemplate size={16}/> },
  common: { label: '公共文案', icon: <Type size={16}/> },
};
const resourceLabels: Record<string, string> = { site: '站点设置', editor: '页面设计', product: '商品', constant: '常量', category: '商品分类', seo: 'SEO 设置', system: '系统文案' };
const statusMeta = { missing: { label: '未翻译', color: 'default' }, stale: { label: '已过期', color: 'warning' }, completed: { label: '已完成', color: 'success' } } as const;
const importStatusMeta = { ready: { label: '可导入', color: 'success' }, unchanged: { label: '无变化', color: 'default' }, blank: { label: '空白跳过', color: 'default' }, source_changed: { label: '中文已变化', color: 'warning' }, removed: { label: '已删除或归档', color: 'warning' }, duplicate: { label: '重复行', color: 'error' }, invalid: { label: '格式错误', color: 'error' } } as const;
const pageLabels: Record<string, string> = { home: '首页', products: '商品列表页', product: '商品详情页', about: '关于我们', contact: '联系我们', siteInfo: '联系我们' };
const fieldLabels: Record<string, string> = { name: '商品名称', description: '商品描述', badge: '商品标记', badges: '商品标记', moq: '最低起订量', productBadge: '商品标记', quickNavigation: '快速导航', tags: '商品标签', title: '标题', subtitle: '副标题', eyebrow: '眉题', buttonText: '主按钮', secondaryButtonText: '次按钮', promiseTitle: '承诺标题', promiseText: '承诺内容', qualityBadgeText: '品质保证标识', label: '分类名称', remark: '分类说明', specification: '规格名称', option: '规格选项', contactModalTitle: '区块标题', contactModalSubtitle: '说明文字', content: '内容', keywords: 'SEO 关键词', company: '公司名称', text: '评价正文', displayName: '展示名称' };
const systemFieldMeta: Record<string, { name: string; usage: string }> = {
  'system:empty.products': { name: '商品列表空数据', usage: '商品列表或分类筛选没有商品时显示' },
  'system:empty.categories': { name: '商品分类空数据', usage: '商品分类列表没有可用分类时显示' },
  'system:empty.contactInformation': { name: '联系信息空数据', usage: '联系我们弹窗没有配置联系信息时显示' },
  'system:guestAccess.disabledTitle': { name: '游客禁止访问标题', usage: '关闭“允许游客访问”后在独立站显示' },
  'system:guestAccess.disabledDescription': { name: '游客禁止访问说明', usage: '关闭“允许游客访问”后在独立站显示' },
  'system:siteAccess.planExpiredTitle': { name: '套餐过期标题', usage: '租户套餐过期后在独立站显示' },
  'system:siteAccess.planExpiredDescription': { name: '套餐过期说明', usage: '租户套餐过期后在独立站显示' },
  'system:siteAccess.publishPermissionTitle': { name: '无发布权限标题', usage: '租户没有独立站发布权限时显示' },
  'system:siteAccess.publishPermissionDescription': { name: '无发布权限说明', usage: '租户没有独立站发布权限时显示' },
};
const apiErrorFieldNames: Record<string, string> = {
  'system:apiErrors.SITE_NOT_FOUND_OR_UNPUBLISHED': '站点不可访问',
  'system:apiErrors.CONTACT_NAME_REQUIRED': '联系人必填',
  'system:apiErrors.CONTACT_METHOD_REQUIRED': '联系方式必填',
  'system:apiErrors.PURCHASE_REQUIREMENTS_REQUIRED': '采购需求必填',
  'system:apiErrors.INQUIRY_SUBMIT_FAILED': '询盘提交失败',
  'system:apiErrors.SERVICE_UNAVAILABLE': '服务不可用',
  'system:apiErrors.NETWORK_ERROR': '网络异常',
  'system:apiErrors.UNKNOWN_ERROR': '未知错误',
};
const siteSettingOrder = (item: TranslationItem) => {
  const order: Record<string, number> = { 'seo:title': 0, 'seo:description': 1, 'seo:keywords': 2 };
  return order[item.key] ?? 99;
};
const fieldRenderOrder = (item: TranslationItem) => {
  if (item.meta?.order !== undefined) return Number(item.meta.order);
  const tail = item.key.split(':').pop() || item.key;
  if (item.resourceType === 'product') {
    if (tail === 'name') return 0;
    if (tail === 'description') return 10;
    if (item.key.includes(':tag:')) return 20 + Number(tail || 0);
    if (tail === 'specification') return 100;
    if (tail === 'option') return 101;
  }
  if (item.resourceType === 'category') return Number(item.meta?.sort ?? 0) * 10 + (tail === 'label' ? 0 : tail === 'remark' ? 1 : 9);
  if (item.resourceType === 'seo') return siteSettingOrder(item);
  const commonOrder = [
    'system:empty.products', 'system:empty.categories', 'system:empty.contactInformation',
    'system:guestAccess.disabledTitle', 'system:guestAccess.disabledDescription',
    'system:siteAccess.planExpiredTitle', 'system:siteAccess.planExpiredDescription',
    'system:siteAccess.publishPermissionTitle', 'system:siteAccess.publishPermissionDescription',
    'system:inquiry.submitting', 'system:inquiry.preview', 'system:inquiry.validation', 'system:inquiry.success',
    'system:apiErrors.SITE_NOT_FOUND_OR_UNPUBLISHED', 'system:apiErrors.CONTACT_NAME_REQUIRED', 'system:apiErrors.CONTACT_METHOD_REQUIRED',
    'system:apiErrors.PURCHASE_REQUIREMENTS_REQUIRED', 'system:apiErrors.INQUIRY_SUBMIT_FAILED', 'system:apiErrors.SERVICE_UNAVAILABLE',
    'system:apiErrors.NETWORK_ERROR', 'system:apiErrors.UNKNOWN_ERROR',
    'constant:product.moq', 'constant:product.badges', 'constant:storefront.productBadge', 'constant:storefront.quickNavigation',
  ];
  const index = commonOrder.indexOf(item.key);
  return index < 0 ? 1000 : index;
};
const compareTranslationItems = (a: TranslationItem, b: TranslationItem) => fieldRenderOrder(a) - fieldRenderOrder(b) || a.key.localeCompare(b.key, 'zh-CN');

const fieldName = (item: TranslationItem) => {
  if (systemFieldMeta[item.key]) return systemFieldMeta[item.key].name;
  if (apiErrorFieldNames[item.key]) return apiErrorFieldNames[item.key];
  if (item.resourceType === 'editor' && item.meta?.fieldLabel) return String(item.meta.fieldLabel);
  if (item.key.startsWith('editor:siteInfo:contact:')) return item.key.endsWith(':label') ? '标签' : '内容';
  const parts = item.key.split(':'); const tail = parts[parts.length - 1] || item.key;
  if (item.resourceType === 'constant') {
    const constantName = tail.split('.').pop() || tail;
    return fieldLabels[constantName] || item.sourceText || '-';
  }
  if (parts.includes('tag')) return `商品标签 ${Number(parts[parts.length - 1]) + 1 || ''}`.trim();
  if (parts.includes('nav')) return '导航文案';
  if (parts.includes('form')) return '表单字段';
  if (parts.includes('stat')) return '数据标签';
  if (parts.includes('social')) return '社交媒体名称';
  if (parts.includes('seo')) return ({ title: 'SEO 标题', description: 'SEO 描述', keywords: 'SEO 关键词' } as Record<string, string>)[tail] || `SEO ${tail}`;
  return fieldLabels[tail] || tail.replace(/([A-Z])/g, ' $1').trim();
};
const TranslationField: React.FC<{ item: TranslationItem; locale: string; editable: boolean; value: string; onChange: (value: string) => void }> = ({ item, locale, editable, value, onChange }) => {
  const copyKey = async () => {
    try { await navigator.clipboard.writeText(item.key); message.success('稳定键已复制'); }
    catch { message.error('复制失败，请重试'); }
  };
  const copySource = async () => {
    const source = item.contentFormat === 'html' ? new DOMParser().parseFromString(item.sourceText, 'text/html').body.textContent || '' : item.sourceText;
    try { await navigator.clipboard.writeText(source); message.success('中文原文已复制'); }
    catch { message.error('复制失败，请重试'); }
  };
  return <div className="rounded-xl border border-border/80 bg-secondary/20 p-3">
  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
    <span className="shrink-0 text-sm font-semibold">{fieldName(item)}</span>
    <span className="flex min-w-0 max-w-[min(320px,32vw)] items-center font-mono text-[11px] text-muted-foreground"><span className="shrink-0">(</span><span title={item.key} className="min-w-0 truncate">{item.key}</span><span className="shrink-0">)</span></span>
    <button type="button" aria-label={`复制稳定键 ${item.key}`} title="复制稳定键" onClick={() => void copyKey()} className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-white hover:text-primary"><Copy size={13}/></button>
    <div className="ml-auto flex shrink-0 items-center gap-1.5"><Tag color={statusMeta[item.status].color}>{statusMeta[item.status].label}</Tag></div>
  </div>
  <div className="mt-2 grid items-end gap-2 md:grid-cols-2">
    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><span>中文原文</span><button type="button" aria-label={`复制${fieldName(item)}中文原文`} title="复制中文原文" onClick={() => void copySource()} className="rounded p-1 transition hover:bg-white hover:text-primary"><Copy size={12}/></button></div>
    <div className="text-xs font-medium text-muted-foreground">{antdLocaleLabel(locale)}译文</div>
  </div>
  <div className="mt-1.5 grid items-stretch gap-2 md:grid-cols-2">
    {item.contentFormat === 'html' ? <div className="h-[137px] overflow-y-auto rounded-xl border border-border bg-white px-4 py-2 text-sm leading-7 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: item.sourceText || '-' }}/> : <Input aria-label={`${fieldName(item)}中文原文`} title={item.sourceText || '-'} readOnly value={item.sourceText} />}
    {item.contentFormat === 'html'
      ? <RichTextEditor compact disabled={!editable} value={value} placeholder={`请输入${fieldName(item)}译文`} onChange={onChange}/>
      : (
        <Input
          aria-label={`${fieldName(item)}译文`}
          variant="filled"
          disabled={!editable}
          value={value}
          placeholder={item.key.endsWith(':tags') || item.key.endsWith(':badges') || item.key.endsWith('.badges') ? '多个内容请用分号 ; 分隔' : `请输入${fieldName(item)}译文`}
          onChange={event => onChange(event.target.value)}
        />
      )}
  </div>
</div>;
};

const TranslationsPage: React.FC = () => {
  const editable = can('site.translation.edit');
  const [languages, setLanguages] = useState<string[]>([]); const [locale, setLocale] = useState('en_US');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentTab>('product'); const [status, setStatus] = useState('');
  const [keywordInput, setKeywordInput] = useState(''); const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<TranslationItem[]>([]); const [summary, setSummary] = useState<TranslationSummary[]>([]);
  const [fieldTotal, setFieldTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({}); const [loadedItems, setLoadedItems] = useState<Record<string, TranslationItem>>({}); const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('站点'); const [importPreview, setImportPreview] = useState<TranslationImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false); const [committing, setCommitting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [activeGroup, setActiveGroup] = useState('');
  const productPagination = useTablePagination();
  const requestSequence = useRef(0);

  useEffect(() => { workspaceApi.getSettings().then(settings => { const values = (settings.site.supportedLanguages || [settings.site.defaultLanguage]).filter(item => item !== 'zh_CN'); setSiteName(settings.site.name || '站点'); setLanguages(values); setLocale(current => values.includes(current) ? current : values[0] || 'en_US'); if (!values.length) setLoading(false); }).finally(() => setSettingsLoading(false)); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { productPagination.reset(); setKeyword(keywordInput.trim()); }, 350); return () => window.clearTimeout(timer); }, [keywordInput, productPagination.reset]);
  const loadType = useCallback(async () => {
    return translationApi.list({ locale, taskTab: activeTab, status: status || undefined, keyword: keyword || undefined, groupPage: productPagination.current, groupPageSize: productPagination.pageSize });
  }, [activeTab, keyword, locale, productPagination.current, productPagination.pageSize, status]);
  const load = useCallback(async () => {
    if (!languages.length) return; const sequence = ++requestSequence.current; setLoading(true);
    try { const result = await loadType(); if (sequence !== requestSequence.current) return; const nextItems = result.items; setItems(nextItems); setFieldTotal(result.total); productPagination.reconcile(result.groupTotal ?? 0); setSummary(result.contentSummary || result.summary || []); setLoadedItems(current => ({ ...current, ...Object.fromEntries(nextItems.map(item => [item.key, item])) })); setDrafts(current => ({ ...Object.fromEntries(nextItems.filter(item => current[item.key] === undefined).map(item => [item.key, item.value])), ...current })); }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [languages.length, loadType]);
  useEffect(() => { void load(); }, [load]);
  const dirty = useMemo(() => Object.values(loadedItems).filter(item => (drafts[item.key] ?? '') !== item.value), [loadedItems, drafts]);
  const save = async () => { if (!dirty.length) return; await translationApi.save(locale, dirty.map(item => ({ key: item.key, value: drafts[item.key] || '' }))); setLoadedItems(current => ({ ...current, ...Object.fromEntries(dirty.map(item => [item.key, { ...item, value: drafts[item.key] || '' }])) })); message.success(`已保存 ${dirty.length} 条译文`); await load(); };
  const saveBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); };
  const download = async () => { const blob = await translationApi.export(locale); const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); saveBlob(blob, `${siteName.replace(/[\\/:*?"<>|]/g, '-')}-多语言-${locale}-${stamp}.xlsx`); };
  const upload = async (file: File) => { setPreviewing(true); try { setImportPreview(await translationApi.previewImport(locale, file)); } finally { setPreviewing(false); } return false; };
  const downloadImportReport = async () => { if (!importPreview) return; saveBlob(await translationApi.importReport(importPreview.token), '多语言导入预检结果.xlsx'); };
  const commitImport = async () => { if (!importPreview) return; setCommitting(true); try { const result = await translationApi.commitImport(locale, importPreview.token); message.success(`成功导入 ${result.imported} 条，跳过 ${result.blankSkipped + result.staleSkipped + result.invalidSkipped} 条，无变化 ${result.unchanged} 条`); setImportPreview(null); setDrafts({}); setLoadedItems({}); await load(); } finally { setCommitting(false); } };
  const selectedSummary = summary.find(item => item.locale === locale);
  const localeOptions = useMemo(() => ANTD_LOCALE_OPTIONS.filter(option => languages.includes(option.value)).map(option => ({ value: option.value, label: antdLocaleLabel(option.value) })), [languages]);
  const groups = useMemo<ItemGroup[]>(() => {
    const byKey = new Map<string, TranslationItem[]>();
    const details = new Map<string, Pick<ItemGroup, 'title' | 'description' | 'code'>>();
    items.forEach(item => {
      let key = `${item.resourceType}:${item.resourceId}`; let title = resourceLabels[item.resourceType] || item.resourceType; let description: string | undefined; let code: string | undefined;
      if (item.resourceType === 'product') { key = `product:${item.resourceId}`; title = items.find(value => value.resourceId === item.resourceId && value.key.endsWith(':name'))?.sourceText || '未命名商品'; code = item.meta?.sku || '-'; }
      else if (item.resourceType === 'category') { const level = Number(item.meta?.level || 1); key = `category-level-${level}`; title = `${['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][level] || level}级分类`; }
      else if (item.resourceType === 'editor') { const page = String(item.meta?.pageId || item.key.split(':')[1]); key = item.key.startsWith('editor:siteInfo:') ? 'editor:siteInfo' : `editor:${page}:${item.meta?.componentId || item.resourceId}`; title = String(item.meta?.componentName || pageLabels[page] || '页面内容'); description = item.meta?.pageName ? `所属页面：${item.meta.pageName}` : undefined; }
      else if (item.resourceType === 'seo') { key = 'site-settings'; title = '站点设置'; description = '站点搜索引擎标题、描述和关键词。'; }
      else if (item.resourceType === 'system') { const section = item.key.split(':')[1]?.split('.')[0] || 'system'; const names: Record<string, string> = { guestAccess: '游客访问提示', siteAccess: '站点访问提示', empty: '空数据文案', inquiry: '询盘交互', apiErrors: '公开接口反馈' }; key = `system:${section}`; title = names[section] || '公共交互'; }
      else if (item.resourceType === 'constant') { key = `constant:${item.resourceId}`; title = item.resourceId === 'product' ? '商品标记与属性' : '导航与展示文案'; }
      byKey.set(key, [...(byKey.get(key) || []), item]); details.set(key, { title, description, code });
    });
    const result = [...byKey.entries()].map(([key, grouped]) => ({ key, ...details.get(key)!, items: [...grouped].sort(compareTranslationItems), total: grouped.length, completed: grouped.filter(item => item.status === 'completed').length, stale: grouped.filter(item => item.status === 'stale').length, missing: grouped.filter(item => item.status === 'missing').length })).filter(group => group.items.length);
    if (activeTab === 'page' && !result.some(group => group.key === 'site-settings')) result.push({ key: 'site-settings', title: '站点设置', description: '站点搜索引擎标题、描述和关键词。', items: [], total: 0, completed: 0, stale: 0, missing: 0 });
    const order = (group: ItemGroup) => group.key === 'site-settings' ? Number.MAX_SAFE_INTEGER : group.key === 'editor:siteInfo' ? Number.MAX_SAFE_INTEGER - 1 : Math.min(...group.items.map(item => Number(item.meta?.order ?? 0)));
    const productOrder = (group: ItemGroup) => group.key.startsWith('category-level-') ? Number(group.key.slice('category-level-'.length)) : 100;
    return result.sort((a, b) => activeTab === 'page' ? order(a) - order(b) || a.key.localeCompare(b.key, 'zh-CN') : activeTab === 'product' ? productOrder(a) - productOrder(b) || a.title.localeCompare(b.title, 'zh-CN') || a.key.localeCompare(b.key, 'zh-CN') : a.title.localeCompare(b.title, 'zh-CN') || a.key.localeCompare(b.key, 'zh-CN'));
  }, [activeTab, items]);
  const visibleGroups = groups;
  const toggleGroup = (key: string) => setCollapsedGroups(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  useEffect(() => { setActiveGroup(visibleGroups[0]?.key || ''); }, [activeTab, productPagination.current, visibleGroups[0]?.key]);
  const locateGroup = (key: string) => { setActiveGroup(key); document.getElementById(`translation-group-${encodeURIComponent(key)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return <PageContent><PageHeader title="多语言内容" description="按使用场景维护独立站译文，中文主数据保持不变" action={<div className="flex flex-wrap gap-2"><Button icon={<Download size={15}/>} disabled={!languages.length} onClick={download}>导出 Excel</Button><Upload accept=".xlsx" showUploadList={false} beforeUpload={upload} disabled={!editable || !languages.length || previewing}><Button loading={previewing} icon={<UploadIcon size={15}/>}>导入 Excel</Button></Upload><Button type="primary" icon={<Save size={15}/>} disabled={!editable || !dirty.length} onClick={save}>保存{dirty.length ? ` (${dirty.length})` : ''}</Button></div>}/>
    {settingsLoading ? <section data-testid="translations-settings-loading" className="min-h-80 rounded-2xl border border-border bg-card p-6"><Skeleton active title={{ width: '28%' }} paragraph={{ rows: 7 }}/></section> : !languages.length ? <section data-testid="translations-empty-languages" style={{ minHeight: 384 }} className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center"><Languages className="mb-3 text-muted-foreground"/><h2 className="font-semibold">尚未启用非中文语言</h2><p className="mt-2 text-sm text-muted-foreground">请先在站点设置中添加支持语言。</p></section> : <><section className="mb-5 grid gap-5 rounded-2xl border border-border bg-card p-5 lg:grid-cols-[minmax(260px,0.65fr)_1.35fr]"><div><div className="mb-2 text-xs font-semibold text-muted-foreground">目标语言</div><Select showSearch optionFilterProp="label" variant="filled" className="w-full" value={locale} onChange={value => { productPagination.reset(); setDrafts({}); setLoadedItems({}); setLocale(value); }} options={localeOptions}/></div><div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-muted-foreground">整体翻译完成度</span><span>{selectedSummary?.completed || 0} / {selectedSummary?.total || 0}</span></div><Progress percent={selectedSummary?.percent || 0}/><div className="mt-1 flex gap-4 text-xs text-muted-foreground"><span>未翻译 {selectedSummary?.missing || 0}</span><span>已过期 {selectedSummary?.stale || 0}</span></div></div></section>
      <section className="rounded-2xl border border-border bg-card"><div style={{ padding: '6px 16px 0' }}><Tabs className="translation-tabs" tabBarStyle={{ marginBottom: 0 }} activeKey={activeTab} onChange={value => { setLoading(true); productPagination.reset(); setActiveTab(value as ContentTab); }} items={(Object.entries(tabMeta) as Array<[ContentTab, typeof tabMeta[ContentTab]]>).map(([key, meta]) => ({ key, label: <span className="inline-flex items-center gap-2">{meta.icon}{meta.label}</span> }))}/></div><div className="flex flex-wrap items-center gap-2 border-y border-border px-4 py-3"><Input value={keywordInput} onChange={event => setKeywordInput(event.target.value)} allowClear prefix={<Search size={15} className="text-muted-foreground"/>} placeholder="搜索中文原文、译文、业务对象或稳定键" style={{ width: 360 }} className="max-w-full"/><Select style={{ width: 144 }} value={status} onChange={value => { productPagination.reset(); setStatus(value); }} options={[{ value: '', label: '全部状态' }, ...Object.entries(statusMeta).map(([value, item]) => ({ value, label: item.label }))]}/>{(keywordInput || status) && <Button type="link" onClick={() => { productPagination.reset(); setKeywordInput(''); setKeyword(''); setStatus(''); }}>重置</Button>}<span className="ml-auto text-xs text-muted-foreground">共 {fieldTotal} 个翻译字段</span></div>
        <div className="grid items-start gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="sticky top-4 z-10 hidden max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-sm lg:block"><div className="px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground">快速定位</div><nav className="space-y-1">{visibleGroups.map(group => { const incomplete = group.missing + group.stale; const selected = activeGroup === group.key; return <button type="button" key={group.key} onClick={() => locateGroup(group.key)} className={`relative flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${selected ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-secondary/70'}`}><span className="truncate">{group.title}</span><span className={`shrink-0 text-xs ${selected ? 'text-primary' : 'text-muted-foreground'}`}>{incomplete}/{group.total}</span>{selected ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"/> : null}</button>; })}</nav></aside><div className="space-y-3">{loading ? <div data-testid="translations-content-loading"><Skeleton active paragraph={{ rows: 8 }}/></div> : visibleGroups.length ? visibleGroups.map(group => { const collapsed = collapsedGroups.has(group.key); const renderItems = (groupedItems: TranslationItem[]) => groupedItems.length ? <div className="space-y-2">{groupedItems.map(item => <TranslationField key={item.key} item={item} locale={locale} editable={editable} value={drafts[item.key] || ''} onChange={value => setDrafts(current => ({ ...current, [item.key]: value }))}/>)}</div> : <Empty className="py-5" image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据"/>; return <article id={`translation-group-${encodeURIComponent(group.key)}`} key={group.key} className="scroll-mt-4 rounded-2xl border border-border bg-white p-4 shadow-sm"><button type="button" aria-expanded={!collapsed} onClick={() => { setActiveGroup(group.key); toggleGroup(group.key); }} className={`flex w-full flex-wrap items-start justify-between gap-2 text-left ${collapsed ? '' : 'mb-3 border-b border-border/70 pb-3'}`}><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><h2 className="font-semibold text-foreground">{group.title}</h2>{group.code ? <span className="truncate font-mono text-xs text-muted-foreground">({group.code})</span> : null}</div>{group.description ? <p className="mt-1 text-xs text-muted-foreground">{group.description}</p> : null}</div><span className="flex items-center gap-2"><Tag>{group.total} 个字段</Tag><ChevronDown size={17} className={`text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`}/></span></button>{!collapsed ? renderItems(group.key === 'site-settings' ? group.items.sort((a, b) => siteSettingOrder(a) - siteSettingOrder(b)) : group.items) : null}</article>; }) : <Empty className="py-12" image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据"/>}</div></div>
        {productPagination.total > productPagination.pageSize ? <div className="product-grid-pagination flex items-center justify-end border-t border-border px-4 py-3.5"><Pagination {...productPagination.config}/></div> : null}
      </section></>}
    <AppModal open={Boolean(importPreview)} width={920} title="多语言 Excel 导入预检" description="仅“可导入”的译文会写入；空白、过期和异常行会安全跳过。" okText="确认导入" cancelText="取消" confirmLoading={committing} okButtonProps={{ disabled: !importPreview?.summary.ready }} onOk={() => void commitImport()} onCancel={() => setImportPreview(null)} footerLeft={<Button icon={<Download size={14}/>} onClick={() => void downloadImportReport()}>下载预检结果</Button>}>
      {importPreview ? <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {[['可导入', importPreview.summary.ready, 'text-emerald-600'], ['无变化', importPreview.summary.unchanged, 'text-slate-600'], ['空白跳过', importPreview.summary.blank, 'text-slate-600'], ['中文变化', importPreview.summary.sourceChanged, 'text-amber-600'], ['已删除/归档', importPreview.summary.removed, 'text-amber-600'], ['重复行', importPreview.summary.duplicate, 'text-red-600'], ['格式错误', importPreview.summary.invalid, 'text-red-600'], ['导出后新增', importPreview.summary.addedSinceExport, 'text-blue-600']] .map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-border bg-secondary/20 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div></div>)}
        </div>
        <Table<TranslationImportPreviewRow> size="small" rowKey={row => `${row.row}-${row.unitId}`} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 760 }} dataSource={importPreview.rows} columns={[
          { title: '行号', dataIndex: 'row', width: 70 },
          { title: '稳定键', dataIndex: 'key', ellipsis: true, width: 260, render: value => value || '-' },
          { title: '中文原文', dataIndex: 'sourceText', ellipsis: true, width: 190, render: value => value || '-' },
          { title: '结果', dataIndex: 'status', width: 120, render: (value: TranslationImportRowStatus) => <Tag color={importStatusMeta[value].color}>{importStatusMeta[value].label}</Tag> },
          { title: '说明', dataIndex: 'reason', ellipsis: true, width: 190 },
        ]}/>
      </div> : null}
    </AppModal>
  </PageContent>;
};

export default TranslationsPage;
