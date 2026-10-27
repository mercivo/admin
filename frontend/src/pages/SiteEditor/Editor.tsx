import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, ColorPicker, ConfigProvider, Empty, Input, Pagination, Segmented, Select, Slider, Tooltip, Tree, Upload } from 'antd';
import { closestCenter, DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowRight, Award, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, ContactRound, Eye, EyeOff, FileText, Globe, GripVertical, Heart, Image, Layers, LayoutPanelLeft, List as ListIcon, Menu, MessageCircle, MessageSquare, Monitor, MousePointer2, Package, Palette, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Phone, Plus, RotateCcw, RotateCw, Save, Search, Settings2, Smartphone, Sparkles, Star, Trash2, Type, X, Zap } from 'lucide-react';
import Toast, { ToastType } from '../../components/shared/Toast';
import { productApi, siteApi, storefrontManageApi, translationApi, workspaceApi } from '../../services/api/index';
import type { ManagedSite, TranslationMessages, WorkspaceSettings } from '../../services/api/index';
import type { Product, ProductCategory } from '../../types';
import { currentPermissions } from '../../utils/permissions';
import { openPublishedStorefront } from '../../utils/storefront';
import { EditorModal, EditorSwitch, SiteEditorDesignProvider } from './controls';
import SiteRenderer, { SiteContactModal } from './SiteRenderer';
import { AdminLoadError, AdminModuleSkeleton, AppModal, ModalFormField, ProductImage } from '../../components/shared';
import { DEFAULT_CURRENCY_CONFIG, DEFAULT_SYSTEM_CONFIG, type CurrencyConfig, type SystemConfig } from '../../config/sales';
import { DEFAULT_ANTD_LOCALE, normalizeAntdLocale } from '../../config/antdLocales';
import { antdLocaleFor } from '../../config/antdLocaleRuntime';
import { languageDisplayName } from '../../utils/languageDisplayName';
import { applyEditorTranslations, buildTranslationDescriptors, COMPONENT_DEFINITIONS, createSection, defaultConfig, defaultHeroTrustItems, isFixedSection, newId, normalizeEditorConfig, requiredInquiryFields, resolveSectionBackground, type EditorConfig, type FormField, type InspectorTab, type NavItem, type Section, type SectionType, type SiteInfo, type SocialLink } from './schema';

const META: Record<SectionType, { label: string; icon: React.ElementType }> = {
  header: { label: '页头导航', icon: Layers }, hero: { label: '首屏横幅', icon: Image }, text: { label: '文本内容', icon: Type },
  products: { label: '产品列表', icon: Layers }, form: { label: '询盘表单', icon: FileText }, contactModal: { label: '联系我们', icon: ContactRound }, footer: { label: '页脚', icon: Layers },
};
const COMPONENT_DESCRIPTIONS = Object.fromEntries(Object.entries(COMPONENT_DEFINITIONS).map(([type, definition]) => [type, definition.description])) as Record<SectionType, string>;
const SECTION_BACKGROUND_RECOMMENDATIONS: Record<SectionType, string> = { header: '1600 × 160 px', hero: '1600 × 900 px', text: '1600 × 700 px', products: '1600 × 1000 px', form: '1600 × 800 px', contactModal: '1200 × 800 px', footer: '1600 × 500 px' };
const productSummary = (value?: string) => {
  if (!value) return '-';
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent?.replace(/\s+/g, ' ').trim() || '-';
};
const validateEditorImage = (file: File, maxMb = 5) => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > maxMb * 1024 * 1024) throw new Error(`请上传 ${maxMb}MB 以内的 PNG、JPG 或 WebP 图片`);
};
const uploadEditorImage = async (file: File, maxMb = 5) => {
  validateEditorImage(file, maxMb);
  return (await productApi.uploadImage(file)).url;
};
const EVENT_SELECT_PROPS = { placement: 'bottomLeft' as const, popupClassName: 'site-editor-event-select-popup', getPopupContainer: () => document.body };
const contrastColor = (hex: string) => { const normalized = hex.replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff'; const [r, g, b] = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b > .42 ? '#17231f' : '#ffffff'; };
const colorWithOpacity = (hex: string, opacity = 100) => { const normalized = hex.replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex; const rgb = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16)).join(','); return `rgba(${rgb},${Math.min(100, Math.max(0, opacity)) / 100})`; };
const loadStorefrontProductPool = async () => {
  const first = await storefrontManageApi.products({ page: 1, pageSize: 50 });
  const pageCount = Math.ceil(first.total / first.pageSize);
  if (pageCount <= 1) return first;
  const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => storefrontManageApi.products({ page: index + 2, pageSize: 50 })));
  return { ...first, items: [first.items, ...remaining.map(page => page.items)].flat() };
};
const Editor: React.FC = () => {
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>(currentPermissions);
  const canEdit = effectivePermissions.includes('site.edit');
  const canPublish = effectivePermissions.includes('site.publish');
  const [config, setConfig] = useState<EditorConfig>(defaultConfig());
  const [activePage, setActivePage] = useState('home');
  const [selectedId, setSelectedId] = useState('');
  const [selectedGlobal, setSelectedGlobal] = useState<'contact' | 'theme' | null>(null);
  const [leftTab, setLeftTab] = useState<'components' | 'layers'>('layers');
  const [rightTab, setRightTab] = useState<InspectorTab>('content');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(100);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [site, setSite] = useState<ManagedSite | null>(null);
  const [siteDescription, setSiteDescription] = useState('外贸 ERP 与独立站平台');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [workspaceSite, setWorkspaceSite] = useState<WorkspaceSettings['site'] | null>(null);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [history, setHistory] = useState<EditorConfig[]>([]);
  const [future, setFuture] = useState<EditorConfig[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activeDragId, setActiveDragId] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [releaseNote, setReleaseNote] = useState('');
  const [contactPreviewOpen, setContactPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [language, setLanguage] = useState({ defaultLanguage: DEFAULT_ANTD_LOCALE, supportedLanguages: [DEFAULT_ANTD_LOCALE] });
  const [previewLanguage, setPreviewLanguage] = useState(DEFAULT_ANTD_LOCALE);
  const [translationMessages, setTranslationMessages] = useState<TranslationMessages>({ sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } });
  const initialLoad = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const sections = config.pages[activePage]?.sections || [];
  const selected = sections.find(s => s.id === selectedId) || null;
  const sortableSectionIds = useMemo(() => sections.filter(section => !isFixedSection(section.type) && section.type !== 'contactModal').map(section => section.id), [sections]);
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { if (selectedId) { setRightTab('content'); setSelectedGlobal(null); } }, [selectedId]);

  const loadEditor = useCallback(() => {
    setLoadState('loading');
    Promise.all([workspaceApi.getConfig<Record<string, unknown>>('siteEditor').catch(() => defaultConfig() as unknown as Record<string, unknown>), loadStorefrontProductPool().catch(() => ({ items: [] as Product[], categories: [] as ProductCategory[] })), siteApi.list(), workspaceApi.getSettings(), workspaceApi.getConfig<Partial<CurrencyConfig>>('currency').catch(() => DEFAULT_CURRENCY_CONFIG), workspaceApi.getConfig<Partial<SystemConfig>>('system').catch(() => DEFAULT_SYSTEM_CONFIG), translationApi.messages().catch(() => ({ sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } }))]).then(([raw, productPool, ss, workspace, currencies, system, i18n]) => {
      const next = normalizeEditorConfig(raw); const currentId = JSON.parse(localStorage.getItem('mercivo_user') || '{}').siteId; const current = ss.find(s => s.id === currentId) || ss[0] || null;
      setEffectivePermissions(currentPermissions());
      setSiteDescription(workspace.site.description || '外贸 ERP 与独立站平台');
      setBrandLogoUrl(workspace.site.logoUrl || '');
      setWorkspaceSite(workspace.site);
      setCurrencyConfig({ ...DEFAULT_CURRENCY_CONFIG, ...currencies, currencies: currencies.currencies?.length ? currencies.currencies : DEFAULT_CURRENCY_CONFIG.currencies });
      setSystemConfig({ inventoryWarning: { ...DEFAULT_SYSTEM_CONFIG.inventoryWarning, ...system.inventoryWarning }, storefront: { ...DEFAULT_SYSTEM_CONFIG.storefront, ...system.storefront } });
      setTranslationMessages(i18n?.messages ? i18n : { sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } });
      setConfig(next); setActivePage(next.page || 'home'); setProducts(productPool.items); setProductCategories(productPool.categories); setSite(current); setSelectedId(next.pages[next.page || 'home']?.sections[0]?.id || '');
      if (current) { const defaultLanguage = normalizeAntdLocale(current.defaultLanguage); const supported = [...new Set((current.supportedLanguages || [defaultLanguage]).map(normalizeAntdLocale))]; const supportedLanguages = supported.includes(defaultLanguage) ? supported : [defaultLanguage, ...supported]; setLanguage({ defaultLanguage, supportedLanguages }); setPreviewLanguage(defaultLanguage); }
      initialLoad.current = false;
      setLoadState('ready');
    }).catch(() => { setLoadState('error'); setToast({ message: '站点配置加载失败', type: 'error' }); });
  }, []);
  useEffect(() => { loadEditor(); }, [loadEditor]);
  useEffect(() => {
    const syncWorkspaceLogo = () => { void workspaceApi.getSettings().then(workspace => { setWorkspaceSite(workspace.site); setBrandLogoUrl(workspace.site.logoUrl || ''); }); };
    window.addEventListener('focus', syncWorkspaceLogo);
    return () => window.removeEventListener('focus', syncWorkspaceLogo);
  }, []);
  useEffect(() => { const before = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before); }, [dirty]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => setCanvasHeight(canvas.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [view, sections]);
  const notify = (message: string, type: ToastType) => setToast({ message, type });
  const commit = (next: EditorConfig) => { const normalized = { ...next, translationDescriptors: buildTranslationDescriptors(next) }; setHistory(h => [...h.slice(-39), config]); setFuture([]); setConfig(normalized); if (!initialLoad.current) setDirty(true); };
  const updateContactModal = (patch: Partial<SiteInfo>) => {
    const siteInfo = { ...config.siteInfo, ...patch, contactLabels: { ...config.siteInfo.contactLabels, ...(patch.contactLabels || {}) }, contactDetails: { ...config.siteInfo.contactDetails, ...(patch.contactDetails || {}) }, contactItems: patch.contactItems || config.siteInfo.contactItems };
    commit({ ...config, siteInfo, pages: Object.fromEntries(Object.entries(config.pages).map(([key, page]) => [key, { ...page, sections: page.sections.map(section => section.type === 'contactModal' ? { ...section, title: siteInfo.contactModalTitle, subtitle: siteInfo.contactModalSubtitle } : section) }])) });
  };
  const updateSection = (patch: Partial<Section>) => commit({ ...config, pages: { ...config.pages, [activePage]: { ...config.pages[activePage], sections: sections.map(s => s.id === selectedId ? { ...s, ...patch } : s) } } });
  const selectGlobal = (target: 'contact' | 'theme') => { setSelectedGlobal(target); setSelectedId(''); setRightTab(target === 'theme' ? 'style' : 'content'); setRightCollapsed(false); };
  const selectSection = (id: string) => { setSelectedGlobal(null); setSelectedId(id); };
  const updateBrandLogo = async (logoUrl: string) => {
    if (!workspaceSite) return;
    const nextSite = { ...workspaceSite, logoUrl };
    setWorkspaceSite(nextSite); setBrandLogoUrl(logoUrl);
    try { await workspaceApi.updateSiteInfo({ name: nextSite.name, description: nextSite.description, logoUrl }); notify('品牌 Logo 已同步到站点设置', 'success'); }
    catch { notify('品牌 Logo 同步失败', 'error'); }
  };
  const addSection = (type: SectionType) => { if (isFixedSection(type)) return; const item = createSection(type); const footerIndex = sections.findIndex(section => section.type === 'footer'); const next = [...sections]; next.splice(footerIndex < 0 ? next.length : footerIndex, 0, item); commit({ ...config, pages: { ...config.pages, [activePage]: { ...config.pages[activePage], sections: next } } }); setSelectedId(item.id); setLeftTab('layers'); };
  const removeSection = (id: string) => { if (isFixedSection(sections.find(s => s.id === id)?.type || 'text')) return; const next = sections.filter(s => s.id !== id); commit({ ...config, pages: { ...config.pages, [activePage]: { ...config.pages[activePage], sections: next } } }); setSelectedId(next[0]?.id || ''); };
  const move = (id: string, delta: number) => { const i = sections.findIndex(s => s.id === id); const j = i + delta; if (i < 1 || j < 1 || j >= sections.length - 1) return; const next = [...sections];[next[i], next[j]] = [next[j], next[i]]; commit({ ...config, pages: { ...config.pages, [activePage]: { ...config.pages[activePage], sections: next } } }); };
  const startSectionDrag = ({ active }: DragStartEvent) => { setActiveDragId(String(active.id)); setSelectedId(String(active.id)); };
  const finishSectionDrag = ({ active, over }: DragEndEvent) => {
    setActiveDragId('');
    if (!over || active.id === over.id) return;
    const from = sections.findIndex(section => section.id === active.id);
    const to = sections.findIndex(section => section.id === over.id);
    if (from < 0 || to < 0 || isFixedSection(sections[from].type) || isFixedSection(sections[to].type)) return;
    const next = arrayMove(sections, from, to);
    commit({ ...config, pages: { ...config.pages, [activePage]: { ...config.pages[activePage], sections: next } } });
    setSelectedId(String(active.id));
  };
  const undo = () => { const prev = history[history.length - 1]; if (!prev) return; setFuture(f => [config, ...f]); setHistory(h => h.slice(0, -1)); setConfig(prev); setDirty(true); };
  const redo = () => { const next = future[0]; if (!next) return; setHistory(h => [...h, config]); setFuture(f => f.slice(1)); setConfig(next); setDirty(true); };
  const save = async () => { try { const value = { ...config, page: activePage, status: 'draft' as const }; await workspaceApi.updateConfig('siteEditor', value); setConfig(value); setDirty(false); setHistory([]); setFuture([]); notify('草稿已保存', 'success'); } catch { notify('草稿保存失败', 'error'); } };
  const preview = async () => {
    try {
      if (dirty && canEdit) {
        const value = { ...config, page: activePage, status: 'draft' as const };
        await workspaceApi.updateConfig('siteEditor', value);
        setConfig(value); setDirty(false); setHistory([]); setFuture([]);
      }
      window.open('/site-preview', '_blank', 'noopener,noreferrer');
    } catch { notify('草稿保存失败，无法打开预览', 'error'); }
  };
  const publish = async () => { const note = releaseNote.trim(); if (!note) return notify('请填写发版备注', 'error'); try { if (!site) throw Error(); if (canEdit) await save(); const version = await siteApi.publish(site.id, note); setConfig(v => ({ ...v, status: 'published', version: version.version })); setSite(current => current ? { ...current, status: 'published', publishedVersionId: version.id } : current); setPublishOpen(false); setReleaseNote(''); notify(`版本 v${version.version} 已发布`, 'success'); } catch { notify('发布失败', 'error'); } };

  const rendered = useMemo(() => sections.filter(s => s.visible && s.type !== 'contactModal'), [sections]);
  const sourcePreview = previewLanguage === translationMessages.sourceLocale;
  const rendererMessages = sourcePreview ? {} : translationMessages.messages[previewLanguage] || {};
  const rendererConfig = useMemo(() => applyEditorTranslations({ ...config, page: activePage }, rendererMessages), [activePage, config, rendererMessages]);
  const translate = useCallback((key: string, fallback: string) => sourcePreview ? fallback : rendererMessages[key] || translationMessages.messages[translationMessages.sourceLocale]?.[key] || fallback, [rendererMessages, sourcePreview, translationMessages]);
  const canvasWidth = view === 'mobile' ? 390 : 1024;
  const zoomScale = zoom / 100;
  if (loadState === 'loading') return <div data-testid="site-editor-loading" aria-busy="true" className="flex h-full flex-col gap-4 bg-[#f3f4f1] p-4"><AdminModuleSkeleton rows={1} minHeight={72}/><div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_300px] gap-4"><AdminModuleSkeleton rows={10} minHeight={620}/><AdminModuleSkeleton rows={14} minHeight={620}/><AdminModuleSkeleton rows={10} minHeight={620}/></div></div>;
  if (loadState === 'error') return <div className="grid h-full place-items-center bg-[#f3f4f1] p-6"><div className="w-full max-w-2xl"><AdminLoadError title="站点编辑器加载失败" description="站点配置未加载完成，编辑和发布功能已暂停。" onRetry={loadEditor}/>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}</div></div>;
  return <SiteEditorDesignProvider primaryColor={config.themeColor}><div className="site-editor-controls flex h-full flex-col bg-[#f3f4f1]" style={{ '--editor-primary': config.themeColor, '--editor-primary-soft': `${config.themeColor}12`, '--editor-primary-contrast': contrastColor(config.themeColor) } as React.CSSProperties}>
    <header className="editor-topbar flex h-[72px] flex-shrink-0 items-center gap-4 border-b bg-white px-5">
      <div className="editor-brand-mark"><LayoutPanelLeft className="h-5 w-5" /></div>
      <div className="min-w-0"><div className="flex items-center gap-2"><div className="truncate text-sm font-semibold tracking-tight text-slate-900">{site?.name || '站点设计'}</div><span className="editor-version-badge">v{config.version || 1}</span></div><div className="mt-0.5 max-w-72 truncate text-[11px] text-slate-400">{siteDescription}</div></div>
      <div className="editor-toolbar-divider" />
      <div className={`editor-save-state ${dirty ? 'is-dirty' : ''}`}>{dirty ? <Sparkles className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}<span>{dirty ? '有修改待保存' : config.status === 'published' ? '已发布并同步' : '草稿已保存'}</span></div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setLeftCollapsed(v => !v)} className="editor-standalone-icon" title={leftCollapsed ? '展开页面面板' : '收起页面面板'}>{leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
        <button onClick={() => setRightCollapsed(v => !v)} className="editor-standalone-icon" title={rightCollapsed ? '展开属性面板' : '收起属性面板'}>{rightCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}</button>
        <div className="editor-icon-group"><button disabled={!history.length} onClick={undo} title="撤销"><RotateCcw className="h-4 w-4" /></button><button disabled={!future.length} onClick={redo} title="重做"><RotateCw className="h-4 w-4" /></button></div>
        <div className="editor-icon-group"><button onClick={() => setZoom(z => Math.max(50, z - 10))} title="缩小"><ChevronDown className="h-4 w-4" /></button><span className="min-w-12 py-2 text-center text-xs">{zoom}%</span><button onClick={() => setZoom(z => Math.min(150, z + 10))} title="放大"><ChevronUp className="h-4 w-4" /></button></div>
        <div className="editor-icon-group"><button title="桌面视图" onClick={() => setView('desktop')} className={view === 'desktop' ? 'is-active' : ''}><Monitor className="h-4 w-4" /></button><button title="移动视图" onClick={() => setView('mobile')} className={view === 'mobile' ? 'is-active' : ''}><Smartphone className="h-4 w-4" /></button></div>
        <div className="editor-toolbar-actions">
          {canEdit && <Tooltip title="保存草稿" placement="bottom"><span className="editor-toolbar-tooltip-target"><button type="button" aria-label="保存草稿" onClick={save} className="editor-toolbar-action"><Save className="h-4 w-4" /></button></span></Tooltip>}
          <Tooltip title="站点预览" placement="bottom"><span className="editor-toolbar-tooltip-target"><button type="button" aria-label="站点预览" onClick={() => void preview()} className="editor-toolbar-action"><Eye className="h-4 w-4" /></button></span></Tooltip>
          {canPublish && <Tooltip title={site?.status === 'published' ? '查看已发布站点' : '查看已发布站点（站点发布后可用）'} placement="bottom"><span className="editor-toolbar-tooltip-target"><button type="button" aria-label="查看已发布站点" disabled={site?.status !== 'published'} onClick={() => void openPublishedStorefront()} className="editor-toolbar-action"><Globe className="h-4 w-4" /></button></span></Tooltip>}
          {canPublish && <Tooltip title="发布站点" placement="bottom"><span className="editor-toolbar-tooltip-target"><button type="button" aria-label="发布站点" onClick={() => setPublishOpen(true)} className="editor-toolbar-action is-primary"><Zap className="h-4 w-4" /></button></span></Tooltip>}
        </div>
        {!canPublish && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700" title="当前套餐可完整编辑并保存草稿，升级至包含站点发布权限的套餐后即可发布">当前套餐仅支持草稿</span>}
      </div>
    </header>
    <div className="editor-body flex min-h-0 flex-1">
      <aside className={`editor-sidebar editor-left-panel flex flex-shrink-0 flex-col border-r bg-white ${leftCollapsed ? 'is-collapsed' : ''}`}>
        <div className="editor-panel-heading"><div className="editor-panel-title">页面构建</div><span>{sections.filter(s => s.type !== 'contactModal').length} 个区块</span></div>
        <div className="border-b px-3 pb-3"><div className="editor-panel-tabs"><button onClick={() => setLeftTab('layers')} className={leftTab === 'layers' ? 'is-active' : ''}>页面结构</button><button onClick={() => setLeftTab('components')} className={leftTab === 'components' ? 'is-active' : ''}>添加组件</button></div></div>
        <div className="flex-1 overflow-auto p-3">{leftTab === 'components' ? <div className="editor-component-grid">{(Object.keys(META) as SectionType[]).map(type => { const Icon = META[type].icon; const fixed = isFixedSection(type); return <button key={type} disabled={fixed} onClick={() => addSection(type)} className="editor-component-card"><span className="editor-component-icon"><Icon className="h-4 w-4" /></span><span><strong>{META[type].label}</strong><small>{fixed ? '固定区块，不可重复添加' : COMPONENT_DESCRIPTIONS[type]}</small></span>{!fixed && <Plus className="editor-component-add h-3.5 w-3.5" />}</button>; })}</div> : <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragStart={startSectionDrag} onDragCancel={() => setActiveDragId('')} onDragEnd={finishSectionDrag}><div className="editor-layer-list"><div className="editor-layer-tip"><GripVertical className="h-4 w-4" /><span>拖动手柄调整顺序，也可聚焦手柄后使用键盘移动</span></div><SortableContext items={sortableSectionIds} strategy={verticalListSortingStrategy}>{sections.filter(section => section.type !== 'contactModal').map(section => <SortableLayerItem key={section.id} section={section} selected={selectedId === section.id} firstMovable={sortableSectionIds[0] === section.id} lastMovable={sortableSectionIds[sortableSectionIds.length - 1] === section.id} onSelect={() => setSelectedId(section.id)} onToggleVisible={() => commit({ ...config, pages: { ...config.pages, [activePage]: { sections: sections.map(item => item.id === section.id ? { ...item, visible: !item.visible } : item) } } })} onMove={delta => move(section.id, delta)} />)}</SortableContext></div><DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>{activeDragId && <LayerDragOverlay section={sections.find(section => section.id === activeDragId)} />}</DragOverlay></DndContext>}</div>
        <div className="editor-global-settings border-t p-3"><div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground"><Settings2 className="h-3.5 w-3.5" />全站设置</div><button className={selectedGlobal === 'contact' ? 'is-active' : ''} onClick={() => selectGlobal('contact')}><ContactRound className="h-4 w-4" /><span><strong>联系我们</strong><small>联系文案与联系方式</small></span><ChevronRight className="ml-auto h-4 w-4" /></button><button className={selectedGlobal === 'theme' ? 'is-active' : ''} onClick={() => selectGlobal('theme')}><Palette className="h-4 w-4" /><span><strong>品牌主题</strong><small>{config.themeColor}</small></span><span className="ml-auto h-4 w-4 rounded-full border" style={{ background: config.themeColor }} /></button></div>
      </aside>
      <main className="editor-workspace flex min-w-0 flex-1 flex-col overflow-hidden"><div className="editor-canvas-toolbar"><div className="editor-canvas-mode"><span className="editor-live-dot" />{view === 'desktop' ? '桌面画布' : '移动画布'}<small>{canvasWidth}px · {zoom}%</small></div><div className="editor-canvas-help"><MousePointer2 className="h-3.5 w-3.5" />点击画布区块即可编辑</div></div><div className="editor-canvas-scroll flex flex-1 items-start overflow-auto p-8"><div className="editor-canvas-stage" style={{ width: canvasWidth * zoomScale, height: canvasHeight * zoomScale }}><div ref={canvasRef} data-editor-canvas data-device={view} onClickCapture={event => { const button = (event.target as HTMLElement).closest('button'); const sectionElement = (event.target as HTMLElement).closest<HTMLElement>('[data-section-type]'); if (!button || !sectionElement) return; const source = sections.find(item => item.id === sectionElement.dataset.sectionId); if (!source) return; const label = button.textContent?.trim() || ''; const action = label === source.secondaryButtonText || label.includes('获取报价') ? source.secondaryButtonAction : label === source.buttonText || label.includes('联系我们') ? source.buttonAction : undefined; const target = sections.find(item => item.id === action || item.type === action); if (!target) return; event.preventDefault(); event.stopPropagation(); if (target.type === 'contactModal') setContactPreviewOpen(true); else document.getElementById(`editor-section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="overflow-hidden bg-white shadow-2xl" style={{ width: canvasWidth, transform: `scale(${zoomScale})`, transformOrigin: 'top left', '--site-theme': colorWithOpacity(config.themeColor, config.themeOpacity) } as React.CSSProperties}>
        {!!rendered.length && <SiteRenderer config={rendererConfig} products={products} categories={productCategories} currency={currencyConfig.currencies.find(item => item.code === (site?.defaultCurrency || currencyConfig.defaultCurrency))?.symbol || site?.defaultCurrency || currencyConfig.defaultCurrency} brandLogoUrl={brandLogoUrl} supportedLanguages={language.supportedLanguages} language={previewLanguage} onLanguageChange={setPreviewLanguage} device={view} editable selectedId={selectedId} onSelectSection={selectSection} translate={translate} guestAccessEnabled={systemConfig.storefront.guestAccessEnabled} guestPriceMode={systemConfig.storefront.guestPriceMode} />}
        {!rendered.length && <div className="grid h-96 place-items-center text-sm text-muted-foreground">从左侧组件库添加内容区块</div>}
      </div></div></div></main>
      <aside className={`editor-sidebar editor-right-panel flex flex-shrink-0 flex-col overflow-hidden border-l bg-white ${rightCollapsed ? 'is-collapsed' : ''}`}>
        <div className="editor-inspector-heading shrink-0"><div className="editor-inspector-icon">{selected ? React.createElement(META[selected.type].icon, { className: 'h-4 w-4' }) : selectedGlobal === 'contact' ? <ContactRound className="h-4 w-4" /> : selectedGlobal === 'theme' ? <Palette className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="text-sm font-bold">{selected ? META[selected.type].label : selectedGlobal === 'contact' ? '联系我们' : selectedGlobal === 'theme' ? '品牌主题' : '属性配置'}</div></div>{selected && !isFixedSection(selected.type) && <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600" aria-label={`删除${META[selected.type].label}`} title="删除组件" onClick={() => removeSection(selected.id)}><Trash2 className="h-4 w-4" /></button>}{selectedGlobal === 'contact' && <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="预览" title="预览" onClick={() => setContactPreviewOpen(true)}><Eye className="h-4 w-4" /></button>}</div>
        {(selected || selectedGlobal) && <div className="editor-right-tabs-wrapper shrink-0 border-b px-3 pb-3"><div className="editor-right-tabs">{([['content', '内容'], ['style', '样式'], ['events', '交互']] as const).map(([key, label]) => <button key={key} className={rightTab === key ? 'is-active' : ''} onClick={() => setRightTab(key)}>{label}</button>)}</div></div>}
        <div className="editor-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">{selected ? <Properties mode={rightTab} section={selected} sections={sections} siteInfo={config.siteInfo} themeColor={config.themeColor} themeOpacity={config.themeOpacity ?? 100} brandLogoUrl={brandLogoUrl} onBrandLogoChange={updateBrandLogo} onChange={updateSection} /> : selectedGlobal === 'contact' ? <ContactSettingsProperties mode={rightTab} value={config.siteInfo} onChange={updateContactModal} /> : selectedGlobal === 'theme' ? <ThemeSettingsProperties mode={rightTab} color={config.themeColor} opacity={config.themeOpacity ?? 100} onChange={patch => commit({ ...config, ...patch })} /> : <div className="editor-inspector-empty"><div><MousePointer2 className="h-5 w-5" /></div><strong>选择一个页面区块</strong><p>点击中间画布或左侧页面结构，即可在这里编辑内容与样式。</p></div>}</div>
      </aside>
    </div>
    {contactPreviewOpen && <SiteContactModal info={config.siteInfo} themeColor={colorWithOpacity(config.themeColor, config.themeOpacity)} onClose={() => setContactPreviewOpen(false)} />}
    <AppModal open={publishOpen} className="site-publish-modal" width={560} title="发布站点" onCancel={() => setPublishOpen(false)} cancelText="取消" okText="确认发布" onOk={() => void publish()} okButtonProps={{ disabled: !releaseNote.trim() }}><div className="space-y-5"><div className="flex gap-3"><AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-500" /><div><div className="font-semibold">发布前将自动保存所有页面</div><p className="mt-1 text-sm text-muted-foreground">发布后会生成新版本并更新访客站点。</p></div></div><Field label="发版备注"><Input.TextArea value={releaseNote} onChange={event => setReleaseNote(event.target.value)} rows={6} maxLength={1000} showCount placeholder="请填写本次发布的主要变更（必填）" /></Field></div></AppModal>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
  </div></SiteEditorDesignProvider>;
};

type SortableLayerItemProps = {
  section: Section;
  selected: boolean;
  firstMovable: boolean;
  lastMovable: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMove: (delta: number) => void;
};

const SortableLayerItem = ({ section, selected, firstMovable, lastMovable, onSelect, onToggleVisible, onMove }: SortableLayerItemProps) => {
  const fixed = isFixedSection(section.type);
  const Icon = META[section.type].icon;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: section.id, disabled: fixed });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} onClick={onSelect} className={`editor-layer-item group ${selected ? 'is-selected' : ''} ${isDragging ? 'is-sorting' : ''} ${isOver && !isDragging ? 'is-sort-over' : ''}`}>
    <button ref={setActivatorNodeRef} type="button" disabled={fixed} title={fixed ? '固定模块不可移动' : '拖动调整顺序'} className={`editor-drag-handle ${fixed ? 'is-disabled' : ''}`} {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
    <span className="editor-layer-icon"><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><strong>{META[section.type].label}</strong><small>{fixed ? '全站固定区块' : section.visible ? '访客可见 · 可拖动排序' : '已隐藏 · 可拖动排序'}</small></span>
    {fixed ? <span className="editor-fixed-badge">固定</span> : <div className="editor-layer-actions"><button title={section.visible ? '隐藏区块' : '显示区块'} onClick={event => { event.stopPropagation(); onToggleVisible(); }}>{section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button><button title="上移" disabled={firstMovable} onClick={event => { event.stopPropagation(); onMove(-1); }}><ChevronUp className="h-3.5 w-3.5" /></button><button title="下移" disabled={lastMovable} onClick={event => { event.stopPropagation(); onMove(1); }}><ChevronDown className="h-3.5 w-3.5" /></button></div>}
  </div>;
};

const LayerDragOverlay = ({ section }: { section?: Section }) => {
  if (!section) return null;
  const Icon = META[section.type].icon;
  return <div className="editor-layer-drag-overlay"><span className="editor-drag-handle"><GripVertical className="h-4 w-4" /></span><span className="editor-layer-icon"><Icon className="h-4 w-4" /></span><span><strong>{META[section.type].label}</strong><small>移动到新的展示位置</small></span></div>;
};

const HeaderCanvas = ({ section, brandLogoUrl, supportedLanguages, currentLanguage, onLanguageChange }: { section: Section; brandLogoUrl: string; supportedLanguages: string[]; currentLanguage: string; onLanguageChange: (code: string) => void }) => {
  const languages = supportedLanguages.length ? supportedLanguages : [DEFAULT_ANTD_LOCALE];
  const [openDropdown, setOpenDropdown] = useState<'language' | 'menu' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const languageOpen = openDropdown === 'language';
  const mobileMenuOpen = openDropdown === 'menu';
  useEffect(() => { if (!languages.includes(currentLanguage)) onLanguageChange(languages[0]); }, [currentLanguage, languages, onLanguageChange]);
  useEffect(() => {
    if (!openDropdown) return;
    const closeOnOutsidePointer = (event: PointerEvent) => { if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpenDropdown(null); };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [openDropdown]);
  const navigateTo = (targetId: string) => { document.getElementById(`editor-section-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setOpenDropdown(null); };
  const selectLanguage = (code: string) => { onLanguageChange(code); setOpenDropdown(null); };
  return <>
    {section.showEyebrow !== false && <div className="editor-header-announcement bg-[var(--site-theme)] px-4 py-2 text-center text-[9px] font-medium uppercase tracking-[.18em] text-white">{section.eyebrow}</div>}
    <div ref={headerRef} className="editor-site-header flex h-16 items-center border-b border-stone-100 bg-white px-8">
      <div className="editor-header-brand">{brandLogoUrl ? <img src={brandLogoUrl} alt={section.title} className="h-9 max-w-36 object-contain" /> : <strong className="text-base font-extrabold tracking-tight text-[var(--site-theme)]">{section.title}</strong>}</div>
      <nav className="editor-header-desktop-nav flex items-center gap-1">{(section.navItems || []).map(item => <button data-site-preview key={item.id} onClick={event => { event.stopPropagation(); navigateTo(item.targetId); }} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-stone-500 transition-colors hover:text-[var(--site-theme)]">{item.label}</button>)}</nav>
      <div className="editor-header-actions ml-auto flex items-center gap-2">
        <button className="editor-header-search rounded-full p-2 text-stone-500"><Search className="h-4 w-4" /></button>
        <div data-editor-interactive className={`editor-language-switcher ${languageOpen ? 'is-open' : ''}`} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
          <button type="button" className="editor-language-trigger" onClick={() => setOpenDropdown(value => value === 'language' ? null : 'language')} aria-expanded={languageOpen}><span className="editor-language-globe"><Globe className="h-3.5 w-3.5" /></span><span><small>Language</small><strong>{languageDisplayName(currentLanguage, currentLanguage)}</strong></span><ChevronDown className="h-3.5 w-3.5" /></button>
          {languageOpen && <div className="editor-language-popover">{languages.map(code => <button key={code} onClick={() => selectLanguage(code)} className={currentLanguage === code ? 'is-active' : ''}><span className="editor-language-code">{code}</span><span><strong>{languageDisplayName(code, currentLanguage)}</strong></span>{currentLanguage === code && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}</div>}
        </div>
        <button data-editor-interactive type="button" className={`editor-mobile-menu-trigger ${mobileMenuOpen ? 'is-open' : ''}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setOpenDropdown(value => value === 'menu' ? null : 'menu'); }} aria-label="打开导航菜单" aria-expanded={mobileMenuOpen}><Menu className="h-5 w-5" /></button>
      </div>
      {mobileMenuOpen && <div data-editor-interactive className="editor-mobile-menu-dropdown" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}><div className="editor-mobile-dropdown-head"><span>页面导航</span><small>{(section.navItems || []).length} 个栏目</small></div><nav>{(section.navItems || []).map((item, index) => <button data-site-preview key={item.id} onClick={() => navigateTo(item.targetId)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong><ChevronRight className="ml-auto h-4 w-4" /></button>)}</nav></div>}
    </div>
  </>;
};

const CanvasSection = ({ section: s, siteInfo, brandLogoUrl, selected, products, productCategories, currency, supportedLanguages, previewLanguage, onPreviewLanguageChange, onSelect }: { section: Section; siteInfo: SiteInfo; brandLogoUrl: string; selected: boolean; products: Product[]; productCategories: ProductCategory[]; currency: string; supportedLanguages: string[]; previewLanguage: string; onPreviewLanguageChange: (code: string) => void; onSelect: () => void }) => <section data-section-type={s.type} data-section-id={s.id} data-custom-background={!!(s.backgroundColor || s.sectionBackgroundImage)} id={`editor-section-${s.id}`} style={resolveSectionBackground(s).style} onClick={event => { if ((event.target as HTMLElement).closest('[data-editor-interactive],button,input,select,textarea,a,summary')) return; onSelect(); }} className={`relative cursor-pointer scroll-m-6 ${selected ? 'is-editor-selected z-10' : 'is-editor-selectable hover:z-10'}`}>
  {selected && <span className="editor-selection-label absolute right-3 top-3 z-20"><Check className="h-3 w-3" />{META[s.type].label}<small>编辑中</small></span>}
  {s.type === 'contactModal' && <div className="bg-stone-100 px-10 py-12"><div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-[var(--site-theme)] px-5 py-4 text-white"><div><h2 className="text-base font-bold text-white">{s.title}</h2><p className="mt-1 text-[9px] text-white/70">{siteInfo.contactDetails.hours}</p></div><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></span></div><div className="space-y-3 p-5"><p className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-[10px] leading-5 text-stone-500">{s.subtitle}</p>{siteInfo.contactDetails.phone && <div className="rounded-xl border p-3 text-[10px]"><strong>电话 / WhatsApp</strong><p className="mt-1 text-stone-500">{siteInfo.contactDetails.phone}</p></div>}{siteInfo.contactDetails.email && <div className="rounded-xl border p-3 text-[10px]"><strong>邮箱</strong><p className="mt-1 text-stone-500">{siteInfo.contactDetails.email}</p></div>}<button className="w-full rounded-xl bg-[var(--site-theme)] py-3 text-[10px] font-bold text-white">发送邮件</button></div></div></div>}
  {s.type === 'header' && <HeaderCanvas section={s} brandLogoUrl={brandLogoUrl} supportedLanguages={supportedLanguages} currentLanguage={previewLanguage} onLanguageChange={onPreviewLanguageChange} />}
  {s.type === 'hero' && <><div className="editor-hero-preview relative min-h-[520px] overflow-hidden bg-[var(--site-theme)] text-white" style={s.sectionBackgroundImage ? { backgroundImage: `linear-gradient(90deg,rgba(8,20,15,.84) 0%,rgba(8,20,15,.58) 44%,rgba(8,20,15,.08) 82%),url(${s.sectionBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="editor-hero-glow" /><div className="relative z-10 flex min-h-[520px] max-w-[660px] flex-col justify-center px-[72px] py-20">{s.showEyebrow !== false && <span className="editor-hero-eyebrow"><span />{s.eyebrow}</span>}<h2 className="mt-6 text-[46px] font-black leading-[1.07] tracking-[-.035em]">{s.title}</h2><p className="mt-5 max-w-[560px] text-sm leading-7 text-white/72">{s.subtitle}</p><div className="mt-9 flex items-center gap-3">{s.showButton !== false && s.buttonText && <button className="editor-hero-primary-button">{s.buttonText}<ArrowRight className="h-4 w-4" /></button>}{s.showSecondaryButton !== false && <button className="editor-hero-secondary-button"><MessageSquare className="h-4 w-4" />{s.secondaryButtonText}</button>}</div></div><div className="editor-hero-scroll-cue"><span />Explore</div></div>{s.showTrustBar !== false && <div className="editor-hero-trust-grid">{(s.trustItems || defaultHeroTrustItems()).map((item, index) => { const IconComponent = [Award, MessageSquare, Package, Star][index % 4]; return <div key={item.id} className="editor-hero-trust-item"><div><IconComponent className="h-4 w-4" /></div><span><strong>{item.title}</strong><small>{item.description}</small></span></div>; })}</div>}</>}
  {s.type === 'text' && <div className="grid grid-cols-2 items-center gap-14 bg-[#f8f6f2] px-14 py-16"><div><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--site-theme)]">{s.showEyebrow !== false && s.eyebrow}</span><h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-.025em] text-[var(--site-theme)]">{s.title}</h2><p className="mt-5 text-xs leading-6 text-stone-600">{s.subtitle}</p>{s.showStats !== false && <div className="mt-7 grid grid-cols-3 gap-4 border-t border-stone-200 pt-6">{(s.stats || []).map(({ id, value: stat, label }) => <div key={id}><div className="text-xl font-black text-[var(--site-theme)]">{stat}</div><div className="mt-1 text-[9px] text-stone-500">{label}</div></div>)}</div>}<div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--site-theme)_15%,transparent)] bg-gradient-to-br from-[var(--site-theme)]/5 to-[color-mix(in_srgb,var(--site-theme)_5%,transparent)] p-5"><div className="text-xs font-bold text-[var(--site-theme)]">{s.promiseTitle}</div><p className="mt-2 text-[10px] leading-5 text-stone-600">{s.promiseText}</p></div></div><div className="relative">{s.backgroundImageUrl ? <img src={s.backgroundImageUrl} alt={s.title} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl" /> : <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-stone-200 text-xs text-stone-400">上传品牌图片</div>}<div className="absolute -bottom-4 -left-4 rounded-2xl bg-[var(--site-theme)] px-5 py-4 text-xs font-bold text-white">{s.qualityBadgeText}</div></div></div>}
  {s.type === 'products' && <ProductCanvas section={s} products={products} categories={productCategories} currency={currency} language={previewLanguage} />}
  {s.type === 'form' && <InquiryCanvas section={s} />}
  {s.type === 'footer' && <footer className="bg-[color-mix(in_srgb,var(--site-theme)_52%,black)] px-10 py-10 text-white"><div className="grid grid-cols-[1.4fr_2fr] items-start gap-10"><div className="max-w-sm"><strong className="text-lg font-extrabold">{s.title}</strong><div className="mt-3 text-[10px] leading-5 text-stone-400">{s.subtitle}</div>{!!s.socialLinks?.some(item => item.label.trim()) && <div className="mt-5 flex flex-wrap gap-2">{s.socialLinks.filter(item => item.label.trim()).map(item => <a data-site-preview key={item.id} href={item.url} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-stone-300">{item.label}</a>)}</div>}</div><FooterPreviewLinks navItems={s.navItems || []} contactItems={s.showContact === false ? [] : siteInfo.contactItems} quickNavigationTitle="快速导航" contactTitle={siteInfo.contactModalTitle || '联系我们'} /></div><div className="mt-8 border-t border-white/10 pt-5 text-[9px] text-stone-500">{s.copyrightText || `© ${new Date().getFullYear()} ${s.title}. All rights reserved.`}</div></footer>}
</section>;

const ProductCanvas = ({ section, products, categories, currency, language }: { section: Section; products: Product[]; categories: ProductCategory[]; currency: string; language: string }) => {
  const [primary, setPrimary] = useState('全部');
  const [secondary, setSecondary] = useState('全部');
  const [badgeFilters, setBadgeFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const enabledCategories = categories.filter(item => item.status === 'enabled').sort((a, b) => a.sort - b.sort);
  const activePrimary = enabledCategories.find(item => item.code === primary);
  const codes = new Set([primary, ...(activePrimary?.children || []).map(item => item.code)]);
  const badgeCode = (product: Product) => product.badge || (product.hot ? 'hot' : '');
  const categoryFiltered = primary === '全部' ? products : secondary === '全部' ? products.filter(product => codes.has(product.category)) : products.filter(product => product.category === secondary);
  const filtered = badgeFilters.length === 0 ? categoryFiltered : categoryFiltered.filter(product => badgeFilters.includes(badgeCode(product)));
  const pagedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [primary, secondary, badgeFilters, pageSize, products]);
  const price = (value: string) => { const range = value.replace(/\s*[\u2013\u2014~～-]\s*/g, '～'); return /^[A-Z]{3}$/.test(currency) ? `${currency} ${range}` : `${currency}${range.replace(/^[¥$€£]/, '')}`; };
  const countFor = (code: string, children: string[] = []) => products.filter(product => [code, ...children].includes(product.category)).length;
  const selectedCategory = secondary !== '全部' ? secondary : primary === '全部' ? 'all' : primary;
  const treeTitle = (label: string, count: number) => <span className="editor-product-tree-title"><span>{label}</span><small>{count}</small></span>;
  const categoryTree = [
    { key: 'all', title: treeTitle('全部商品', products.length) },
    ...enabledCategories.map(item => { const children = item.children.filter(child => child.status === 'enabled').sort((a, b) => a.sort - b.sort); return { key: item.code, title: treeTitle(item.label, countFor(item.code, children.map(child => child.code))), children: children.map(child => ({ key: child.code, title: treeTitle(child.label, countFor(child.code)) })) }; }),
  ];
  const selectCategory = (keys: React.Key[]) => {
    const code = String(keys[0] || 'all');
    if (code === 'all') { setPrimary('全部'); setSecondary('全部'); return; }
    const parent = enabledCategories.find(item => item.code === code);
    if (parent) { setPrimary(parent.code); setSecondary('全部'); return; }
    const owner = enabledCategories.find(item => item.children.some(child => child.code === code));
    if (owner) { setPrimary(owner.code); setSecondary(code); }
  };
  const badgeOptions = [{ code: 'new', label: '新品' }, { code: 'hot', label: '爆品' }, { code: 'bestseller', label: '热销' }, { code: 'recommended', label: '推荐' }];
  const badgeLabel = (product: Product) => ({ new: '新品', hot: '爆品', bestseller: '热销', recommended: '推荐' } as Record<string, string>)[product.badge || ''] || (product.hot ? '爆品' : '');
  return <div className="bg-white px-10 py-12 font-sans">
    <div className="mb-10 flex items-end justify-between gap-8"><div>{section.showEyebrow !== false && <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--site-theme)]">{section.eyebrow}</span>}<h2 className="mt-2 text-[26px] font-extrabold text-[var(--site-theme)]">{section.title}</h2></div><div className="flex max-w-sm flex-col items-end gap-3 text-right"><p data-testid="site-editor-products-subtitle" className="text-[11px] leading-5 text-stone-500">{section.subtitle}</p>{section.showButton !== false && <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--site-theme)]"><MessageSquare className="h-3.5 w-3.5" />{section.buttonText}</button>}</div></div>
    <div className="editor-product-layout flex gap-7">
      {section.showCategories !== false && enabledCategories.length > 0 && <aside className="editor-product-filter w-56 flex-shrink-0 self-start rounded-xl border border-stone-100 bg-stone-50/70 p-3"><div className="mb-3 flex items-center justify-between px-1"><h3 className="text-[11px] font-bold text-stone-700">类别筛选</h3><span className="text-[9px] text-stone-400">{enabledCategories.length} 个分类</span></div><Tree data-testid="site-editor-category-tree" blockNode defaultExpandAll selectedKeys={[selectedCategory]} treeData={categoryTree} onSelect={selectCategory} /></aside>}
      <div data-testid="site-editor-product-results" className="editor-product-results flex min-h-[620px] min-w-0 flex-1 flex-col">
        <div data-testid="site-editor-badge-filters" className="editor-product-badge-filters">{badgeOptions.map(item => <Checkbox key={item.code} checked={badgeFilters.includes(item.code)} onChange={event => setBadgeFilters(current => event.target.checked ? [...current, item.code] : current.filter(code => code !== item.code))}>{item.label}</Checkbox>)}</div>
        {filtered.length ? <>
          <div className="editor-product-grid grid gap-4" style={{ gridTemplateColumns: `repeat(${section.columns || 3},minmax(0,1fr))` }}>
            {pagedProducts.map(product => { const badge = badgeLabel(product); return <div data-testid="site-editor-product-card" key={product.id} className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-100 bg-white"><div className="site-product-card-image relative aspect-square overflow-hidden"><ProductImage image={product.img} width={500} height={500} alt={product.nameZh || '-'} className="h-full w-full object-cover" />{badge && <span className="absolute left-2 top-2 rounded-full bg-[var(--site-theme)] px-2.5 py-1 text-[10px] font-bold text-white">{badge}</span>}<span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] text-stone-500"><Heart className="h-3.5 w-3.5" />{product.likeCount || 0}</span></div><div className="flex flex-1 flex-col p-4"><h3 data-testid="site-editor-product-name" className="site-editor-product-name text-sm font-semibold">{product.nameZh || '-'}</h3><p data-testid="site-editor-product-summary" className="site-editor-product-summary text-[11px] text-stone-400">{productSummary(product.description)}</p><div className="my-2.5 flex min-h-6 flex-wrap content-start gap-1.5 overflow-hidden">{(product.tags || []).map(tag => <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-[10px] text-stone-500">{tag}</span>)}</div>{(section.showPrice || section.showMoq) && <div className="mt-auto flex flex-col items-start gap-1 border-t border-stone-100 pt-3">{section.showPrice && <p data-testid="site-editor-product-price" className="text-base font-bold leading-5 text-[var(--site-theme)]">{price(product.price)}</p>}{section.showMoq && <p data-testid="site-editor-product-moq" className="text-[10px] leading-4 text-stone-500">最低起订量 {product.moq ?? '-'}</p>}</div>}</div></div>; })}
          </div>
          <ConfigProvider locale={antdLocaleFor(language)}><Pagination data-testid="site-editor-product-pagination" locale={antdLocaleFor(language).Pagination} className="mt-auto flex justify-end pt-6" current={page} pageSize={pageSize} total={filtered.length} showSizeChanger pageSizeOptions={[10, 20, 50]} onChange={(nextPage, nextPageSize) => { setPage(nextPageSize === pageSize ? nextPage : 1); setPageSize(nextPageSize); }} /></ConfigProvider>
        </> : <div data-testid="site-editor-product-empty" className="flex min-h-[620px] flex-1 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-8"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div className="space-y-1"><p className="text-xs font-semibold text-stone-600">当前筛选暂无产品</p><p className="text-[10px] text-stone-400">请选择其他类别或商品标记</p></div>} /></div>}
      </div>
    </div>
  </div>;
};
const InquiryCanvas = ({ section }: { section: Section }) => {
  const fields = (section.formFields || createSection('form').formFields || []).filter(field => field.enabled);
  return <div className="relative overflow-hidden bg-[var(--site-theme)] px-14 py-16" style={section.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(26,61,46,.86),rgba(26,61,46,.86)),url(${section.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="relative mx-auto max-w-3xl text-center text-white">{section.showEyebrow !== false && <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#e8d5a3]">{section.eyebrow}</span>}<h2 className="mt-4 text-3xl font-black tracking-[-.025em]">{section.title}</h2><p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-200">{section.subtitle}</p><div className="mt-9 grid grid-cols-2 gap-3 rounded-2xl bg-white p-6 text-left shadow-2xl">{fields.map(field => <div key={field.key} className={`${field.key === 'requirements' ? 'col-span-2 h-20' : 'h-10'} rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[10px] text-stone-400`}>{field.label}{field.required && <span className="ml-1 text-[var(--site-theme)]">*</span>}</div>)}<button className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--site-theme)] px-5 py-3 text-xs font-bold text-white">{section.buttonText}<ArrowRight className="h-3.5 w-3.5" /></button></div></div></div>;
};

const EmptyInspectorModule = ({ label }: { label: string }) => <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">当前对象暂无可配置{label}</div>;

const ContactSettingsProperties = ({ mode, value, onChange }: { mode: InspectorTab; value: SiteInfo; onChange: (patch: Partial<SiteInfo>) => void }) => <div className={`contact-settings-properties space-y-5 px-4 py-5 configuration-${mode}`}>
  {mode === 'content' ? <><Field label="区块标题"><Input value={value.contactModalTitle} onChange={event => onChange({ contactModalTitle: event.target.value })} /></Field><Field label="说明文字"><Input.TextArea rows={4} value={value.contactModalSubtitle} onChange={event => onChange({ contactModalSubtitle: event.target.value })} /></Field><div className="space-y-2"><div className="flex items-center justify-between"><div className="text-xs font-normal text-muted-foreground">联系信息</div><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">{value.contactItems.length} 项</span><Button type="text" size="small" aria-label="新增联系信息" title="新增联系信息" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange({ contactItems: [...value.contactItems, { id: newId(), label: '', content: '' }] })} /></div></div>{value.contactItems.length ? <div className="space-y-2">{value.contactItems.map((item, index) => <div key={item.id} className="grid grid-cols-[20px_minmax(0,.8fr)_minmax(0,1.2fr)_28px] items-center gap-2"><span className="text-center text-[10px] text-muted-foreground">{index + 1}</span><Input aria-label={`联系信息标签 ${index + 1}`} placeholder="输入标签" value={item.label} onChange={event => onChange({ contactItems: value.contactItems.map(current => current.id === item.id ? { ...current, label: event.target.value } : current) })} /><Input aria-label={`联系信息内容 ${index + 1}`} placeholder="输入内容" value={item.content} onChange={event => onChange({ contactItems: value.contactItems.map(current => current.id === item.id ? { ...current, content: event.target.value } : current) })} /><Button type="text" danger size="small" aria-label={`删除联系信息 ${index + 1}`} title="删除联系信息" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange({ contactItems: value.contactItems.filter(current => current.id !== item.id) })} /></div>)}</div> : <div className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">暂无联系信息</div>}</div></> : <EmptyInspectorModule label={mode === 'style' ? '样式' : '交互事件'} />}
</div>;

const ThemeSettingsProperties = ({ mode, color, opacity, onChange }: { mode: InspectorTab; color: string; opacity: number; onChange: (patch: Pick<EditorConfig, 'themeColor' | 'themeOpacity'>) => void }) => <div className={`space-y-5 p-4 configuration-${mode}`}>
  {mode === 'style' ? <><Field label="主题色号"><div className="section-background-card"><div className="section-background-color"><ColorPicker value={color} onChangeComplete={value => onChange({ themeColor: value.toHexString().toUpperCase(), themeOpacity: opacity })} /><Input value={color} maxLength={7} onChange={event => /^#[0-9A-Fa-f]{0,6}$/.test(event.target.value) && onChange({ themeColor: event.target.value.toUpperCase(), themeOpacity: opacity })} /><Button onClick={() => onChange({ themeColor: '#7C6EF5', themeOpacity: 100 })}>重置</Button></div><div className="section-background-opacity"><span>透明度</span><Slider min={0} max={100} step={1} value={opacity} onChange={themeOpacity => onChange({ themeColor: color, themeOpacity })} /><span>{opacity}%</span></div></div></Field><Field label="主题推荐色"><div className="flex gap-2">{['#7C6EF5', '#1F6B5C', '#173F5F', '#9A6B3D', '#6B6258'].map(value => <Button key={value} onClick={() => onChange({ themeColor: value, themeOpacity: opacity })} aria-label={`使用推荐色 ${value}`} title={value} shape="circle" className={color === value ? 'ring-2 ring-slate-900 ring-offset-2' : ''} style={{ background: value, borderColor: value }} />)}</div></Field></> : <EmptyInspectorModule label={mode === 'content' ? '内容' : '交互事件'} />}
</div>;

const Properties = ({ mode, section: s, sections, siteInfo, themeColor, themeOpacity, brandLogoUrl, onBrandLogoChange, onChange }: { mode: InspectorTab; section: Section; sections: Section[]; siteInfo: SiteInfo; themeColor: string; themeOpacity: number; brandLogoUrl: string; onBrandLogoChange: (logoUrl: string) => Promise<void>; onChange: (p: Partial<Section>) => void }) => <div className={`space-y-5 p-4 configuration-${mode}`}>
  {mode === 'content' && <>
    <Field label="区块标题"><Input value={s.title} onChange={e => onChange({ title: e.target.value })} /></Field>
    {s.type === 'header' && <Field label="眉标文案"><Input value={s.eyebrow} onChange={e => onChange({ eyebrow: e.target.value })} /></Field>}
    {['hero', 'text', 'products', 'form'].includes(s.type) && <Field label="眉标文案"><Input value={s.eyebrow} onChange={e => onChange({ eyebrow: e.target.value })} /></Field>}
    {['hero', 'text', 'products', 'form', 'contactModal', 'footer'].includes(s.type) && <Field label="说明文字"><Input.TextArea rows={3} value={s.subtitle} onChange={e => onChange({ subtitle: e.target.value })} /></Field>}
    {['hero', 'image', 'products', 'form'].includes(s.type) && <Field label="按钮文案"><Input value={s.buttonText} onChange={e => onChange({ buttonText: e.target.value })} /></Field>}
    {s.type === 'hero' && <Field label="次按钮文案"><Input value={s.secondaryButtonText} onChange={e => onChange({ secondaryButtonText: e.target.value })} /></Field>}
    {s.type === 'hero' && s.showTrustBar !== false && <Field label="服务承诺"><div className="space-y-2">{(s.trustItems || defaultHeroTrustItems()).map((item, index, items) => <div key={item.id} className="grid grid-cols-[20px_minmax(0,.8fr)_minmax(0,1.2fr)] items-center gap-2"><span className="text-center text-[10px] text-muted-foreground">{index + 1}</span><Input aria-label={`服务承诺标题 ${index + 1}`} value={item.title} placeholder="标题" onChange={event => onChange({ trustItems: items.map(value => value.id === item.id ? { ...value, title: event.target.value } : value) })} /><Input aria-label={`服务承诺说明 ${index + 1}`} value={item.description} placeholder="说明" onChange={event => onChange({ trustItems: items.map(value => value.id === item.id ? { ...value, description: event.target.value } : value) })} /></div>)}</div></Field>}
    {s.type === 'text' && <>{s.showStats !== false && <Field label="数据指标"><div className="space-y-2">{(s.stats || []).map((stat, index) => <div key={stat.id} className="grid grid-cols-[72px_1fr] gap-2"><Input value={stat.value} placeholder="10+" onChange={e => onChange({ stats: (s.stats || []).map((item, i) => i === index ? { ...item, value: e.target.value } : item) })} /><Input value={stat.label} placeholder="指标说明" onChange={e => onChange({ stats: (s.stats || []).map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} /></div>)}</div></Field>}<Field label="承诺标题"><Input value={s.promiseTitle} onChange={e => onChange({ promiseTitle: e.target.value })} /></Field><Field label="承诺内容"><Input.TextArea rows={3} value={s.promiseText} onChange={e => onChange({ promiseText: e.target.value })} /></Field><Field label="品质保证标识"><Input value={s.qualityBadgeText} placeholder="品质认证" onChange={e => onChange({ qualityBadgeText: e.target.value })} /></Field></>}
    {s.type === 'form' && <FormFieldsConfig fields={s.formFields || []} onChange={formFields => onChange({ formFields })} />}
    {['header', 'footer'].includes(s.type) && <NavConfig mode="content" section={s} sections={sections} onChange={onChange} title={s.type === 'footer' ? '页脚导航' : '导航配置'} />}
    {s.type === 'footer' && <FooterSocialConfig links={s.socialLinks || []} onChange={socialLinks => onChange({ socialLinks })} />}
    {s.type === 'footer' && <Field label="版权信息"><Input aria-label="版权信息" value={s.copyrightText || ''} placeholder={`© ${new Date().getFullYear()} 企业名称. All rights reserved.`} onChange={event => onChange({ copyrightText: event.target.value })} /></Field>}
    {s.type === 'footer' && <div className="rounded-lg border border-dashed bg-secondary/20 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">页脚联系方式同步自“联系我们”配置，当前共 {siteInfo.contactItems.length} 项。</div>}
  </>}
  {mode === 'style' && <>
    {s.type === 'header' && <NavConfig mode="style" section={s} sections={sections} brandLogoUrl={brandLogoUrl} onBrandLogoChange={onBrandLogoChange} onChange={onChange} />}
    {s.type === 'text' && <BrandImage image={s.backgroundImageUrl || ''} onChange={backgroundImageUrl => onChange({ backgroundImageUrl })} />}
    {s.type === 'products' && <Field label="桌面端列数"><Segmented block value={s.columns || 3} onChange={columns => onChange({ columns: Number(columns) })} options={[2, 3, 4].map(value => ({ value, label: `${value} 列` }))} /></Field>}
    <SectionBackground section={s} themeColor={themeColor} themeOpacity={themeOpacity} onChange={onChange} />
    <div className="editor-toggle-list">
      {['header', 'hero', 'text', 'products', 'form'].includes(s.type) && <Toggle label="显示眉标" value={s.showEyebrow !== false} onClick={() => onChange({ showEyebrow: s.showEyebrow === false })} />}
      {s.type === 'hero' && <><Toggle label="显示主按钮" value={s.showButton !== false} onClick={() => onChange({ showButton: s.showButton === false })} /><Toggle label="显示次按钮" value={s.showSecondaryButton !== false} onClick={() => onChange({ showSecondaryButton: s.showSecondaryButton === false })} /><Toggle label="显示服务承诺栏" value={s.showTrustBar !== false} onClick={() => onChange({ showTrustBar: s.showTrustBar === false })} /></>}
      {s.type === 'products' && <Toggle label="显示按钮" value={s.showButton !== false} onClick={() => onChange({ showButton: s.showButton === false })} />}
      {s.type === 'text' && <Toggle label="显示数据指标" value={s.showStats !== false} onClick={() => onChange({ showStats: s.showStats === false })} />}
      {s.type === 'products' && <Toggle label="显示最小起订量" value={!!s.showMoq} onClick={() => onChange({ showMoq: !s.showMoq })} />}
      {s.type === 'footer' && <Toggle label="显示联系方式" value={s.showContact !== false} onClick={() => onChange({ showContact: s.showContact === false })} />}
    </div>
  </>}
  {mode === 'events' && <>{['hero', 'products', 'form'].includes(s.type) ? <ButtonActionConfig section={s} sections={sections} onChange={onChange} /> : ['header', 'footer'].includes(s.type) ? <NavConfig mode="events" section={s} sections={sections} onChange={onChange} showLogo={false} title={s.type === 'footer' ? '页脚导航' : '导航配置'} /> : <EmptyInspectorModule label="交互事件" />}</>}
</div>;

const FooterPreviewLinks = ({ navItems, contactItems, quickNavigationTitle, contactTitle }: { navItems: NavItem[]; contactItems: SiteInfo['contactItems']; quickNavigationTitle: string; contactTitle: string }) => {
  const rowCount = Math.max(navItems.length, contactItems.length);
  return <div className="grid grid-cols-2 content-start gap-x-10 gap-y-2 text-left text-[10px] leading-5 text-stone-400">
    <div className="mb-2 font-bold uppercase tracking-[.14em] text-white">{quickNavigationTitle}</div>
    <div className="mb-2 font-bold uppercase tracking-[.14em] text-white">{contactTitle}</div>
    {Array.from({ length: rowCount }, (_, index) => <React.Fragment key={index}>
      {navItems[index] ? <button data-site-preview onClick={event => { event.stopPropagation(); document.getElementById(`editor-section-${navItems[index].targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="w-full text-left transition-colors hover:text-white">{navItems[index].label}</button> : <span aria-hidden="true" />}
      {contactItems[index] ? <p className="m-0">{contactItems[index].label ? `${contactItems[index].label}：` : ''}{contactItems[index].content || '-'}</p> : <span aria-hidden="true" />}
    </React.Fragment>)}
  </div>;
};

const FooterSocialConfig = ({ links, onChange }: { links: SocialLink[]; onChange: (links: SocialLink[]) => void }) => <div className="space-y-2">
  <div className="flex items-center justify-between"><div className="text-xs font-normal text-muted-foreground">社交媒体</div><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">{links.length} 项</span><Button type="text" size="small" aria-label="新增社交媒体" title="新增社交媒体" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange([...links, { id: newId(), platform: '', label: '', url: '' }])} /></div></div>
  {links.length ? <div className="space-y-2">{links.map((item, index) => <div key={item.id} className="grid grid-cols-[20px_minmax(0,.8fr)_minmax(0,1.2fr)_28px] items-center gap-2"><span className="text-center text-[10px] text-muted-foreground">{index + 1}</span><Input aria-label={`社交媒体名称 ${index + 1}`} value={item.label} onChange={event => onChange(links.map(current => current.id === item.id ? { ...current, label: event.target.value } : current))} /><Input aria-label={`社交媒体链接 ${index + 1}`} placeholder="https://" value={item.url} onChange={event => onChange(links.map(current => current.id === item.id ? { ...current, url: event.target.value } : current))} /><Button type="text" danger size="small" aria-label={`删除社交媒体 ${index + 1}`} title="删除社交媒体" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(links.filter(current => current.id !== item.id))} /></div>)}</div> : <div className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">暂无社交媒体</div>}
</div>;

const eventTargetOptions = (sections: Section[]) => sections
  .filter(item => item.type !== 'header' && item.type !== 'footer')
  .map(item => ({ value: item.id, label: item.type === 'contactModal' ? '打开：联系我们弹窗' : `定位：${META[item.type].label}` }));

const ButtonActionConfig = ({ section, sections, onChange }: { section: Section; sections: Section[]; onChange: (patch: Partial<Section>) => void }) => {
  const options = eventTargetOptions(sections);
  const contactModal = sections.find(item => item.type === 'contactModal');
  const normalizeValue = (value?: string) => value === 'contactModal' ? contactModal?.id : sections.find(item => item.type === value)?.id || value;
  const binding = (kind: 'primary' | 'secondary') => { const primary = kind === 'primary'; const visible = primary ? section.showButton !== false : section.showSecondaryButton !== false; const text = primary ? section.buttonText : section.secondaryButtonText; const action = primary ? section.buttonAction : section.secondaryButtonAction; return visible ? <div className="event-binding" key={kind}><div className="event-binding-head"><span>{primary ? '主按钮' : '次按钮'}</span><small>点击后执行</small></div><div className="event-binding-flow"><div className="event-binding-node"><Field label="触发控件"><Input readOnly value={text} /></Field></div><div className="event-binding-line"><span /><ArrowRight /></div><div className="event-binding-node"><Field label="关联事件">{section.type === 'form' ? <Select disabled className="w-full" value="submit" options={[{ value: 'submit', label: '固定提交询盘' }]} /> : <Select {...EVENT_SELECT_PROPS} allowClear className="w-full" placeholder="选择组件或弹窗" value={normalizeValue(action)} onChange={value => onChange(primary ? { buttonAction: value } : { secondaryButtonAction: value })} options={options} />}</Field></div></div></div> : null; };
  return <div className="space-y-2">{binding('primary')}{section.type === 'hero' && binding('secondary')}</div>;
};

const PictureCardUpload = ({ urls, onChange, maxCount = 1, maxMb = 5, uploadText = '上传图片', compact = false }: { urls: string[]; onChange: (urls: string[]) => void | Promise<void>; maxCount?: number; maxMb?: number; uploadText?: string; compact?: boolean }) => {
  const [uploading, setUploading] = useState(false);
  const urlsRef = useRef(urls);
  useEffect(() => { urlsRef.current = urls; }, [urls]);
  const update = async (next: string[]) => { urlsRef.current = next; await onChange(next); };
  return <Upload
    className={`editor-picture-upload ${compact ? 'is-compact' : ''}`}
    listType="picture-card"
    accept="image/png,image/jpeg,image/webp"
    multiple={maxCount > 1}
    maxCount={maxCount}
    disabled={uploading}
    fileList={urls.map((url, index) => ({ uid: `${index}-${url}`, name: uploadText, status: 'done' as const, url }))}
    beforeUpload={file => { try { validateEditorImage(file, maxMb); return true; } catch (error) { window.alert(error instanceof Error ? error.message : '图片格式不正确'); return Upload.LIST_IGNORE; } }}
    customRequest={async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try { const url = await uploadEditorImage(file as File, maxMb); await update([...urlsRef.current, url].slice(-maxCount)); onSuccess?.({ url }); }
      catch (error) { window.alert(error instanceof Error ? error.message : '图片上传失败，请检查图片存储服务'); onError?.(error as Error); }
      finally { setUploading(false); }
    }}
    onRemove={file => { void update(urlsRef.current.filter((_, index) => `${index}-${urlsRef.current[index]}` !== file.uid)); return true; }}
  >
    {urls.length < maxCount && <div className="flex flex-col items-center gap-1 text-muted-foreground"><Image className="h-5 w-5" /><span className="text-xs">{uploading ? '上传中…' : uploadText}</span><span className="text-[10px]">{maxMb < 1 ? `${Math.round(maxMb * 1000)}KB` : `${maxMb}MB`} 以内</span></div>}
  </Upload>;
};

const BackgroundImage = ({ image, onChange, compact = false, recommendedSize = '1600 × 700 px' }: { image: string; onChange: (image: string) => void; compact?: boolean; recommendedSize?: string }) => {
  const uploader = <PictureCardUpload compact={compact} urls={image ? [image] : []} onChange={urls => onChange(urls[0] || '')} uploadText="上传图片" />;
  return compact ? uploader : <Field label="模块背景图"><div className="rounded-xl border bg-secondary/20 p-3">{uploader}<p className="mt-2 text-[11px] leading-5 text-muted-foreground">推荐 {recommendedSize}，系统会居中裁切并自动添加遮罩以保证文字清晰。</p></div></Field>;
};

const BrandImage = ({ image, onChange }: { image: string; onChange: (image: string) => void }) => <div>
  <div className="mb-2 text-xs font-bold text-muted-foreground">品牌图片</div>
  <div className="editor-media-card">
    <PictureCardUpload urls={image ? [image] : []} onChange={urls => onChange(urls[0] || '')} uploadText="上传品牌图片" />
    <p className="editor-media-guidance">推荐尺寸：1200 × 1500 px（约 4:5）；支持 PNG、JPG、WebP，文件不超过 5MB。</p>
  </div>
</div>;

const SectionBackground = ({ section, themeColor, themeOpacity, onChange }: { section: Section; themeColor: string; themeOpacity: number; onChange: (patch: Partial<Section>) => void }) => {
  const background = resolveSectionBackground(section, themeColor, themeOpacity);
  const commitColor = (backgroundColor: string) => onChange({ backgroundColor, backgroundOpacity: background.opacity });
  const commitOpacity = (backgroundOpacity: number) => onChange({ backgroundColor: background.color, backgroundOpacity });
  const reset = () => onChange({ backgroundColor: undefined, backgroundOpacity: undefined });
  const commitImage = (sectionBackgroundImage: string) => onChange(section.type === 'form' ? { sectionBackgroundImage, backgroundImageUrl: undefined } : { sectionBackgroundImage });
  const usesDefault = background.inheritsTheme || background.usesModuleDefault;
  const guidance = section.type === 'hero' ? `未自定义时颜色和透明度跟随全站主题；背景图片仅覆盖首屏主视觉并保持原始显示，服务承诺区域继续使用主题加深色。推荐尺寸：${SECTION_BACKGROUND_RECOMMENDATIONS[section.type]}。` : section.type === 'header' ? `组件背景仅作用于导航主体，顶部眉标始终跟随全站主题；背景图片保持原始显示并使用固定浅色遮罩。推荐尺寸：${SECTION_BACKGROUND_RECOMMENDATIONS[section.type]}。` : `推荐尺寸：${SECTION_BACKGROUND_RECOMMENDATIONS[section.type]}；背景图片保持原始显示并使用模块固定遮罩，透明度仅作用于背景底色。`;
  return <div><div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground"><span>组件背景</span>{usesDefault && <span className="section-background-inherited">{background.defaultLabel}</span>}</div><div className="section-background-card"><div className="section-background-color"><ColorPicker value={background.color} onChangeComplete={value => commitColor(value.toHexString().toUpperCase())} /><Input value={background.color} placeholder="默认颜色" maxLength={7} onChange={event => /^#[0-9A-Fa-f]{0,6}$/.test(event.target.value) && commitColor(event.target.value.toUpperCase())} /><Button onClick={reset}>重置</Button></div><div className="section-background-opacity"><span>透明度</span><Slider min={0} max={100} step={1} value={background.opacity} onChange={commitOpacity} /><span>{background.opacity}%</span></div><BackgroundImage compact image={background.image} onChange={commitImage} /><p className="editor-media-guidance">{guidance}</p></div></div>;
};

const FormFieldsConfig = ({ fields }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) => {
  const labels: Record<FormField['key'], string> = { name: '联系人', contact: '联系方式', email: '邮箱', company: '公司', phone: '电话', country: '国家/地区', requirements: '采购需求' };
  const normalized = requiredInquiryFields.map(required => fields.find(field => field.key === required.key) || required);
  return <Field label="表单信息"><div className="grid gap-2 text-muted-foreground">{normalized.map(field => <div key={field.key} className={`flex items-center justify-between rounded-lg border bg-secondary/20 px-3 py-2.5 ${field.key === 'requirements' ? 'min-h-14' : ''}`}><span className="text-xs font-medium text-muted-foreground">{labels[field.key]}</span><span className="text-[10px] text-muted-foreground">固定必填</span></div>)}</div></Field>;
};

const NavConfig = ({ mode, section, sections, onChange, brandLogoUrl = '', onBrandLogoChange, showLogo = true, title = '导航配置' }: { mode: 'content' | 'style' | 'events'; section: Section; sections: Section[]; onChange: (patch: Partial<Section>) => void; brandLogoUrl?: string; onBrandLogoChange?: (logoUrl: string) => Promise<void>; showLogo?: boolean; title?: string }) => {
  const [openId, setOpenId] = useState('');
  const items = section.navItems || [];
  const options = eventTargetOptions(sections);
  const updateItem = (id: string, patch: Partial<NavItem>) => onChange({ navItems: items.map(item => item.id === id ? { ...item, ...patch } : item) });
  return <div>
    {mode === 'style' && showLogo && <div className="mb-5"><div className="mb-2 text-xs font-bold text-muted-foreground">品牌 Logo</div>
      <div className="editor-media-card"><PictureCardUpload urls={brandLogoUrl ? [brandLogoUrl] : []} onChange={urls => onBrandLogoChange?.(urls[0] || '')} maxMb={.5} uploadText="上传 Logo" />
        <p className="editor-media-guidance">推荐尺寸：288 × 72 px（约 4:1）；与“站点设置 - 站点信息 - 品牌 Logo”双向同步，支持 PNG、JPG、WebP，文件不超过 500KB。</p>
      </div>
    </div>}
    {mode !== 'style' && <>{mode === 'content' && <div className="mb-2 flex items-center justify-between"><div className="text-xs font-normal text-muted-foreground">{section.type === 'header' ? '导航信息' : title}</div><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">{items.length} 项</span><Button type="text" size="small" aria-label={section.type === 'header' ? '新增导航信息' : '新增页脚导航'} title={section.type === 'header' ? '新增导航信息' : '新增页脚导航'} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange({ navItems: [...items, { id: newId(), label: '', targetId: options[0]?.value || '' }] })} /></div></div>}
      <div className={mode === 'events' ? 'space-y-1.5' : 'space-y-2'}>{items.map((item, index) => mode === 'content' ? <div key={item.id} className="flex items-center gap-2"><span className="w-5 shrink-0 text-center text-[10px] text-muted-foreground">{index + 1}</span><Input value={item.label} aria-label={`导航名称 ${index + 1}`} placeholder="输入导航名称" onChange={event => updateItem(item.id, { label: event.target.value })} /><Button type="text" danger size="small" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange({ navItems: items.filter(value => value.id !== item.id) })} title="删除导航" aria-label={`删除导航 ${index + 1}`} /></div> : <div key={item.id} className="event-binding event-binding-compact"><div className="event-binding-head"><span>导航 {index + 1}</span><small>点击后执行</small></div><div className="event-binding-flow"><div className="event-binding-node"><Field label="触发控件"><Input readOnly value={item.label} /></Field></div><div className="event-binding-line"><span /><ArrowRight /></div><div className="event-binding-node"><Field label="关联事件"><Select {...EVENT_SELECT_PROPS} allowClear value={item.targetId || undefined} open={openId === item.id} onOpenChange={open => setOpenId(open ? item.id : '')} placeholder="选择组件或弹窗" className="w-full" onChange={targetId => { updateItem(item.id, { targetId }); setOpenId(''); }} options={options} /></Field></div></div></div>)}</div>
      {!items.length && <div className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">暂无导航信息</div>}</>}
  </div>;
};
const Field = ({ label, children }: { label: string; children: React.ReactNode; normal?: boolean }) => <ModalFormField label={label}>{children}</ModalFormField>;
const Toggle = ({ label, value, onClick }: { label: string; value: boolean; onClick: () => void }) => <div className="editor-toggle-item"><span>{label}</span><EditorSwitch value={value} onChange={() => onClick()} /></div>;
const Modal = EditorModal;
export default Editor;
