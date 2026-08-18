import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Select } from 'antd';
import { closestCenter, DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowRight, Award, Bot, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, ContactRound, Copy, Eye, EyeOff, FileText, Globe, GripVertical, Heart, Image, Layers, LayoutPanelLeft, List as ListIcon, Menu, MessageCircle, MessageSquare, Monitor, MousePointer2, Package, Palette, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Phone, Plus, RotateCcw, RotateCw, Save, Search, Settings2, Smartphone, Sparkles, Star, Trash2, Type, X, Zap } from 'lucide-react';
import Toast, { ToastType } from '../../components/shared/Toast';
import { agentApi, dictApi, productApi, siteApi, workspaceApi } from '../../services/api/index';
import type { ManagedSite } from '../../services/api/index';
import type { Agent, DictType, Product } from '../../types';
import { currentPermissions } from '../../utils/permissions';
import { EditorModal, EditorSwitch, SiteEditorDesignProvider } from './controls';

type SectionType = 'header' | 'hero' | 'text' | 'image' | 'products' | 'form' | 'contactModal' | 'footer' | 'assistant';
type NavItem = { id: string; label: string; targetId: string };
type FormField = { key: 'name' | 'email' | 'company' | 'phone' | 'country' | 'requirements'; label: string; enabled: boolean; required: boolean };
type SocialLink = { id: string; platform: string; label: string; url: string; visible: boolean };
type ContactDetails = { email: string; phone: string; whatsapp: string; address: string; hours: string };
type SiteInfo = { contactDetails: ContactDetails; socialLinks: SocialLink[]; contactModalTitle: string; contactModalSubtitle: string };
type Section = { id: string; type: SectionType; visible: boolean; title: string; eyebrow?: string; logoUrl?: string; subtitle?: string; buttonText?: string; secondaryButtonText?: string; buttonAction?: string; secondaryButtonAction?: string; showButton?: boolean; imageUrl?: string; imageUrls?: string[]; backgroundImageUrl?: string; backgroundColor?: string; backgroundOpacity?: number; sectionBackgroundImage?: string; count?: number; columns?: number; showPrice?: boolean; showMoq?: boolean; showCategories?: boolean; showEyebrow?: boolean; showSecondaryButton?: boolean; showTrustBar?: boolean; showStats?: boolean; showSocials?: boolean; showContact?: boolean; formFields?: FormField[]; agentId?: string; welcome?: string; quickReplies?: string[]; position?: 'left' | 'right'; links?: string[]; navItems?: NavItem[]; stats?: Array<{ id: string; value: string; label: string }>; socialLinks?: SocialLink[]; contactDetails?: ContactDetails; promiseTitle?: string; promiseText?: string };
type PageConfig = { sections: Section[] };
type EditorConfig = { status: 'draft' | 'published'; version: number; page: string; themeColor: string; siteInfo: SiteInfo; pages: Record<string, PageConfig> };

const META: Record<SectionType, { label: string; icon: React.ElementType }> = {
  header: { label: '页头导航', icon: Layers }, hero: { label: '首屏横幅', icon: Image }, text: { label: '文本内容', icon: Type }, image: { label: '图片区块', icon: Image },
  products: { label: '产品列表', icon: Layers }, form: { label: '询价表单', icon: FileText }, contactModal: { label: '联系我们弹窗', icon: ContactRound }, footer: { label: '页脚', icon: Layers }, assistant: { label: 'AI 助手', icon: Bot },
};
const COMPONENT_DESCRIPTIONS: Record<SectionType, string> = {
  header: '品牌标识与全站导航', hero: '核心卖点与行动入口', text: '品牌故事与数据说明', image: '视觉内容与专题展示',
  products: '商品分类与产品陈列', form: '收集客户采购需求', contactModal: '快捷联系信息弹窗', footer: '导航、联系与版权信息', assistant: '智能接待与快捷问答',
};
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const contrastColor = (hex: string) => { const normalized = hex.replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff'; const [r, g, b] = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b > .42 ? '#17231f' : '#ffffff'; };
const sectionBackgroundStyle = (section: Section): React.CSSProperties | undefined => {
  if (!section.backgroundColor && !section.sectionBackgroundImage) return undefined;
  const opacity = Math.min(100, Math.max(0, section.backgroundOpacity ?? 100)) / 100;
  const hex = (section.backgroundColor || '#FFFFFF').replace('#', '');
  const valid = /^[0-9a-f]{6}$/i.test(hex);
  const rgb = valid ? [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)).join(',') : '255,255,255';
  return { backgroundColor: `rgba(${rgb},${opacity})`, ...(section.sectionBackgroundImage ? { backgroundImage: `linear-gradient(rgba(${rgb},${opacity}),rgba(${rgb},${opacity})),url(${section.sectionBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) };
};
const isFixedSection = (type: SectionType) => type === 'header' || type === 'footer';
const createSection = (type: SectionType): Section => ({
  id: newId(), type, visible: true, title: META[type].label,
  ...(type === 'header' ? { title: '品牌名称', navItems: [] } : {}),
  ...(type === 'hero' ? { eyebrow: 'Premium collection 2026', title: '为您的品牌打造高品质产品', subtitle: '工厂直供 · 品牌定制 · 全球交付', buttonText: '查看产品', secondaryButtonText: '获取报价', buttonAction: 'products', secondaryButtonAction: 'contactModal', showButton: true, showEyebrow: true, showSecondaryButton: true, showTrustBar: true, imageUrls: [] } : {}),
  ...(type === 'text' ? { eyebrow: 'Our story', title: '内容标题', subtitle: '在这里简洁介绍您的企业、服务或产品。', showEyebrow: true, showStats: true, stats: [{ id: newId(), value: '10+', label: '年行业经验' }, { id: newId(), value: '30+', label: '出口国家' }, { id: newId(), value: '500+', label: '全球客户' }], promiseTitle: '我们的承诺', promiseText: '从样品、生产到交付，提供可追溯的专业服务。' } : {}),
  ...(type === 'image' ? { title: '图片展示', buttonText: '了解更多', showButton: true, imageUrl: '' } : {}),
  ...(type === 'products' ? { eyebrow: 'Featured products', title: '精选产品', subtitle: '精选产品与灵活起订量，满足全球品牌的采购需求。', buttonText: '联系我们', buttonAction: 'contactModal', showButton: true, count: 6, columns: 3, showPrice: true, showMoq: true, showCategories: true, showEyebrow: true } : {}),
  ...(type === 'form' ? { eyebrow: 'Start a project', title: '获取专属报价', subtitle: '请填写邮箱和采购需求，外贸团队将尽快联系您。', buttonText: '提交询盘', showButton: true, showEyebrow: true, formFields: [{ key: 'email', label: '邮箱', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }] } : {}),
  ...(type === 'contactModal' ? { title: '联系我们', subtitle: '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。' } : {}),
  ...(type === 'footer' ? { title: '企业名称', subtitle: '为全球客户提供高品质产品与专业采购服务。', links: ['产品', '关于我们', '联系我们', '隐私政策'], showSocials: true, showContact: true, socialLinks: [{ id: newId(), platform: 'facebook', label: 'Facebook', url: '', visible: true }, { id: newId(), platform: 'linkedin', label: 'LinkedIn', url: '', visible: true }, { id: newId(), platform: 'instagram', label: 'Instagram', url: '', visible: true }], contactDetails: { email: 'sales@company.com', phone: '+86 000 0000 0000', whatsapp: '', address: '', hours: 'Mon–Fri, 09:00–18:00' } } : {}),
  ...(type === 'assistant' ? { title: 'AI 助手', welcome: '您好！请问有什么可以帮您？', quickReplies: ['最低起订量是多少？', '获取产品报价'], position: 'right' } : {}),
});
const createPage = (types: SectionType[]): PageConfig => {
  const created = types.map(createSection);
  const sections = [created.find(s => s.type === 'header') || createSection('header'), ...created.filter(s => !isFixedSection(s.type)), created.find(s => s.type === 'footer') || createSection('footer')];
  const header = sections.find(s => s.type === 'header');
  if (header) header.navItems = sections.filter(s => ['products', 'text', 'form'].includes(s.type)).map(s => ({ id: newId(), label: META[s.type].label, targetId: s.id }));
  const footer = sections.find(s => s.type === 'footer');
  if (footer) footer.navItems = sections.filter(s => ['products', 'text', 'form'].includes(s.type)).map(s => ({ id: newId(), label: META[s.type].label, targetId: s.id }));
  return { sections };
};
const defaultSiteInfo = (): SiteInfo => ({ contactModalTitle: '联系我们', contactModalSubtitle: '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。', contactDetails: { email: 'sales@company.com', phone: '+86 000 0000 0000', whatsapp: '', address: '', hours: 'Mon–Fri, 09:00–18:00' }, socialLinks: [{ id: newId(), platform: 'facebook', label: 'Facebook', url: '', visible: true }, { id: newId(), platform: 'linkedin', label: 'LinkedIn', url: '', visible: true }, { id: newId(), platform: 'instagram', label: 'Instagram', url: '', visible: true }] });
const defaultConfig = (): EditorConfig => ({
  status: 'draft', version: 1, page: 'home', themeColor: '#1A3D2E', siteInfo: defaultSiteInfo(), pages: {
    home: createPage(['header', 'hero', 'products', 'text', 'form', 'contactModal', 'footer']),
    products: createPage(['header', 'products', 'footer']),
    about: createPage(['header', 'text', 'footer']),
    contact: createPage(['header', 'form', 'footer']),
  }
});
const normalize = (raw: Record<string, unknown>): EditorConfig => {
  if (!raw.pages) return defaultConfig();
  const value = raw as unknown as EditorConfig;
  value.themeColor ||= '#1A3D2E';
  if (!value.siteInfo) {
    const legacyFooter = Object.values(value.pages).flatMap(page => page.sections).find(section => section.type === 'footer');
    value.siteInfo = { ...defaultSiteInfo(), contactDetails: legacyFooter?.contactDetails || defaultSiteInfo().contactDetails, socialLinks: legacyFooter?.socialLinks || defaultSiteInfo().socialLinks };
  }
  value.siteInfo = { ...defaultSiteInfo(), ...value.siteInfo };
  Object.values(value.pages).forEach(page => {
    page.sections = page.sections.map(section => ({ ...createSection(section.type), ...section, id: section.id }));
    const existingHeader = page.sections.find(s => s.type === 'header') || createSection('header');
    const existingFooter = page.sections.find(s => s.type === 'footer') || createSection('footer');
    existingHeader.visible = true;
    existingFooter.visible = true;
    page.sections = [existingHeader, ...page.sections.filter(s => !isFixedSection(s.type)), existingFooter];
    const header = page.sections.find(s => s.type === 'header');
    if (header && !header.navItems) header.navItems = page.sections.filter(s => ['products', 'text', 'form'].includes(s.type)).map(s => ({ id: newId(), label: META[s.type].label, targetId: s.id }));
    const footer = page.sections.find(s => s.type === 'footer');
    if (footer && !footer.navItems) footer.navItems = page.sections.filter(s => ['products', 'text', 'form'].includes(s.type)).map(s => ({ id: newId(), label: META[s.type].label, targetId: s.id }));
    page.sections.filter(s => s.type === 'hero').forEach(hero => { if (!hero.imageUrls) hero.imageUrls = hero.imageUrl ? [hero.imageUrl] : []; });
  });
  const home = value.pages.home;
  if (home && !home.sections.some(section => section.type === 'contactModal')) {
    const footerIndex = home.sections.findIndex(section => section.type === 'footer');
    home.sections.splice(footerIndex < 0 ? home.sections.length : footerIndex, 0, createSection('contactModal'));
  }
  return value;
};

const Editor: React.FC = () => {
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>(currentPermissions);
  const canPublish = effectivePermissions.includes('site.publish');
  const [config, setConfig] = useState<EditorConfig>(defaultConfig());
  const [activePage, setActivePage] = useState('home');
  const [selectedId, setSelectedId] = useState('');
  const [leftTab, setLeftTab] = useState<'components' | 'layers'>('layers');
  const [rightTab, setRightTab] = useState<'properties' | 'events'>('properties');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(100);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<DictType['children']>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [site, setSite] = useState<ManagedSite | null>(null);
  const [history, setHistory] = useState<EditorConfig[]>([]);
  const [future, setFuture] = useState<EditorConfig[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activeDragId, setActiveDragId] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [siteInfoOpen, setSiteInfoOpen] = useState(false);
  const [contactPreviewOpen, setContactPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [language, setLanguage] = useState({ defaultLanguage: 'zh', supportedLanguages: ['zh'], translationAgentId: '' });
  const initialLoad = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const sections = config.pages[activePage]?.sections || [];
  const selected = sections.find(s => s.id === selectedId) || null;
  const sortableSectionIds = useMemo(() => sections.filter(section => !isFixedSection(section.type) && section.type !== 'contactModal').map(section => section.id), [sections]);
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const translationAgents = agents.filter(a => a.agentType === 'translation' && a.status === 'active');

  useEffect(() => { setRightTab('properties'); }, [selectedId]);

  useEffect(() => {
    Promise.all([workspaceApi.getConfig<Record<string, unknown>>('siteEditor').catch(() => defaultConfig() as unknown as Record<string, unknown>), productApi.list(), agentApi.list(), siteApi.list(), dictApi.getTree().catch(() => [] as DictType[]), workspaceApi.getSettings()]).then(([raw, ps, as, ss, dictionaries, workspace]) => {
      const next = normalize(raw); const currentId = JSON.parse(localStorage.getItem('mercivo_user') || '{}').siteId; const current = ss.find(s => s.id === currentId) || ss[0] || null;
      const categoryDictionary = dictionaries.find(item => item.id === 'category' || item.id === 'product-category');
      const permissions = workspace.billing.permissions || [];
      const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
      localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, permissions }));
      setEffectivePermissions(permissions);
      setConfig(next); setActivePage(next.page || 'home'); setProducts(ps); setProductCategories(categoryDictionary?.children || []); setAgents(as); setSites(ss); setSite(current); setSelectedId(next.pages[next.page || 'home']?.sections[0]?.id || '');
      if (current) { const supported = (current.supportedLanguages || [current.defaultLanguage || 'zh']).filter(code => ['zh', 'en', 'bs'].includes(code)); const defaultLanguage = ['zh', 'en', 'bs'].includes(current.defaultLanguage) ? current.defaultLanguage : 'zh'; setLanguage({ defaultLanguage, supportedLanguages: supported.includes(defaultLanguage) ? supported : [defaultLanguage, ...supported], translationAgentId: current.translationAgentId || '' }); }
      initialLoad.current = false;
    }).catch(() => notify('站点配置加载失败', 'error'));
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
  const commit = (next: EditorConfig) => { setHistory(h => [...h.slice(-39), config]); setFuture([]); setConfig(next); if (!initialLoad.current) setDirty(true); };
  const updateSection = (patch: Partial<Section>) => commit({ ...config, pages: { ...config.pages, [activePage]: { sections: sections.map(s => s.id === selectedId ? { ...s, ...patch } : s) } } });
  const addSection = (type: SectionType) => { if (isFixedSection(type)) return; const item = createSection(type); const footerIndex = sections.findIndex(section => section.type === 'footer'); const next = [...sections]; next.splice(footerIndex < 0 ? next.length : footerIndex, 0, item); commit({ ...config, pages: { ...config.pages, [activePage]: { sections: next } } }); setSelectedId(item.id); setLeftTab('layers'); };
  const removeSection = (id: string) => { if (isFixedSection(sections.find(s => s.id === id)?.type || 'text')) return; const next = sections.filter(s => s.id !== id); commit({ ...config, pages: { ...config.pages, [activePage]: { sections: next } } }); setSelectedId(next[0]?.id || ''); };
  const duplicate = (item: Section) => { if (isFixedSection(item.type)) return; const copy = { ...item, id: newId(), title: `${item.title}副本` }; const i = sections.findIndex(s => s.id === item.id); const next = [...sections]; next.splice(i + 1, 0, copy); commit({ ...config, pages: { ...config.pages, [activePage]: { sections: next } } }); setSelectedId(copy.id); };
  const move = (id: string, delta: number) => { const i = sections.findIndex(s => s.id === id); const j = i + delta; if (i < 1 || j < 1 || j >= sections.length - 1) return; const next = [...sections];[next[i], next[j]] = [next[j], next[i]]; commit({ ...config, pages: { ...config.pages, [activePage]: { sections: next } } }); };
  const startSectionDrag = ({ active }: DragStartEvent) => { setActiveDragId(String(active.id)); setSelectedId(String(active.id)); };
  const finishSectionDrag = ({ active, over }: DragEndEvent) => {
    setActiveDragId('');
    if (!over || active.id === over.id) return;
    const from = sections.findIndex(section => section.id === active.id);
    const to = sections.findIndex(section => section.id === over.id);
    if (from < 0 || to < 0 || isFixedSection(sections[from].type) || isFixedSection(sections[to].type)) return;
    const next = arrayMove(sections, from, to);
    commit({ ...config, pages: { ...config.pages, [activePage]: { sections: next } } });
    setSelectedId(String(active.id));
  };
  const undo = () => { const prev = history[history.length - 1]; if (!prev) return; setFuture(f => [config, ...f]); setHistory(h => h.slice(0, -1)); setConfig(prev); setDirty(true); };
  const redo = () => { const next = future[0]; if (!next) return; setHistory(h => [...h, config]); setFuture(f => f.slice(1)); setConfig(next); setDirty(true); };
  const save = async () => { try { const value = { ...config, page: activePage, status: 'draft' as const }; await workspaceApi.updateConfig('siteEditor', value); setConfig(value); setDirty(false); setHistory([]); setFuture([]); notify('草稿已保存', 'success'); } catch { notify('草稿保存失败', 'error'); } };
  const publish = async () => { try { if (!site) throw Error(); await save(); const version = await siteApi.publish(site.id); setConfig(v => ({ ...v, status: 'published', version: version.version })); setPublishOpen(false); notify(`版本 v${version.version} 已发布`, 'success'); } catch { notify('发布失败', 'error'); } };
  const switchSite = async (id: string) => { if (dirty && !window.confirm('当前修改尚未保存，确认切换站点？')) return; try { const auth = await siteApi.switchSite(id); localStorage.setItem('mercivo_access_token', auth.accessToken); localStorage.setItem('mercivo_user', JSON.stringify(auth.user)); location.reload(); } catch { notify('站点切换失败', 'error'); } };
  const saveLanguage = async () => { if (!site) return; if (!language.supportedLanguages.includes(language.defaultLanguage)) return notify('访客语言必须包含默认语言', 'error'); if (language.supportedLanguages.length > 1 && !language.translationAgentId) return notify('多语言站点必须绑定翻译智能体', 'error'); try { const next = await siteApi.update(site.id, { ...language, translationAgentId: language.translationAgentId || null }); setSite(next); setLanguageOpen(false); notify('多语言配置已保存', 'success'); } catch { notify('多语言配置保存失败', 'error'); } };
  const updateSiteInfo = (siteInfo: SiteInfo) => commit({ ...config, siteInfo, pages: Object.fromEntries(Object.entries(config.pages).map(([key, page]) => [key, { sections: page.sections.map(section => section.type === 'contactModal' ? { ...section, title: siteInfo.contactModalTitle, subtitle: siteInfo.contactModalSubtitle } : section) }])) });

  const rendered = useMemo(() => sections.filter(s => s.visible && s.type !== 'contactModal'), [sections]);
  const canvasWidth = view === 'mobile' ? 390 : 1024;
  const zoomScale = zoom / 100;
  return <SiteEditorDesignProvider primaryColor={config.themeColor}><div className="site-editor-controls flex h-full flex-col bg-[#f3f4f1]" style={{ '--editor-primary': config.themeColor, '--editor-primary-soft': `${config.themeColor}12`, '--editor-primary-contrast': contrastColor(config.themeColor) } as React.CSSProperties}>
    <header className="editor-topbar flex h-[72px] flex-shrink-0 items-center gap-4 border-b bg-white px-5">
      <div className="editor-brand-mark"><LayoutPanelLeft className="h-5 w-5" /></div>
      <div className="min-w-0"><div className="flex items-center gap-2"><div className="text-sm font-semibold tracking-tight text-slate-900">站点设计工作台</div><span className="editor-version-badge">v{config.version}</span></div><div className="mt-0.5 text-[11px] text-slate-400">搭建、预览并发布品牌独立站</div></div>
      <div className="editor-toolbar-divider" />
      {sites.length > 0 && <div className="editor-site-select"><span>当前站点</span><Select value={site?.id} onChange={switchSite} className="w-48" options={sites.map(s => ({ value: s.id, label: s.name }))} /></div>}
      <div className={`editor-save-state ${dirty ? 'is-dirty' : ''}`}>{dirty ? <Sparkles className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}<span>{dirty ? '有修改待保存' : config.status === 'published' ? '已发布并同步' : '草稿已保存'}</span></div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setLeftCollapsed(v => !v)} className="editor-standalone-icon" title={leftCollapsed ? '展开页面面板' : '收起页面面板'}>{leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
        <button onClick={() => setRightCollapsed(v => !v)} className="editor-standalone-icon" title={rightCollapsed ? '展开属性面板' : '收起属性面板'}>{rightCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}</button>
        <div className="editor-icon-group"><button disabled={!history.length} onClick={undo} title="撤销"><RotateCcw className="h-4 w-4" /></button><button disabled={!future.length} onClick={redo} title="重做"><RotateCw className="h-4 w-4" /></button></div>
        <div className="editor-icon-group"><button onClick={() => setZoom(z => Math.max(50, z - 10))} title="缩小"><ChevronDown className="h-4 w-4" /></button><span className="min-w-12 py-2 text-center text-xs">{zoom}%</span><button onClick={() => setZoom(z => Math.min(150, z + 10))} title="放大"><ChevronUp className="h-4 w-4" /></button></div>
        <div className="editor-icon-group"><button title="桌面视图" onClick={() => setView('desktop')} className={view === 'desktop' ? 'is-active' : ''}><Monitor className="h-4 w-4" /></button><button title="移动视图" onClick={() => setView('mobile')} className={view === 'mobile' ? 'is-active' : ''}><Smartphone className="h-4 w-4" /></button></div>
        <button onClick={save} className="editor-toolbar-button"><Save className="h-4 w-4" />保存草稿</button>
        {canPublish && <button onClick={() => setPublishOpen(true)} className="editor-toolbar-button-primary"><Zap className="h-4 w-4" />发布站点</button>}
        {!canPublish && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700" title="当前套餐可完整编辑并保存草稿，升级至包含站点发布权限的套餐后即可发布">当前套餐仅支持草稿</span>}
      </div>
    </header>
    <div className="editor-body flex min-h-0 flex-1">
      <aside className={`editor-sidebar editor-left-panel flex flex-shrink-0 flex-col border-r bg-white ${leftCollapsed ? 'is-collapsed' : ''}`}>
        <div className="editor-panel-heading"><div><div className="editor-panel-kicker">页面构建</div><div className="editor-panel-title">内容结构</div></div><span>{sections.filter(s => s.type !== 'contactModal').length} 个区块</span></div>
        <div className="border-b px-3 pb-3"><div className="editor-panel-tabs"><button onClick={() => setLeftTab('layers')} className={leftTab === 'layers' ? 'is-active' : ''}>页面结构</button><button onClick={() => setLeftTab('components')} className={leftTab === 'components' ? 'is-active' : ''}>添加组件</button></div></div>
        <div className="flex-1 overflow-auto p-3">{leftTab === 'components' ? <div className="editor-component-grid">{(Object.keys(META) as SectionType[]).map(type => { const Icon = META[type].icon; const fixed = isFixedSection(type); return <button key={type} disabled={fixed} onClick={() => addSection(type)} className="editor-component-card"><span className="editor-component-icon"><Icon className="h-4 w-4" /></span><span><strong>{META[type].label}</strong><small>{fixed ? '固定区块，不可重复添加' : COMPONENT_DESCRIPTIONS[type]}</small></span>{!fixed && <Plus className="editor-component-add h-3.5 w-3.5" />}</button>; })}</div> : <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragStart={startSectionDrag} onDragCancel={() => setActiveDragId('')} onDragEnd={finishSectionDrag}><div className="editor-layer-list"><div className="editor-layer-tip"><GripVertical className="h-4 w-4" /><span>拖动手柄调整顺序，也可聚焦手柄后使用键盘移动</span></div><SortableContext items={sortableSectionIds} strategy={verticalListSortingStrategy}>{sections.filter(section => section.type !== 'contactModal').map(section => <SortableLayerItem key={section.id} section={section} selected={selectedId === section.id} firstMovable={sortableSectionIds[0] === section.id} lastMovable={sortableSectionIds[sortableSectionIds.length - 1] === section.id} onSelect={() => setSelectedId(section.id)} onToggleVisible={() => commit({ ...config, pages: { ...config.pages, [activePage]: { sections: sections.map(item => item.id === section.id ? { ...item, visible: !item.visible } : item) } } })} onMove={delta => move(section.id, delta)} />)}</SortableContext></div><DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>{activeDragId && <LayerDragOverlay section={sections.find(section => section.id === activeDragId)} />}</DragOverlay></DndContext>}</div>
        <div className="editor-global-settings border-t p-3"><div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground"><Settings2 className="h-3.5 w-3.5" />全站设置</div><button onClick={() => setLanguageOpen(true)}><Globe className="h-4 w-4" /><span><strong>多语言</strong><small>{language.supportedLanguages.length} 种访客语言</small></span><ChevronRight className="ml-auto h-3.5 w-3.5" /></button><button onClick={() => setSiteInfoOpen(true)}><ContactRound className="h-4 w-4" /><span><strong>站点信息</strong><small>联系方式与社交媒体</small></span><ChevronRight className="ml-auto h-3.5 w-3.5" /></button><button onClick={() => setThemeOpen(true)}><Palette className="h-4 w-4" /><span><strong>品牌主题</strong><small>{config.themeColor}</small></span><span className="ml-auto h-4 w-4 rounded-full border" style={{ background: config.themeColor }} /></button></div>
      </aside>
      <main className="editor-workspace flex min-w-0 flex-1 flex-col overflow-hidden"><div className="editor-canvas-toolbar"><div className="editor-canvas-mode"><span className="editor-live-dot" />{view === 'desktop' ? '桌面画布' : '移动画布'}<small>{canvasWidth}px · {zoom}%</small></div><div className="editor-canvas-help"><MousePointer2 className="h-3.5 w-3.5" />点击画布区块即可编辑</div></div><div className="editor-canvas-scroll flex flex-1 items-start overflow-auto p-8"><div className="editor-canvas-stage" style={{ width: canvasWidth * zoomScale, height: canvasHeight * zoomScale }}><div ref={canvasRef} data-editor-canvas data-device={view} onClickCapture={event => { const button = (event.target as HTMLElement).closest('button'); const sectionElement = (event.target as HTMLElement).closest<HTMLElement>('[data-section-type]'); if (!button || !sectionElement) return; const source = sections.find(item => item.id === sectionElement.dataset.sectionId); if (!source) return; const label = button.textContent?.trim() || ''; const action = label === source.secondaryButtonText || label.includes('获取报价') ? source.secondaryButtonAction : label === source.buttonText || label.includes('联系我们') ? source.buttonAction : undefined; const target = sections.find(item => item.id === action || item.type === action); if (!target) return; event.preventDefault(); event.stopPropagation(); if (target.type === 'contactModal') setContactPreviewOpen(true); else document.getElementById(`editor-section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="overflow-hidden bg-white shadow-2xl" style={{ width: canvasWidth, transform: `scale(${zoomScale})`, transformOrigin: 'top left', '--site-theme': config.themeColor } as React.CSSProperties}>
        {rendered.map(s => <CanvasSection key={s.id} section={s} siteInfo={config.siteInfo} selected={s.id === selectedId} products={products} productCategories={productCategories} currency={site?.defaultCurrency || 'CNY'} supportedLanguages={language.supportedLanguages} onSelect={() => setSelectedId(s.id)} />)}
        {!rendered.length && <div className="grid h-96 place-items-center text-sm text-muted-foreground">从左侧组件库添加内容区块</div>}
      </div></div></div></main>
      <aside className={`editor-sidebar editor-right-panel flex-shrink-0 overflow-auto border-l bg-white ${rightCollapsed ? 'is-collapsed' : ''}`}><div className="editor-inspector-heading"><div className="editor-inspector-icon">{selected ? React.createElement(META[selected.type].icon, { className: 'h-4 w-4' }) : <Settings2 className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="text-sm font-bold">{selected ? META[selected.type].label : '属性配置'}</div><div className="truncate text-[11px] text-muted-foreground">{selected ? `编辑当前区块的内容、样式与交互` : '选择画布区块后开始配置'}</div></div>{selected && !isFixedSection(selected.type) && <div className="editor-inspector-actions"><button onClick={() => duplicate(selected)} title="复制区块"><Copy className="h-4 w-4" /></button><button onClick={() => removeSection(selected.id)} title="删除区块" className="text-red-500"><Trash2 className="h-4 w-4" /></button></div>}</div>{selected && <div className="editor-right-tabs"><button className={rightTab === 'properties' ? 'is-active' : ''} onClick={() => setRightTab('properties')}>内容与样式</button><button className={rightTab === 'events' ? 'is-active' : ''} onClick={() => setRightTab('events')}>交互事件</button></div>}{selected ? <Properties mode={rightTab} section={selected} sections={sections} agents={agents} onChange={updateSection} /> : <div className="editor-inspector-empty"><div><MousePointer2 className="h-5 w-5" /></div><strong>选择一个页面区块</strong><p>点击中间画布或左侧页面结构，即可在这里编辑内容与样式。</p></div>}</aside>
    </div>
    {contactPreviewOpen && <Modal title="联系我们" onClose={() => setContactPreviewOpen(false)} footer={null}><div className="space-y-3"><p className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">{sections.find(section => section.type === 'contactModal')?.subtitle || '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。'}</p>{config.siteInfo.contactDetails.phone && <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-4"><Phone className="h-5 w-5 text-primary" /><div><div className="text-[11px] text-muted-foreground">电话 / WhatsApp</div><div className="mt-1 text-sm font-bold">{config.siteInfo.contactDetails.phone}</div></div></div>}{config.siteInfo.contactDetails.email && <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-4"><MessageSquare className="h-5 w-5 text-primary" /><div className="min-w-0"><div className="text-[11px] text-muted-foreground">邮箱</div><div className="mt-1 truncate text-sm font-bold">{config.siteInfo.contactDetails.email}</div></div></div>}{config.siteInfo.contactDetails.hours && <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-4"><Clock className="h-5 w-5 text-primary" /><div className="min-w-0"><div className="text-[11px] text-muted-foreground">工作时间</div><div className="mt-1 text-sm font-bold">{config.siteInfo.contactDetails.hours}</div></div></div>}{config.siteInfo.contactDetails.email && <a href={`mailto:${config.siteInfo.contactDetails.email}?subject=${encodeURIComponent('产品询价')}&body=${encodeURIComponent('您好，我想咨询产品报价、定制与交付信息，请与我联系。')}`} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-90 active:scale-[.99]" style={{ backgroundColor: config.themeColor, color: contrastColor(config.themeColor), boxShadow: `0 12px 28px ${config.themeColor}40` }}><MessageSquare className="h-4 w-4" />发送邮件</a>}{config.siteInfo.contactDetails.address && <p className="text-xs text-muted-foreground">地址：{config.siteInfo.contactDetails.address}</p>}</div></Modal>}
    {languageOpen && <Modal title="独立站多语言" onClose={() => setLanguageOpen(false)} footer={<><button onClick={() => setLanguageOpen(false)} className="flex-1 rounded-xl border py-2.5">取消</button><button onClick={saveLanguage} className="flex-1 rounded-xl bg-primary py-2.5 font-bold text-white">保存</button></>}><div className="space-y-4"><Field label="默认语言"><Select value={language.defaultLanguage} onChange={defaultLanguage => setLanguage(v => ({ ...v, defaultLanguage }))} className="w-full" options={languageOptions} /></Field><Field label="访客可切换语言"><Select mode="multiple" value={language.supportedLanguages} onChange={supportedLanguages => setLanguage(v => ({ ...v, supportedLanguages }))} className="w-full" options={languageOptions} /></Field><Field label="翻译智能体"><Select allowClear value={language.translationAgentId || undefined} onChange={translationAgentId => setLanguage(v => ({ ...v, translationAgentId: translationAgentId || '' }))} className="w-full" placeholder="选择已启用的翻译智能体" options={translationAgents.map(a => ({ value: a.id, label: `${a.name} · ${a.model}` }))} /></Field></div></Modal>}
    {siteInfoOpen && <Modal width={900} title="站点信息层" onClose={() => setSiteInfoOpen(false)} footer={<button onClick={() => setSiteInfoOpen(false)} className="w-full rounded-xl bg-primary py-2.5 font-bold text-white">完成</button>}><SiteInfoConfig info={config.siteInfo} onChange={updateSiteInfo} /></Modal>}
    {themeOpen && <Modal title="独立站主题色" onClose={() => setThemeOpen(false)} footer={<button onClick={() => setThemeOpen(false)} className="w-full rounded-xl bg-primary py-2.5 font-bold text-white">完成</button>}><div className="space-y-4"><Field label="主题色号"><div className="flex items-center gap-3 rounded-xl border p-3"><input type="color" value={config.themeColor} onChange={event => commit({ ...config, themeColor: event.target.value.toUpperCase() })} className="h-12 w-16 cursor-pointer rounded-lg border-0 bg-transparent" /><Input value={config.themeColor} maxLength={7} onChange={event => /^#[0-9A-Fa-f]{0,6}$/.test(event.target.value) && commit({ ...config, themeColor: event.target.value.toUpperCase() })} /></div></Field><div><div className="mb-2 text-xs font-bold text-muted-foreground">欧洲商务推荐色</div><div className="flex gap-2">{['#1F6B5C', '#173F5F', '#9A6B3D', '#6B6258', '#8B7CF6'].map(color => <button key={color} onClick={() => commit({ ...config, themeColor: color })} title={color} className={`h-9 w-9 rounded-full border-2 ${config.themeColor === color ? 'border-slate-900' : 'border-white shadow'}`} style={{ background: color }} />)}</div></div><p className="text-xs leading-5 text-muted-foreground">推荐使用低饱和度的森林绿、深海蓝或大地色，以保持专业、可持续与高品质感。</p></div></Modal>}
    {publishOpen && <Modal title="发布站点" onClose={() => setPublishOpen(false)} footer={<><button onClick={() => setPublishOpen(false)} className="flex-1 rounded-xl border py-2.5">取消</button><button onClick={publish} className="flex-1 rounded-xl bg-primary py-2.5 font-bold text-white">确认发布</button></>}><div className="flex gap-3"><AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-500" /><div><div className="font-semibold">发布前将自动保存所有页面</div><p className="mt-1 text-sm text-muted-foreground">发布后会生成新版本并更新访客站点。</p></div></div></Modal>}
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

const HeaderCanvas = ({ section, supportedLanguages }: { section: Section; supportedLanguages: string[] }) => {
  const languages = supportedLanguages.length ? supportedLanguages : ['zh'];
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);
  const [openDropdown, setOpenDropdown] = useState<'language' | 'menu' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const languageOpen = openDropdown === 'language';
  const mobileMenuOpen = openDropdown === 'menu';
  useEffect(() => { if (!languages.includes(currentLanguage)) setCurrentLanguage(languages[0]); }, [currentLanguage, languages]);
  useEffect(() => {
    if (!openDropdown) return;
    const closeOnOutsidePointer = (event: PointerEvent) => { if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpenDropdown(null); };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [openDropdown]);
  const navigateTo = (targetId: string) => { document.getElementById(`editor-section-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setOpenDropdown(null); };
  const selectLanguage = (code: string) => { setCurrentLanguage(code); setOpenDropdown(null); };
  return <>
    <div className="editor-header-announcement bg-[var(--site-theme)] px-4 py-2 text-center text-[9px] font-medium uppercase tracking-[.18em] text-white">全球交付 · 品质承诺 · 专业定制</div>
    <div ref={headerRef} className="editor-site-header flex h-16 items-center border-b border-stone-100 bg-white px-8">
      <div className="editor-header-brand">{section.logoUrl ? <img src={section.logoUrl} alt={section.title} className="h-9 max-w-36 object-contain" /> : <strong className="text-base font-extrabold tracking-tight text-[var(--site-theme)]">{section.title}</strong>}</div>
      <nav className="editor-header-desktop-nav mx-auto flex items-center gap-1">{(section.navItems || []).map(item => <button data-site-preview key={item.id} onClick={event => { event.stopPropagation(); navigateTo(item.targetId); }} className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-stone-500 transition-colors hover:text-[var(--site-theme)]">{item.label}</button>)}</nav>
      <div className="editor-header-actions flex items-center gap-2">
        <button className="editor-header-search rounded-full p-2 text-stone-500"><Search className="h-4 w-4" /></button>
        <div data-editor-interactive className={`editor-language-switcher ${languageOpen ? 'is-open' : ''}`} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
          <button type="button" className="editor-language-trigger" onClick={() => setOpenDropdown(value => value === 'language' ? null : 'language')} aria-expanded={languageOpen}><span className="editor-language-globe"><Globe className="h-3.5 w-3.5" /></span><span><small>Language</small><strong>{languageLabel(currentLanguage)}</strong></span><ChevronDown className="h-3.5 w-3.5" /></button>
          {languageOpen && <div className="editor-language-popover"><div className="editor-language-popover-head"><span>选择语言</span><small>{languages.length} 种可用语言</small></div>{languages.map(code => <button key={code} onClick={() => selectLanguage(code)} className={currentLanguage === code ? 'is-active' : ''}><span className="editor-language-code">{code.toUpperCase()}</span><span><strong>{languageLabel(code)}</strong><small>{code === 'zh' ? 'Chinese' : code === 'en' ? 'English' : 'Bosanski'}</small></span>{currentLanguage === code && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}</div>}
        </div>
        <button data-editor-interactive type="button" className={`editor-mobile-menu-trigger ${mobileMenuOpen ? 'is-open' : ''}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setOpenDropdown(value => value === 'menu' ? null : 'menu'); }} aria-label="打开导航菜单" aria-expanded={mobileMenuOpen}><Menu className="h-5 w-5" /></button>
      </div>
      {mobileMenuOpen && <div data-editor-interactive className="editor-mobile-menu-dropdown" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}><div className="editor-mobile-dropdown-head"><span>页面导航</span><small>{(section.navItems || []).length} 个栏目</small></div><nav>{(section.navItems || []).map((item, index) => <button data-site-preview key={item.id} onClick={() => navigateTo(item.targetId)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong><ChevronRight className="ml-auto h-4 w-4" /></button>)}</nav></div>}
    </div>
  </>;
};

const CanvasSection = ({ section: s, siteInfo, selected, products, productCategories, currency, supportedLanguages, onSelect }: { section: Section; siteInfo: SiteInfo; selected: boolean; products: Product[]; productCategories: DictType['children']; currency: string; supportedLanguages: string[]; onSelect: () => void }) => <section data-section-type={s.type} data-section-id={s.id} data-custom-background={!!(s.backgroundColor || s.sectionBackgroundImage)} id={`editor-section-${s.id}`} style={sectionBackgroundStyle(s)} onClick={event => { if ((event.target as HTMLElement).closest('[data-editor-interactive],button,input,select,textarea,a,summary')) return; onSelect(); }} className={`relative cursor-pointer scroll-m-6 ${selected ? 'is-editor-selected z-10' : 'is-editor-selectable hover:z-10'}`}>
  {selected && <span className="editor-selection-label absolute right-3 top-3 z-20"><Check className="h-3 w-3" />{META[s.type].label}<small>编辑中</small></span>}
  {s.type === 'contactModal' && <div className="bg-stone-100 px-10 py-12"><div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-[var(--site-theme)] px-5 py-4 text-white"><div><h2 className="text-base font-bold text-white">{s.title}</h2><p className="mt-1 text-[9px] text-white/70">{siteInfo.contactDetails.hours}</p></div><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></span></div><div className="space-y-3 p-5"><p className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-[10px] leading-5 text-stone-500">{s.subtitle}</p>{siteInfo.contactDetails.phone && <div className="rounded-xl border p-3 text-[10px]"><strong>电话 / WhatsApp</strong><p className="mt-1 text-stone-500">{siteInfo.contactDetails.phone}</p></div>}{siteInfo.contactDetails.email && <div className="rounded-xl border p-3 text-[10px]"><strong>邮箱</strong><p className="mt-1 text-stone-500">{siteInfo.contactDetails.email}</p></div>}<button className="w-full rounded-xl bg-[var(--site-theme)] py-3 text-[10px] font-bold text-white">发送邮件</button></div></div></div>}
  {s.type === 'header' && <HeaderCanvas section={s} supportedLanguages={supportedLanguages} />}
  {s.type === 'hero' && <><div className="editor-hero-preview relative min-h-[520px] overflow-hidden bg-[var(--site-theme)] text-white" style={s.imageUrls?.[0] ? { backgroundImage: `linear-gradient(90deg,rgba(8,20,15,.84) 0%,rgba(8,20,15,.58) 44%,rgba(8,20,15,.08) 82%),url(${s.imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="editor-hero-glow" /><div className="relative z-10 flex min-h-[520px] max-w-[660px] flex-col justify-center px-[72px] py-20">{s.showEyebrow !== false && <span className="editor-hero-eyebrow"><span />{s.eyebrow}</span>}<h2 className="mt-6 text-[46px] font-black leading-[1.07] tracking-[-.035em]">{s.title}</h2><p className="mt-5 max-w-[560px] text-sm leading-7 text-white/72">{s.subtitle}</p><div className="mt-9 flex items-center gap-3">{s.showButton !== false && s.buttonText && <button className="editor-hero-primary-button">{s.buttonText}<ArrowRight className="h-4 w-4" /></button>}{s.showSecondaryButton !== false && <button className="editor-hero-secondary-button"><MessageSquare className="h-4 w-4" />{s.secondaryButtonText}</button>}</div></div>{(s.imageUrls?.length || 0) > 1 && <div className="editor-hero-pagination">{s.imageUrls!.map((_, index) => <span key={index} className={index === 0 ? 'is-active' : ''} />)}</div>}<div className="editor-hero-scroll-cue"><span />Explore</div></div>{s.showTrustBar !== false && <div className="editor-hero-trust-grid">{[[Award, '品质保障', '严格质检与稳定品质'], [MessageSquare, '专业服务', '一对一采购咨询'], [Package, '灵活定制', '支持品牌与包装定制'], [Star, '全球口碑', '服务海外品牌客户']].map(([Icon, title, desc]) => { const IconComponent = Icon as React.ElementType; return <div key={title as string} className="editor-hero-trust-item"><div><IconComponent className="h-4 w-4" /></div><span><strong>{title as string}</strong><small>{desc as string}</small></span></div>; })}</div>}</>}
  {s.type === 'text' && <div className="grid grid-cols-2 items-center gap-14 bg-[#f8f6f2] px-14 py-16"><div><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--site-theme)]">{s.showEyebrow !== false && s.eyebrow}</span><h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-.025em] text-[var(--site-theme)]">{s.title}</h2><p className="mt-5 text-xs leading-6 text-stone-600">{s.subtitle}</p><div className="mt-7 grid grid-cols-3 gap-4 border-t border-stone-200 pt-6">{(s.stats || []).map(({ value: stat, label }) => <div key={stat}><div className="text-xl font-black text-[var(--site-theme)]">{stat}</div><div className="mt-1 text-[9px] text-stone-500">{label}</div></div>)}</div><div className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--site-theme)_15%,transparent)] bg-gradient-to-br from-[var(--site-theme)]/5 to-[color-mix(in_srgb,var(--site-theme)_5%,transparent)] p-5"><div className="text-xs font-bold text-[var(--site-theme)]">{s.promiseTitle}</div><p className="mt-2 text-[10px] leading-5 text-stone-600">{s.promiseText}</p></div></div><div className="relative">{s.backgroundImageUrl ? <img src={s.backgroundImageUrl} alt={s.title} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl" /> : <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-stone-200 text-xs text-stone-400">上传品牌图片</div>}<div className="absolute -bottom-4 -left-4 rounded-2xl bg-[var(--site-theme)] px-5 py-4 text-xs font-bold text-white">品质认证</div></div></div>}
  {s.type === 'image' && <div className="bg-white px-10 py-12"><div className="relative overflow-hidden rounded-2xl">{s.imageUrl ? <img src={s.imageUrl} alt={s.title} className="h-80 w-full object-cover transition-transform duration-700 hover:scale-105" /> : <div className="grid h-72 place-items-center bg-[#f8f6f2] text-xs text-stone-400">在右侧输入图片 URL</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute bottom-0 p-7"><h3 className="text-xl font-bold text-white">{s.title}</h3>{s.showButton !== false && <button className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[var(--site-theme)]">{s.buttonText || '了解更多'} <ArrowRight className="h-3.5 w-3.5" /></button>}</div></div></div>}
  {s.type === 'products' && <ProductCanvas section={s} products={products} categories={productCategories} currency={currency} />}
  {s.type === 'form' && <InquiryCanvas section={s} />}
  {s.type === 'footer' && <footer className="bg-[color-mix(in_srgb,var(--site-theme)_52%,black)] px-10 py-10 text-white"><div className="grid grid-cols-[1.4fr_1fr_1fr] gap-10"><div className="max-w-sm"><strong className="text-lg font-extrabold">{s.title}</strong><div className="mt-3 text-[10px] leading-5 text-stone-400">{s.subtitle}</div>{s.showSocials !== false && <div className="mt-5 flex flex-wrap gap-2">{siteInfo.socialLinks.filter(item => item.visible).map(item => <span key={item.id} className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-stone-300">{item.label}</span>)}</div>}</div><div><div className="mb-4 text-[10px] font-bold uppercase tracking-[.14em] text-white">快速导航</div><nav className="grid gap-2 text-[10px] text-stone-400">{(s.navItems || []).map(item => <button data-site-preview key={item.id} onClick={event => { event.stopPropagation(); document.getElementById(`editor-section-${item.targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="w-max transition-colors hover:text-white">{item.label}</button>)}</nav></div>{s.showContact !== false && <div><div className="mb-4 text-[10px] font-bold uppercase tracking-[.14em] text-white">联系我们</div><div className="space-y-2 text-[10px] leading-5 text-stone-400">{siteInfo.contactDetails?.email && <p>{siteInfo.contactDetails.email}</p>}{siteInfo.contactDetails?.phone && <p>{siteInfo.contactDetails.phone}</p>}{siteInfo.contactDetails?.whatsapp && <p>WhatsApp: {siteInfo.contactDetails.whatsapp}</p>}{siteInfo.contactDetails?.address && <p>{siteInfo.contactDetails.address}</p>}{siteInfo.contactDetails?.hours && <p>{siteInfo.contactDetails.hours}</p>}</div></div>}</div><div className="mt-8 border-t border-white/10 pt-5 text-[9px] text-stone-500">© {new Date().getFullYear()} {s.title}. All rights reserved.</div></footer>}
  {s.type === 'assistant' && <div className={`absolute bottom-6 z-20 ${s.position === 'left' ? 'left-6' : 'right-6'}`}><button className="grid h-12 w-12 place-items-center rounded-full bg-[var(--site-theme)] text-white shadow-xl"><MessageCircle className="h-5 w-5" /></button></div>}
</section>;

const ProductCanvas = ({ section, products, categories, currency }: { section: Section; products: Product[]; categories: DictType['children']; currency: string }) => {
  const [primary, setPrimary] = useState('全部');
  const [secondary, setSecondary] = useState('全部');
  const enabledCategories = categories.filter(item => item.status === 'enabled').sort((a, b) => a.sort - b.sort);
  const activePrimary = enabledCategories.find(item => item.code === primary);
  const codes = new Set([primary, ...(activePrimary?.children || []).map(item => item.code)]);
  const filtered = primary === '全部' ? products : secondary === '全部' ? products.filter(product => codes.has(product.category)) : products.filter(product => product.category === secondary);
  const categoryLabel = (code: string) => { const parent = categories.find(item => item.code === code); if (parent) return parent.label; for (const item of categories) { const child = item.children.find(value => value.code === code); if (child) return `${item.label} / ${child.label}`; } return code; };
  const price = (value: string) => { if (/^[¥$€£]/.test(value)) return value; const symbol = ({ CNY: '¥', USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[currency]; return symbol ? `${symbol}${value}` : `${currency} ${value}`; };
  const countFor = (code: string, children: string[] = []) => products.filter(product => [code, ...children].includes(product.category)).length;
  const stock = (value: number) => value > 1000 ? { label: '有货', className: 'bg-green-50 text-green-700' } : value > 0 ? { label: '少量', className: 'bg-amber-50 text-amber-700' } : { label: '缺货', className: 'bg-red-50 text-red-600' };
  const badgeLabel = (product: Product) => ({ new: '新品', hot: '爆品', bestseller: '热销', recommended: '推荐' } as Record<string, string>)[product.badge || ''] || (product.hot ? '爆品' : '');
  return <div className="bg-white px-10 py-12 font-sans">
    <div className="mb-10 flex items-end justify-between"><div>{section.showEyebrow !== false && <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--site-theme)]">{section.eyebrow}</span>}<h2 className="mt-2 text-[26px] font-extrabold text-[var(--site-theme)]">{section.title}</h2></div>{section.showButton !== false && <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--site-theme)]"><MessageSquare className="h-3.5 w-3.5" />{section.buttonText}</button>}</div>
    <div className="flex gap-8">
      {section.showCategories !== false && enabledCategories.length > 0 && <aside className="w-44 flex-shrink-0"><h3 className="mb-4 text-[11px] font-bold">类别筛选</h3><div className="space-y-1"><button onClick={() => { setPrimary('全部'); setSecondary('全部'); }} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs ${primary === '全部' ? 'bg-[color-mix(in_srgb,var(--site-theme)_6%,transparent)] font-bold text-[var(--site-theme)]' : 'text-stone-600'}`}><span className="w-4" /><span className="flex-1">全部商品</span><span className="text-[10px] text-stone-400">({products.length})</span></button>{enabledCategories.map(item => { const children = item.children.filter(child => child.status === 'enabled').sort((a, b) => a.sort - b.sort); const expanded = primary === item.code; return <div key={item.code}><button onClick={() => { setPrimary(item.code); setSecondary('全部'); }} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs ${expanded ? 'bg-[color-mix(in_srgb,var(--site-theme)_6%,transparent)] font-bold text-[var(--site-theme)]' : 'text-stone-600'}`}>{children.length ? <ChevronDown className={`mr-1 h-3 w-3 transition-transform ${expanded ? '' : '-rotate-90'}`} /> : <span className="w-4" />}<span className="flex-1">{item.label}</span><span className="text-[10px] text-stone-400">({countFor(item.code, children.map(child => child.code))})</span></button>{expanded && children.length > 0 && <div className="mt-1 space-y-1 border-l border-stone-100 pl-5">{children.map(child => <button key={child.code} onClick={() => setSecondary(child.code)} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] ${secondary === child.code ? 'font-semibold text-[var(--site-theme)]' : 'text-stone-500'}`}><span>{child.label}</span><span className="text-stone-400">({countFor(child.code)})</span></button>)}</div>}</div>; })}</div></aside>}
      <div className="min-w-0 flex-1"><div className="mb-5 border-b pb-4 text-xs text-stone-500"><strong className="text-[var(--site-theme)]">{filtered.length}</strong> products</div>{filtered.length ? <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${section.columns || 3},minmax(0,1fr))` }}>{filtered.map(product => { const availability = stock(product.stock); const badge = badgeLabel(product); return <div key={product.id} className="group flex flex-col overflow-hidden rounded-xl border border-stone-100 bg-white"><div className="relative aspect-square overflow-hidden bg-stone-50">{product.img && <img src={product.img.startsWith('http') ? product.img : `https://images.unsplash.com/${product.img}?w=500&h=500&fit=crop`} alt={product.nameZh || product.nameEn} className="h-full w-full object-cover" />}{badge && <span className="absolute left-2 top-2 rounded-full bg-[var(--site-theme)] px-2.5 py-1 text-[10px] font-bold text-white">{badge}</span>}<span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] text-stone-500"><Heart className="h-3.5 w-3.5" />{product.likeCount || 0}</span></div><div className="flex flex-1 flex-col p-4"><h3 className="text-sm font-semibold leading-5">{product.nameZh || product.nameEn}</h3><div className="product-rich-description line-clamp-3 min-h-10 text-[11px] leading-5 text-stone-400" dangerouslySetInnerHTML={{ __html: product.description || '<p>支持材质、颜色及品牌印刷定制。</p>' }} /><div className="my-2.5 flex flex-wrap gap-1.5">{(product.tags || []).map(tag => <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-[10px] text-stone-500">{tag}</span>)}</div><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[var(--site-theme)]">{categoryLabel(product.category)}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${availability.className}`}>{availability.label}</span></div>{(section.showPrice || section.showMoq) && <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">{section.showPrice ? <p className="text-sm font-bold text-[var(--site-theme)]">{price(product.price)}</p> : <span />}{section.showMoq && <p className="shrink-0 text-[10px] text-stone-500">最小起订量 {product.moq}</p>}</div>}</div></div>; })}</div> : <div className="py-20 text-center text-xs text-stone-400">没有符合条件的产品</div>}</div>
    </div>
  </div>;
};
const InquiryCanvas = ({ section }: { section: Section }) => {
  const fields = (section.formFields || createSection('form').formFields || []).filter(field => field.enabled);
  return <div className="relative overflow-hidden bg-[var(--site-theme)] px-14 py-16" style={section.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(26,61,46,.86),rgba(26,61,46,.86)),url(${section.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="relative mx-auto max-w-3xl text-center text-white">{section.showEyebrow !== false && <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#e8d5a3]">{section.eyebrow}</span>}<h2 className="mt-4 text-3xl font-black tracking-[-.025em]">{section.title}</h2><p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-200">{section.subtitle}</p><div className="mt-9 grid grid-cols-2 gap-3 rounded-2xl bg-white p-6 text-left shadow-2xl">{fields.map(field => <div key={field.key} className={`${field.key === 'requirements' ? 'col-span-2 h-20' : 'h-10'} rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[10px] text-stone-400`}>{field.label}{field.required && <span className="ml-1 text-[var(--site-theme)]">*</span>}</div>)}{section.showButton !== false && <button className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--site-theme)] px-5 py-3 text-xs font-bold text-white">{section.buttonText}<ArrowRight className="h-3.5 w-3.5" /></button>}</div></div></div>;
};

const Properties = ({ mode, section: s, sections, agents, onChange }: { mode: 'properties' | 'events'; section: Section; sections: Section[]; agents: Agent[]; onChange: (p: Partial<Section>) => void }) => <div className={`space-y-5 p-4 configuration-${mode}`}>
  {mode === 'events' && !['header', 'footer', 'hero', 'image', 'products', 'form'].includes(s.type) && <div className="event-config rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">当前组件暂无可配置事件</div>}
  {s.type === 'hero' ? <HeroProperties section={s} onChange={onChange} /> : <Field label="区块标题"><Input value={s.title} onChange={e => onChange({ title: e.target.value })} /></Field>}
  {['text', 'products', 'form'].includes(s.type) && <><Toggle label="显示眉标" value={s.showEyebrow !== false} onClick={() => onChange({ showEyebrow: s.showEyebrow === false })} />{s.showEyebrow !== false && <Field label="眉标文案"><Input value={s.eyebrow} onChange={e => onChange({ eyebrow: e.target.value })} /></Field>}</>}
  {['text', 'products', 'form', 'contactModal', 'footer'].includes(s.type) && <Field label="说明文字" normal={s.type === 'products'}><Input.TextArea className={s.type === 'products' ? 'product-description-input' : undefined} rows={3} value={s.subtitle} onChange={e => onChange({ subtitle: e.target.value })} /></Field>}
  {['hero', 'image', 'products', 'form'].includes(s.type) && <div className="event-config"><ButtonActionConfig section={s} sections={sections} onChange={onChange} /></div>}
  {['text', 'form'].includes(s.type) && <BackgroundImage image={s.backgroundImageUrl || ''} onChange={backgroundImageUrl => onChange({ backgroundImageUrl })} />}
  <SectionBackground section={s} onChange={onChange} />
  {s.type === 'image' && <Field label="图片 URL"><Input value={s.imageUrl} onChange={e => onChange({ imageUrl: e.target.value })} placeholder="https://..." /></Field>}
  {s.type === 'text' && <><Toggle label="显示数据指标" value={s.showStats !== false} onClick={() => onChange({ showStats: s.showStats === false })} />{s.showStats !== false && <Field label="数据指标"><div className="space-y-2">{(s.stats || []).map((stat, index) => <div key={stat.id} className="grid grid-cols-[72px_1fr] gap-2"><Input value={stat.value} placeholder="10+" onChange={e => onChange({ stats: (s.stats || []).map((item, i) => i === index ? { ...item, value: e.target.value } : item) })} /><Input value={stat.label} placeholder="指标说明" onChange={e => onChange({ stats: (s.stats || []).map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} /></div>)}</div></Field>}<Field label="承诺标题"><Input value={s.promiseTitle} onChange={e => onChange({ promiseTitle: e.target.value })} /></Field><Field label="承诺内容"><Input.TextArea rows={3} value={s.promiseText} onChange={e => onChange({ promiseText: e.target.value })} /></Field></>}
  {s.type === 'products' && <><Field label="桌面端列数"><div className="grid grid-cols-3 gap-2">{[2, 3, 4].map(n => <button key={n} onClick={() => onChange({ columns: n })} className={`rounded-lg border py-2 text-xs ${s.columns === n ? 'border-primary bg-primary/5 text-primary' : ''}`}>{n} 列</button>)}</div></Field><p className="rounded-lg bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">商品将全量展示，移动端自动使用单列布局。</p><Toggle label="显示产品分类" value={s.showCategories !== false} onClick={() => onChange({ showCategories: s.showCategories === false })} /><Toggle label="显示价格" value={!!s.showPrice} onClick={() => onChange({ showPrice: !s.showPrice })} /><Toggle label="显示最小起订量" value={!!s.showMoq} onClick={() => onChange({ showMoq: !s.showMoq })} /></>}
  {s.type === 'form' && <FormFieldsConfig fields={s.formFields || []} onChange={formFields => onChange({ formFields })} />}
  {s.type === 'header' && <NavConfig mode="properties" section={s} sections={sections} onChange={onChange} />}
  {s.type === 'header' && <div className="event-config"><NavConfig mode="events" section={s} sections={sections} onChange={onChange} /></div>}
  {s.type === 'footer' && <div className="event-config"><NavConfig mode="events" section={s} sections={sections} onChange={onChange} showLogo={false} title="页脚导航" /></div>}
  {s.type === 'footer' && <><Toggle label="显示联系方式" value={s.showContact !== false} onClick={() => onChange({ showContact: s.showContact === false })} /><Toggle label="显示社交媒体" value={s.showSocials !== false} onClick={() => onChange({ showSocials: s.showSocials === false })} /><div className="rounded-xl border bg-secondary/20 p-3 text-xs leading-5 text-muted-foreground">联系方式与社交媒体统一在左侧底部「信息层」中维护，此处仅控制页脚是否引用。</div></>}
  {s.type === 'assistant' && <><Field label="绑定询盘智能体"><Select allowClear value={s.agentId || undefined} onChange={agentId => onChange({ agentId })} className="w-full" options={agents.filter(a => a.agentType !== 'translation').map(a => ({ value: a.id, label: `${a.name} · ${a.status === 'active' ? '已启用' : '未启用'}` }))} /></Field><Field label="欢迎语"><Input.TextArea rows={3} value={s.welcome} onChange={e => onChange({ welcome: e.target.value })} /></Field><Field label="快捷问题（每行一个）"><Input.TextArea rows={4} value={(s.quickReplies || []).join('\n')} onChange={e => onChange({ quickReplies: e.target.value.split('\n').filter(Boolean) })} /></Field><Field label="悬浮位置"><div className="grid grid-cols-2 gap-2">{(['left', 'right'] as const).map(v => <button key={v} onClick={() => onChange({ position: v })} className={`rounded-lg border py-2 text-xs ${s.position === v ? 'border-primary bg-primary/5 text-primary' : ''}`}>{v === 'left' ? '左下角' : '右下角'}</button>)}</div></Field></>}
</div>;

const HeroProperties = ({ section, onChange }: { section: Section; onChange: (patch: Partial<Section>) => void }) => <div className="hero-properties">
  <section className="hero-config-card">
    <div className="hero-config-card-head"><span className="hero-config-step">01</span><div><strong>核心内容</strong><small>一句话讲清品牌价值与客户收益</small></div></div>
    <div className="hero-config-fields">
      <Field label="主标题"><Input value={section.title} onChange={event => onChange({ title: event.target.value })} placeholder="输入首屏核心标题" /></Field>
      <Field label="说明文字" normal><Input.TextArea className="hero-description-input" rows={3} value={section.subtitle} onChange={event => onChange({ subtitle: event.target.value })} placeholder="补充产品优势、服务范围或信任背书" /></Field>
    </div>
  </section>
  <section className="hero-config-card">
    <div className="hero-config-card-head"><span className="hero-config-step">02</span><div><strong>内容展示</strong><small>控制辅助信息和服务承诺的显示</small></div></div>
    <div className="hero-display-options">
      <div className="hero-display-option"><div><strong>眉标文案</strong><small>用于强调系列、年份或核心标签</small></div><EditorSwitch value={section.showEyebrow !== false} onChange={showEyebrow => onChange({ showEyebrow })} /></div>
      {section.showEyebrow !== false && <div className="hero-inline-field"><Input value={section.eyebrow} onChange={event => onChange({ eyebrow: event.target.value })} placeholder="例如：Premium collection 2026" /></div>}
      <div className="hero-display-option"><div><strong>服务承诺栏</strong><small>在首屏底部展示品质、服务、定制与口碑</small></div><EditorSwitch value={section.showTrustBar !== false} onChange={showTrustBar => onChange({ showTrustBar })} /></div>
    </div>
  </section>
  <section className="hero-config-card hero-media-card">
    <div className="hero-config-card-head"><span className="hero-config-step">03</span><div><strong>轮播素材</strong><small>第一张图片作为首屏默认视觉</small></div><span className="hero-image-count">{(section.imageUrls || []).length}/5</span></div>
    <HeroImages images={section.imageUrls || []} onChange={imageUrls => onChange({ imageUrls })} />
  </section>
</div>;

const ButtonActionConfig = ({ section, sections, onChange }: { section: Section; sections: Section[]; onChange: (patch: Partial<Section>) => void }) => {
  const options = sections.filter(item => item.type !== 'header' && item.type !== 'footer').map(item => ({ value: item.id, label: item.type === 'contactModal' ? '打开：联系我们弹窗' : `定位：${META[item.type].label}` }));
  const contactModal = sections.find(item => item.type === 'contactModal');
  const normalizeValue = (value?: string) => value === 'contactModal' ? contactModal?.id : sections.find(item => item.type === value)?.id || value;
  const binding = (kind: 'primary' | 'secondary') => { const primary = kind === 'primary'; const visible = primary ? section.showButton !== false : section.showSecondaryButton !== false; const text = primary ? section.buttonText : section.secondaryButtonText; const action = primary ? section.buttonAction : section.secondaryButtonAction; return <div className="event-binding" key={kind}><div className="event-binding-head"><span>{primary ? '主按钮' : '次按钮'}</span><EditorSwitch value={visible} onChange={value => onChange(primary ? { showButton: value } : { showSecondaryButton: value })} /></div>{visible && <div className="event-binding-flow"><div className="event-binding-node"><Field label="按钮文案"><Input value={text} onChange={event => onChange(primary ? { buttonText: event.target.value } : { secondaryButtonText: event.target.value })} /></Field></div><div className="event-binding-line"><ArrowRight /></div><div className="event-binding-node"><Field label="关联事件">{section.type === 'form' ? <Select disabled className="w-full" value="submit" options={[{ value: 'submit', label: '提交询盘' }]} /> : <Select allowClear className="w-full" placeholder="选择组件或弹窗" value={normalizeValue(action)} onChange={value => onChange(primary ? { buttonAction: value } : { secondaryButtonAction: value })} options={options} />}</Field></div></div>}</div>; };
  return <div className="space-y-3"><div className="text-xs font-semibold text-muted-foreground">关联事件</div>{binding('primary')}{section.type === 'hero' && binding('secondary')}</div>;
};

const HeroImages = ({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) => {
  const [uploading, setUploading] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, 5 - images.length));
    if (selected.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) return window.alert('请上传 5MB 以内的 PNG、JPG 或 WebP 图片');
    setUploading(true);
    try { const results = await Promise.all(selected.map(file => productApi.uploadImage(file))); onChange([...images, ...results.map(result => result.url)].slice(0, 5)); }
    catch { window.alert('轮播图片上传失败，请检查图片存储服务'); }
    finally { setUploading(false); }
  };
  return <div className="hero-images"><div className="hero-image-grid">{images.map((url, index) => <div key={`${url}-${index}`} className="hero-image-item group"><img src={url} alt={`首屏轮播图 ${index + 1}`} /><span>{index === 0 ? '默认' : index + 1}</span><button onClick={() => onChange(images.filter((_, value) => value !== index))} title="移除图片"><X className="h-3 w-3" /></button></div>)}{images.length < 5 && <label className={`hero-image-upload ${uploading ? 'pointer-events-none opacity-50' : ''}`}><input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void upload(event.target.files); event.target.value = ''; }} /><Image className="h-5 w-5" /><strong>{uploading ? '上传中…' : '添加图片'}</strong><small>PNG / JPG / WebP</small></label>}</div><div className="hero-image-guidance"><Sparkles className="h-3.5 w-3.5" /><span>推荐 1600 × 1000 px 横向图片，主体尽量靠右，为左侧文案预留空间。</span></div></div>;
};

const BackgroundImage = ({ image, onChange, compact = false }: { image: string; onChange: (image: string) => void; compact?: boolean }) => {
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return window.alert('请上传 5MB 以内的 PNG、JPG 或 WebP 图片');
    setUploading(true);
    try { const result = await productApi.uploadImage(file); onChange(result.url); }
    catch { window.alert('背景图上传失败，请检查图片存储服务'); }
    finally { setUploading(false); }
  };
  return <Field label={compact ? "背景图片" : "模块背景图"}><div className={compact ? "flex items-center gap-2" : "rounded-xl border bg-secondary/20 p-3"}>{image ? <div className={`relative shrink-0 overflow-hidden rounded-lg border bg-slate-100 ${compact ? 'h-12 w-20' : ''}`}><img src={image} alt="背景图预览" className={compact ? "h-full w-full object-cover" : "h-28 w-full object-cover"} /><button onClick={() => onChange('')} title="移除背景图" className={`absolute rounded-md bg-white/90 text-red-500 shadow ${compact ? 'right-1 top-1 p-1' : 'right-2 top-2 p-1.5'}`}><Trash2 className={compact ? "h-3 w-3" : "h-4 w-4"} /></button></div> : !compact && <div className="grid h-24 place-items-center rounded-lg border border-dashed bg-white text-xs text-muted-foreground">暂未配置背景图</div>}<label className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border bg-white text-xs font-semibold ${compact ? 'h-9 px-2' : 'mt-3 py-2'} ${uploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:text-primary'}`}><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />{uploading ? '上传中…' : image ? '更换图片' : '上传图片'}</label>{!compact && <p className="mt-2 text-[11px] leading-5 text-muted-foreground">推荐 1600 × 700 px，系统会居中裁切并自动添加遮罩以保证文字清晰。</p>}</div></Field>;
};

const SectionBackground = ({ section, onChange }: { section: Section; onChange: (patch: Partial<Section>) => void }) => <div className="section-background-card"><div className="section-background-head"><div><strong>组件背景</strong><small>设置当前区块的颜色、透明度或背景图片</small></div></div><div className="section-background-color"><input type="color" title="选择背景色" value={section.backgroundColor || '#FFFFFF'} onChange={event => onChange({ backgroundColor: event.target.value.toUpperCase() })} /><Input value={section.backgroundColor || ''} placeholder="默认颜色" maxLength={7} onChange={event => /^#[0-9A-Fa-f]{0,6}$/.test(event.target.value) && onChange({ backgroundColor: event.target.value.toUpperCase() })} /><button onClick={() => onChange({ backgroundColor: undefined })}>重置</button></div><div className="section-background-opacity"><span>透明度</span><input type="range" min="0" max="100" step="1" value={section.backgroundOpacity ?? 100} onChange={event => onChange({ backgroundOpacity: Number(event.target.value) })} /><span>{section.backgroundOpacity ?? 100}%</span></div><BackgroundImage compact image={section.sectionBackgroundImage || ''} onChange={sectionBackgroundImage => onChange({ sectionBackgroundImage })} /></div>;

const FormFieldsConfig = ({ fields, onChange }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) => {
  const available: FormField['key'][] = ['name', 'email', 'company', 'phone', 'country', 'requirements'];
  const labels: Record<FormField['key'], string> = { name: '姓名', email: '邮箱', company: '公司', phone: '电话', country: '国家/地区', requirements: '采购需求' };
  const update = (key: FormField['key'], patch: Partial<FormField>) => onChange(fields.map(field => field.key === key ? { ...field, ...patch } : field));
  return <Field label="客户填写信息"><div className="space-y-2">{fields.map(field => <div key={field.key} className="rounded-xl border bg-secondary/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">{labels[field.key]}</span><EditorSwitch value={field.enabled} onChange={enabled => update(field.key, { enabled })} /></div><Input value={field.label} onChange={event => update(field.key, { label: event.target.value })} /><div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">设为必填</span><EditorSwitch value={field.required} onChange={required => update(field.key, { required })} /></div></div>)}{available.filter(key => !fields.some(field => field.key === key)).map(key => <button key={key} onClick={() => onChange([...fields, { key, label: labels[key], enabled: true, required: false }])} className="mr-2 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-primary"><Plus className="mr-1 inline h-3 w-3" />{labels[key]}</button>)}</div></Field>;
};

const NavConfig = ({ mode, section, sections, onChange, showLogo = true, title = '导航配置' }: { mode: 'properties' | 'events'; section: Section; sections: Section[]; onChange: (patch: Partial<Section>) => void; showLogo?: boolean; title?: string }) => {
  const [openId, setOpenId] = useState('');
  const [uploading, setUploading] = useState(false);
  const items = section.navItems || [];
  const options = sections.filter(item => item.id !== section.id && ['hero', 'products', 'text', 'form', 'footer'].includes(item.type)).map(item => ({ value: item.id, label: META[item.type].label }));
  const updateItem = (id: string, patch: Partial<NavItem>) => onChange({ navItems: items.map(item => item.id === id ? { ...item, ...patch } : item) });
  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) return window.alert('请上传 2MB 以内的 PNG、JPG 或 WebP 图片');
    setUploading(true);
    try { const result = await productApi.uploadImage(file); onChange({ logoUrl: result.url }); }
    catch { window.alert('Logo 上传失败，请检查图片存储服务配置'); }
    finally { setUploading(false); }
  };
  return <div>
    {mode === 'properties' && showLogo && <div className="mb-5"><div className="mb-2 text-xs font-bold text-muted-foreground">品牌 Logo</div>
      <div className="rounded-xl border border-border bg-secondary/20 p-3">{section.logoUrl ? <div className="flex items-center gap-3"><div className="grid h-16 flex-1 place-items-center rounded-lg border bg-white p-2"><img src={section.logoUrl} alt="Logo 预览" className="max-h-12 max-w-full object-contain" /></div><button onClick={() => onChange({ logoUrl: '' })} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500" title="移除 Logo"><Trash2 className="h-4 w-4" /></button></div> : <div className="rounded-lg border border-dashed bg-white py-5 text-center text-xs text-muted-foreground">尚未上传 Logo</div>}
        <label className={`mt-3 flex w-full cursor-pointer items-center justify-center rounded-lg border py-2 text-xs font-semibold ${uploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:text-primary'}`}><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} />{uploading ? '上传中…' : section.logoUrl ? '更换 Logo' : '上传 Logo'}</label>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">推荐尺寸：320 × 96 px（约 10:3）；建议使用透明背景 PNG 或 WebP，文件不超过 2MB。</p>
      </div>
    </div>}
    {mode === 'events' && <><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-bold text-muted-foreground">{title}</div><div className="mt-1 text-[11px] text-muted-foreground/70">配置导航名称及点击后定位的页面模块</div></div><span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{items.length} 项</span></div>
      <div className="space-y-3">{items.map((item, index) => <div key={item.id} className="rounded-xl border border-border bg-secondary/20 p-3">
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-foreground">导航 {index + 1}</span><button onClick={() => onChange({ navItems: items.filter(value => value.id !== item.id) })} title="删除导航" className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div>
        <div className="space-y-3"><Field label="导航名称"><Input value={item.label} placeholder="例如：产品中心" onChange={event => updateItem(item.id, { label: event.target.value })} /></Field>
          <Field label="关联模块"><Select value={item.targetId || undefined} open={openId === item.id} onOpenChange={open => setOpenId(open ? item.id : '')} getPopupContainer={trigger => trigger.parentElement || document.body} placeholder="选择点击后定位的模块" className="w-full" onChange={targetId => { updateItem(item.id, { targetId }); setOpenId(''); }} options={options} /></Field>
        </div>
      </div>)}</div>
      {!items.length && <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">暂无导航，请添加导航项</div>}
      <button onClick={() => onChange({ navItems: [...items, { id: newId(), label: '新导航', targetId: options[0]?.value || '' }] })} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5"><Plus className="h-3.5 w-3.5" />添加导航</button></>}
  </div>;
};
const SiteInfoConfig = ({ info, onChange }: { info: SiteInfo; onChange: (info: SiteInfo) => void }) => {
  const updateContact = (key: keyof ContactDetails, value: string) => onChange({ ...info, contactDetails: { ...info.contactDetails, [key]: value } });
  return <div className="max-h-[70vh] space-y-6 overflow-auto pr-1">
    <p className="rounded-xl bg-secondary/30 p-3 text-xs leading-5 text-muted-foreground">信息层是全站唯一数据源，页脚、询价区块与「联系我们」弹窗都从这里读取。</p>
    <div><div className="mb-3 text-xs font-bold">联系弹窗</div><div className="grid grid-cols-3 gap-4"><Field label="弹窗标题"><Input value={info.contactModalTitle} onChange={event => onChange({ ...info, contactModalTitle: event.target.value })} /></Field><Field label="弹窗说明"><Input value={info.contactModalSubtitle} onChange={event => onChange({ ...info, contactModalSubtitle: event.target.value })} /></Field><Field label="工作时间"><Input value={info.contactDetails.hours} onChange={event => updateContact('hours', event.target.value)} /></Field></div></div>
    <div className="border-t pt-5"><div className="mb-3 text-xs font-bold">联系方式</div><div className="grid grid-cols-3 gap-4"><Field label="邮箱"><Input value={info.contactDetails.email} onChange={event => updateContact('email', event.target.value)} /></Field><Field label="电话"><Input value={info.contactDetails.phone} onChange={event => updateContact('phone', event.target.value)} /></Field><Field label="WhatsApp"><Input value={info.contactDetails.whatsapp} onChange={event => updateContact('whatsapp', event.target.value)} /></Field><Field label="地址"><Input.TextArea rows={2} value={info.contactDetails.address} onChange={event => updateContact('address', event.target.value)} /></Field></div></div>
    <div className="border-t pt-5"><div className="mb-3 text-xs font-bold">社交媒体</div><div className="grid grid-cols-3 gap-3">{info.socialLinks.map(social => <div key={social.id} className="rounded-xl border bg-secondary/20 p-3"><div className="mb-2 flex items-center gap-2"><Input value={social.label} onChange={event => onChange({ ...info, socialLinks: info.socialLinks.map(item => item.id === social.id ? { ...item, label: event.target.value } : item) })} /><EditorSwitch value={social.visible} onChange={visible => onChange({ ...info, socialLinks: info.socialLinks.map(item => item.id === social.id ? { ...item, visible } : item) })} /></div><div className="flex gap-2"><Input value={social.url} placeholder="https://..." onChange={event => onChange({ ...info, socialLinks: info.socialLinks.map(item => item.id === social.id ? { ...item, url: event.target.value } : item) })} /><button onClick={() => onChange({ ...info, socialLinks: info.socialLinks.filter(item => item.id !== social.id) })} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></div>)}</div><button onClick={() => onChange({ ...info, socialLinks: [...info.socialLinks, { id: newId(), platform: 'website', label: '新媒体', url: '', visible: true }] })} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" />添加社交媒体</button></div>
  </div>;
};

const FooterContactConfig = ({ section, onChange }: { section: Section; onChange: (patch: Partial<Section>) => void }) => {
  const contact = section.contactDetails || createSection('footer').contactDetails!;
  const socials = section.socialLinks || [];
  const updateContact = (key: keyof ContactDetails, value: string) => onChange({ contactDetails: { ...contact, [key]: value } });
  return <div className="space-y-5 border-t pt-5"><div><div className="text-xs font-bold text-foreground">联系方式与社交媒体</div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">会同步展示在页脚与联系我们区域。</p></div><Toggle label="显示联系方式" value={section.showContact !== false} onClick={() => onChange({ showContact: section.showContact === false })} />{section.showContact !== false && <div className="space-y-3"><Field label="邮箱"><Input value={contact.email} onChange={event => updateContact('email', event.target.value)} /></Field><Field label="电话"><Input value={contact.phone} onChange={event => updateContact('phone', event.target.value)} /></Field><Field label="WhatsApp"><Input value={contact.whatsapp} onChange={event => updateContact('whatsapp', event.target.value)} /></Field><Field label="地址"><Input.TextArea rows={2} value={contact.address} onChange={event => updateContact('address', event.target.value)} /></Field><Field label="工作时间"><Input value={contact.hours} onChange={event => updateContact('hours', event.target.value)} /></Field></div>}<Toggle label="显示社交媒体" value={section.showSocials !== false} onClick={() => onChange({ showSocials: section.showSocials === false })} />{section.showSocials !== false && <div className="space-y-3">{socials.map((social, index) => <div key={social.id} className="rounded-xl border bg-secondary/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">{social.label || `社交媒体 ${index + 1}`}</span><EditorSwitch value={social.visible} onChange={visible => onChange({ socialLinks: socials.map(item => item.id === social.id ? { ...item, visible } : item) })} /></div><div className="grid gap-2"><Input value={social.label} placeholder="LinkedIn" onChange={event => onChange({ socialLinks: socials.map(item => item.id === social.id ? { ...item, label: event.target.value } : item) })} /><Input value={social.url} placeholder="https://..." onChange={event => onChange({ socialLinks: socials.map(item => item.id === social.id ? { ...item, url: event.target.value } : item) })} /></div></div>)}<button onClick={() => onChange({ socialLinks: [...socials, { id: newId(), platform: 'website', label: '新媒体', url: '', visible: true }] })} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" />添加社交媒体</button></div>}</div>;
};
const Field = ({ label, children }: { label: string; children: React.ReactNode; normal?: boolean }) => <label className="block"><span className="mb-2 block text-xs font-normal text-muted-foreground">{label}</span>{children}</label>;
const Toggle = ({ label, value, onClick }: { label: string; value: boolean; onClick: () => void }) => <div className="flex w-full items-center justify-between border-b py-2 text-sm"><span>{label}</span><EditorSwitch value={value} onChange={() => onClick()} /></div>;
const Modal = EditorModal;
const languageLabel = (code: string) => ({ zh: '中文', en: '英文', bs: '波斯尼亚语' }[code] || code);
const languageOptions = [['zh', '中文'], ['en', '英文'], ['bs', '波斯尼亚语']].map(([value, label]) => ({ value, label }));
export default Editor;
