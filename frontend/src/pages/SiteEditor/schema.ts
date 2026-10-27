import type { CSSProperties } from 'react';

export type SectionType = 'header' | 'hero' | 'text' | 'products' | 'form' | 'contactModal' | 'footer';
export type InspectorTab = 'content' | 'style' | 'events';
export type NavItem = { id: string; label: string; targetId: string };
export type FormField = { key: 'name' | 'contact' | 'email' | 'company' | 'phone' | 'country' | 'requirements'; label: string; enabled: boolean; required: boolean };
export type TrustItem = { id: string; title: string; description: string };
export type SocialLink = { id: string; platform: string; label: string; url: string };
export type ContactDetails = { email: string; phone: string; whatsapp: string; address: string; hours: string };
export type ContactLabels = { email: string; phone: string; whatsapp: string; address: string; hours: string };
export type ContactItem = { id: string; label: string; content: string };
export type SiteInfo = { brandLogoUrl: string; contactDetails: ContactDetails; contactLabels: ContactLabels; contactItems: ContactItem[]; contactModalTitle: string; contactModalSubtitle: string };
export type Section = { id: string; type: SectionType; visible: boolean; title: string; eyebrow?: string; logoUrl?: string; subtitle?: string; copyrightText?: string; buttonText?: string; secondaryButtonText?: string; buttonAction?: string; secondaryButtonAction?: string; showButton?: boolean; imageUrl?: string; imageUrls?: string[]; backgroundImageUrl?: string; backgroundColor?: string; backgroundOpacity?: number; sectionBackgroundImage?: string; count?: number; columns?: number; showPrice?: boolean; showMoq?: boolean; showCategories?: boolean; showEyebrow?: boolean; showSecondaryButton?: boolean; showTrustBar?: boolean; showStats?: boolean; showContact?: boolean; formFields?: FormField[]; links?: string[]; navItems?: NavItem[]; stats?: Array<{ id: string; value: string; label: string }>; trustItems?: TrustItem[]; socialLinks?: SocialLink[]; contactDetails?: ContactDetails; promiseTitle?: string; promiseText?: string; qualityBadgeText?: string };
export type PageConfig = { sections: Section[] };
export type TranslationDescriptor = { key: string; path: string; fieldLabel: string; pageId: string; pageName: string; componentId: string; componentType: SectionType; componentName: string; order: number; required: boolean };
export type EditorConfig = { status: 'draft' | 'published'; version: number; page: string; themeColor: string; themeOpacity?: number; siteInfo: SiteInfo; pages: Record<string, PageConfig>; translationDescriptors?: TranslationDescriptor[] };

export type ComponentDefinition = {
  type: SectionType;
  label: string;
  description: string;
  content: string[];
  style: string[];
  events: string[];
  translatable: Array<{ path: string; label: string; required?: boolean }>;
};

export const COMPONENT_DEFINITIONS: Record<SectionType, ComponentDefinition> = {
  header: { type: 'header', label: '页头导航', description: '品牌标识与全站导航', content: ['eyebrow', 'title', 'navItems'], style: ['logoUrl', 'showEyebrow', 'background'], events: ['navItems'], translatable: [{ path: 'eyebrow', label: '眉标文案' }, { path: 'title', label: '品牌名称' }, { path: 'navItems.*.label', label: '导航文案' }] },
  hero: { type: 'hero', label: '首屏横幅', description: '核心卖点与行动入口', content: ['title', 'subtitle', 'eyebrow', 'buttonText', 'secondaryButtonText', 'trustItems'], style: ['showEyebrow', 'showButton', 'showSecondaryButton', 'showTrustBar', 'background'], events: ['buttonAction', 'secondaryButtonAction'], translatable: [{ path: 'title', label: '主标题' }, { path: 'subtitle', label: '说明文字' }, { path: 'eyebrow', label: '眉标文案' }, { path: 'buttonText', label: '主按钮' }, { path: 'secondaryButtonText', label: '次按钮' }, { path: 'trustItems.*.title', label: '服务承诺标题' }, { path: 'trustItems.*.description', label: '服务承诺说明' }] },
  text: { type: 'text', label: '文本内容', description: '品牌故事与数据说明', content: ['title', 'subtitle', 'eyebrow', 'stats', 'promiseTitle', 'promiseText', 'qualityBadgeText'], style: ['showEyebrow', 'showStats', 'backgroundImageUrl', 'background'], events: [], translatable: [{ path: 'title', label: '标题' }, { path: 'subtitle', label: '说明文字' }, { path: 'eyebrow', label: '眉标文案' }, { path: 'stats.*.label', label: '数据标签' }, { path: 'promiseTitle', label: '承诺标题' }, { path: 'promiseText', label: '承诺内容' }, { path: 'qualityBadgeText', label: '品质保证标识' }] },
  products: { type: 'products', label: '产品列表', description: '商品分类与产品陈列', content: ['title', 'subtitle', 'eyebrow', 'buttonText'], style: ['columns', 'showMoq', 'showEyebrow', 'showButton', 'background'], events: ['buttonAction'], translatable: [{ path: 'title', label: '标题' }, { path: 'subtitle', label: '说明文字' }, { path: 'eyebrow', label: '眉标文案' }, { path: 'buttonText', label: '按钮文案' }] },
  form: { type: 'form', label: '询盘表单', description: '收集客户询盘与采购需求', content: ['title', 'subtitle', 'eyebrow', 'buttonText', 'formFields'], style: ['showEyebrow', 'backgroundImageUrl', 'background'], events: ['submit'], translatable: [{ path: 'title', label: '标题' }, { path: 'subtitle', label: '说明文字' }, { path: 'eyebrow', label: '眉标文案' }, { path: 'buttonText', label: '提交按钮' }, { path: 'formFields.*.label', label: '表单字段' }] },
  contactModal: { type: 'contactModal', label: '联系我们', description: '快捷联系信息弹窗', content: ['title', 'subtitle'], style: ['background'], events: [], translatable: [{ path: 'title', label: '区块标题' }, { path: 'subtitle', label: '说明文字' }] },
  footer: { type: 'footer', label: '页脚', description: '导航、联系与版权信息', content: ['title', 'subtitle', 'copyrightText', 'navItems', 'socialLinks'], style: ['showContact', 'background'], events: ['navItems'], translatable: [{ path: 'title', label: '企业名称' }, { path: 'subtitle', label: '企业说明' }, { path: 'copyrightText', label: '版权信息' }, { path: 'navItems.*.label', label: '导航文案' }, { path: 'socialLinks.*.label', label: '社交媒体名称' }] },
};

export const PAGE_NAMES: Record<string, string> = { home: '首页', products: '商品列表页', about: '关于我们', contact: '联系我们' };
export const requiredInquiryFields: FormField[] = [{ key: 'name', label: '联系人', enabled: true, required: true }, { key: 'contact', label: '联系方式', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }];
export const defaultHeroTrustItems = (): TrustItem[] => [{ id: 'quality', title: '品质保障', description: '严格质检与稳定品质' }, { id: 'service', title: '专业服务', description: '一对一采购咨询' }, { id: 'customization', title: '灵活定制', description: '支持品牌与包装定制' }, { id: 'reputation', title: '全球口碑', description: '服务海外品牌客户' }];
export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const isFixedSection = (type: SectionType) => type === 'header' || type === 'footer';

const clampOpacity = (value: number) => Math.min(100, Math.max(0, value));
const colorWithOpacity = (color: string, opacity: number) => {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const rgb = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)).join(',');
  return `rgba(${rgb},${clampOpacity(opacity) / 100})`;
};

export type ResolvedSectionBackground = {
  color: string;
  opacity: number;
  inheritsTheme: boolean;
  usesModuleDefault: boolean;
  defaultLabel: '使用模块默认' | '跟随主题' | '跟随主题·加深';
  image: string;
  scrim?: string;
  style?: CSSProperties;
};

export const resolveSectionBackground = (section: Section, themeColor = '#FFFFFF', themeOpacity = 100): ResolvedSectionBackground => {
  const defaults: Record<SectionType, { color: string; opacity: number; theme: boolean; darken?: boolean; scrim?: string }> = {
    header: { color: '#FFFFFF', opacity: 100, theme: false, scrim: 'rgba(255,255,255,.88)' },
    hero: { color: themeColor, opacity: themeOpacity, theme: true },
    products: { color: '#FFFFFF', opacity: 100, theme: false, scrim: 'rgba(255,255,255,.88)' },
    text: { color: '#F8F6F2', opacity: 100, theme: false, scrim: 'rgba(255,255,255,.82)' },
    form: { color: themeColor, opacity: themeOpacity, theme: true, scrim: 'rgba(8,20,15,.72)' },
    contactModal: { color: '#FFFFFF', opacity: 100, theme: false },
    footer: { color: themeColor, opacity: themeOpacity, theme: true, darken: true, scrim: 'rgba(0,0,0,.55)' },
  };
  const fallback = defaults[section.type];
  const isDefault = section.backgroundColor === undefined && section.backgroundOpacity === undefined;
  const inheritsTheme = isDefault && fallback.theme;
  const usesModuleDefault = isDefault && !fallback.theme;
  const color = section.backgroundColor || fallback.color;
  const opacity = clampOpacity(section.backgroundOpacity ?? fallback.opacity);
  const image = section.sectionBackgroundImage || (section.type === 'form' ? section.backgroundImageUrl || '' : '');
  const baseColor = colorWithOpacity(color, opacity);
  const backgroundColor = fallback.darken ? `color-mix(in srgb,${baseColor} 52%,black)` : baseColor;
  const imageLayer = image ? section.type === 'hero' || !fallback.scrim ? `url(${image})` : `linear-gradient(${fallback.scrim},${fallback.scrim}),url(${image})` : undefined;
  return {
    color,
    opacity,
    inheritsTheme,
    usesModuleDefault,
    defaultLabel: inheritsTheme ? (fallback.darken ? '跟随主题·加深' : '跟随主题') : '使用模块默认',
    image,
    scrim: fallback.scrim,
    style: {
      backgroundColor,
      ...(imageLayer ? {
        backgroundImage: imageLayer,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      } : {}),
    },
  };
};

export const createSection = (type: SectionType): Section => ({
  id: newId(), type, visible: true, title: COMPONENT_DEFINITIONS[type].label,
  ...(type === 'header' ? { eyebrow: '全球交付 · 品质承诺 · 专业定制', title: '品牌名称', showEyebrow: true, navItems: [] } : {}),
  ...(type === 'hero' ? { eyebrow: 'Premium collection 2026', title: '为您的品牌打造高品质产品', subtitle: '工厂直供 · 品牌定制 · 全球交付', buttonText: '查看产品', secondaryButtonText: '获取报价', buttonAction: 'products', secondaryButtonAction: 'contactModal', showButton: true, showEyebrow: true, showSecondaryButton: true, showTrustBar: true, imageUrls: [], trustItems: defaultHeroTrustItems() } : {}),
  ...(type === 'text' ? { eyebrow: 'Our story', title: '内容标题', subtitle: '在这里简洁介绍您的企业、服务或产品。', showEyebrow: true, showStats: true, stats: [{ id: newId(), value: '10+', label: '年行业经验' }, { id: newId(), value: '30+', label: '出口国家' }, { id: newId(), value: '500+', label: '全球客户' }], promiseTitle: '我们的承诺', promiseText: '从样品、生产到交付，提供可追溯的专业服务。', qualityBadgeText: '品质认证' } : {}),
  ...(type === 'products' ? { eyebrow: 'Featured products', title: '精选产品', subtitle: '精选产品与灵活起订量，满足全球品牌的采购需求。', buttonText: '联系我们', buttonAction: 'contactModal', showButton: true, count: 6, columns: 3, showPrice: true, showMoq: true, showCategories: true, showEyebrow: true } : {}),
  ...(type === 'form' ? { eyebrow: 'Start a project', title: '获取专属报价', subtitle: '请填写联系人、联系方式和采购需求，外贸团队将尽快联系您。', buttonText: '提交询盘', showButton: true, showEyebrow: true, formFields: requiredInquiryFields.map(field => ({ ...field })) } : {}),
  ...(type === 'contactModal' ? { title: '联系我们', subtitle: '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。' } : {}),
  ...(type === 'footer' ? { title: '企业名称', subtitle: '为全球客户提供高品质产品与专业采购服务。', copyrightText: `© ${new Date().getFullYear()} 企业名称. All rights reserved.`, links: ['产品', '关于我们', '联系我们', '隐私政策'], socialLinks: [], showContact: true } : {}),
});

export const createPage = (types: SectionType[]): PageConfig => {
  const created = types.map(createSection);
  const sections = [created.find(s => s.type === 'header') || createSection('header'), ...created.filter(s => !isFixedSection(s.type)), created.find(s => s.type === 'footer') || createSection('footer')];
  for (const section of sections.filter(s => s.type === 'header' || s.type === 'footer')) section.navItems = sections.filter(s => ['products', 'text', 'form'].includes(s.type)).map(s => ({ id: newId(), label: COMPONENT_DEFINITIONS[s.type].label, targetId: s.id }));
  return { sections };
};

export const defaultSiteInfo = (): SiteInfo => ({ brandLogoUrl: '', contactModalTitle: '联系我们', contactModalSubtitle: '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。', contactLabels: { email: '邮箱', phone: '电话', whatsapp: 'WhatsApp', address: '联系地址', hours: '工作时间' }, contactDetails: { email: '', phone: '', whatsapp: '', address: '', hours: '' }, contactItems: [] });

const descriptorFor = (pageId: string, pageName: string, section: Section, path: string, fieldLabel: string, order: number, required = false): TranslationDescriptor[] => {
  const base = { pageId, pageName, componentId: section.id, componentType: section.type, componentName: COMPONENT_DEFINITIONS[section.type].label, order, required };
  const dynamicMatch = path.match(/^(navItems|formFields|stats|trustItems|socialLinks)\.\*\.(label|title|description)$/);
  const dynamic = dynamicMatch?.[1] as 'navItems' | 'formFields' | 'stats' | 'trustItems' | 'socialLinks' | undefined;
  if (!dynamic) return [{ ...base, key: `editor:${pageId}:${section.id}:${path}`, path: `pages.${pageId}.sections.${section.id}.${path}`, fieldLabel }];
  const field = dynamicMatch?.[2] || 'label';
  const items = (section[dynamic] || []) as Array<{ id?: string; key?: string; label?: string; title?: string; description?: string; enabled?: boolean; visible?: boolean }>;
  return items.filter(item => dynamic !== 'formFields' || item.enabled !== false).map((item, index) => { const itemId = dynamic === 'formFields' ? item.key : item.id; const token = dynamic === 'navItems' ? 'nav' : dynamic === 'formFields' ? 'form' : dynamic === 'stats' ? 'stat' : dynamic === 'socialLinks' ? 'social' : 'trust'; return { ...base, key: `editor:${pageId}:${section.id}:${token}:${itemId}:${field}`, path: `pages.${pageId}.sections.${section.id}.${dynamic}.${itemId}.${field}`, fieldLabel, order: order * 100 + index }; });
};

export const buildTranslationDescriptors = (config: Pick<EditorConfig, 'pages'>): TranslationDescriptor[] => Object.entries(config.pages).filter(([pageId]) => pageId === 'home').flatMap(([pageId, page], pageIndex) => {
  const isDisplayed = (section: Section, path: string) => {
    if (path === 'eyebrow' && section.showEyebrow === false) return false;
    if (path === 'buttonText' && section.showButton === false) return false;
    if (path === 'secondaryButtonText' && section.showSecondaryButton === false) return false;
    if (path.startsWith('stats.') && section.showStats === false) return false;
    if (path.startsWith('trustItems.') && section.showTrustBar === false) return false;
    return true;
  };
  return page.sections.filter(section => section.visible !== false && section.type !== 'contactModal' && !(section.type === 'header' && pageId !== 'home')).flatMap((section, sectionIndex) => COMPONENT_DEFINITIONS[section.type].translatable.filter(field => isDisplayed(section, field.path)).flatMap((field, fieldIndex) => descriptorFor(pageId, PAGE_NAMES[pageId] || pageId, section, field.path, field.label, pageIndex * 10000 + sectionIndex * 100 + fieldIndex, field.required === true)));
});

export const applyEditorTranslations = (config: EditorConfig, messages: Record<string, string> = {}): EditorConfig => {
  const translated: EditorConfig = {
    ...config,
    siteInfo: { ...config.siteInfo, contactItems: (config.siteInfo.contactItems || []).map(item => ({ ...item })) },
    pages: Object.fromEntries(Object.entries(config.pages).map(([pageId, page]) => [pageId, { ...page, sections: page.sections.map(section => ({ ...section, navItems: section.navItems?.map(item => ({ ...item })), formFields: section.formFields?.map(item => ({ ...item })), stats: section.stats?.map(item => ({ ...item })), trustItems: section.trustItems?.map(item => ({ ...item })), socialLinks: section.socialLinks?.map(item => ({ ...item })) })) }])),
  };
  const descriptors = config.translationDescriptors?.length ? config.translationDescriptors : buildTranslationDescriptors(config);
  descriptors.forEach(descriptor => {
    const value = messages[descriptor.key];
    if (!value || !descriptor.pageId || !descriptor.componentId) return;
    const section = translated.pages[descriptor.pageId]?.sections.find(item => item.id === descriptor.componentId);
    if (!section) return;
    const parts = descriptor.key.split(':');
    const field = parts[parts.length - 1] || '';
    const collection = parts.includes('nav') ? 'navItems' : parts.includes('form') ? 'formFields' : parts.includes('stat') ? 'stats' : parts.includes('trust') ? 'trustItems' : parts.includes('social') ? 'socialLinks' : '';
    if (!collection) { (section as unknown as Record<string, unknown>)[field] = value; return; }
    const token = collection === 'navItems' ? 'nav' : collection === 'formFields' ? 'form' : collection === 'stats' ? 'stat' : collection === 'trustItems' ? 'trust' : 'social';
    const itemId = parts[parts.indexOf(token) + 1];
    const entries = (section as unknown as Record<string, Array<Record<string, unknown>>>)[collection] || [];
    (section as unknown as Record<string, unknown>)[collection] = entries.map(item => String(item[collection === 'formFields' ? 'key' : 'id']) === itemId ? { ...item, [field]: value } : item);
  });
  const info = translated.siteInfo;
  info.contactModalTitle = messages['editor:siteInfo:contactModalTitle'] || info.contactModalTitle;
  info.contactModalSubtitle = messages['editor:siteInfo:contactModalSubtitle'] || info.contactModalSubtitle;
  info.contactItems = (info.contactItems || []).map(item => ({ ...item, label: messages[`editor:siteInfo:contact:${item.id}:label`] || item.label, content: messages[`editor:siteInfo:contact:${item.id}:content`] || item.content }));
  return translated;
};

export const defaultConfig = (): EditorConfig => {
  const base = { status: 'draft' as const, version: 1, page: 'home', themeColor: '#7C6EF5', themeOpacity: 100, siteInfo: defaultSiteInfo(), pages: { home: createPage(['header', 'hero', 'products', 'text', 'form', 'contactModal', 'footer']), products: createPage(['header', 'products', 'footer']), about: createPage(['header', 'text', 'footer']), contact: createPage(['header', 'form', 'footer']) } };
  return { ...base, translationDescriptors: buildTranslationDescriptors(base) };
};

export const normalizeEditorConfig = (raw: Record<string, unknown>): EditorConfig => {
  if (!raw.pages) return defaultConfig();
  const defaults = defaultConfig();
  const value = raw as unknown as EditorConfig;
  value.themeColor = !value.themeColor || value.themeColor.toUpperCase() === '#1A3D2E' ? '#7C6EF5' : value.themeColor;
  value.themeOpacity = Math.min(100, Math.max(0, value.themeOpacity ?? 100));
  const legacySiteInfo = value.siteInfo || defaultSiteInfo();
  const contactSection = Object.values(value.pages).flatMap(page => page.sections || []).find(section => section.type === 'contactModal');
  if (!legacySiteInfo.contactModalTitle?.trim() && contactSection?.title) legacySiteInfo.contactModalTitle = contactSection.title;
  if (!legacySiteInfo.contactModalSubtitle?.trim() && contactSection?.subtitle) legacySiteInfo.contactModalSubtitle = contactSection.subtitle;
  const legacyContactDetails = { ...defaultSiteInfo().contactDetails, ...(legacySiteInfo.contactDetails || {}) };
  const legacyContactLabels = { ...defaultSiteInfo().contactLabels, ...(legacySiteInfo.contactLabels || {}) };
  const contactItems = Array.isArray(legacySiteInfo.contactItems) ? legacySiteInfo.contactItems : (Object.keys(legacyContactDetails) as Array<keyof ContactDetails>).filter(key => legacyContactDetails[key]).map(key => ({ id: `legacy-${key}`, label: legacyContactLabels[key], content: legacyContactDetails[key] }));
  value.siteInfo = { ...defaultSiteInfo(), ...legacySiteInfo, contactLabels: legacyContactLabels, contactDetails: legacyContactDetails, contactItems };
  value.pages = Object.fromEntries(Object.entries(value.pages).map(([id, rawPage]) => {
    const page = rawPage as PageConfig;
    const sections = (page.sections || defaults.pages[id]?.sections || []).filter(section => String(section.type) !== 'image').map(section => ({ ...createSection(section.type), ...section, id: section.id }));
    sections.forEach(section => {
      if (section.navItems) section.navItems = section.navItems.map(item => ({ ...item, label: item.label === '联系表单' ? '询盘表单' : item.label }));
      const legacy = section as Section & Record<string, unknown>;
      delete legacy.categoryFilterTitle;
      delete legacy.productBadgeTitle;
      delete legacy.quickNavigationTitle;
      delete legacy.contactTitle;
    });
    const header = sections.find(s => s.type === 'header') || createSection('header');
    const footer = sections.find(s => s.type === 'footer') || createSection('footer');
    header.visible = true; header.logoUrl = undefined; footer.visible = true; footer.socialLinks = Array.isArray(footer.socialLinks) ? footer.socialLinks.map(({ id: itemId, platform, label, url }) => ({ id: itemId, platform, label, url })) : [];
    if (!footer.copyrightText) footer.copyrightText = `© ${new Date().getFullYear()} ${footer.title || '企业名称'}. All rights reserved.`;
    const normalized = [header, ...sections.filter(s => !isFixedSection(s.type)), footer];
    if (id === 'home' && !normalized.some(section => section.type === 'contactModal')) normalized.splice(normalized.length - 1, 0, createSection('contactModal'));
    normalized.filter(s => s.type === 'hero').forEach(hero => { if (!hero.imageUrls) hero.imageUrls = hero.imageUrl ? [hero.imageUrl] : []; if (!hero.sectionBackgroundImage && hero.imageUrls[0]) hero.sectionBackgroundImage = hero.imageUrls[0]; if (!hero.trustItems?.length) hero.trustItems = defaultHeroTrustItems(); });
    normalized.filter(s => s.type === 'form').forEach(form => { form.showButton = true; form.formFields = requiredInquiryFields.map(required => ({ ...required })); });
    return [id, { sections: normalized }];
  }));
  value.translationDescriptors = buildTranslationDescriptors(value);
  return value;
};
