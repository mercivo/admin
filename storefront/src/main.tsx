import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, Pagination } from 'antd';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, Globe2, Mail, MapPin, Menu, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import './runtime.css';
import './seo.css';
import './unavailable.css';
import { AntSelect } from './controls';
import { StorefrontModal } from './StorefrontModal';
import { antdLocaleFor, normalizeLocaleCode, platformMessages, requestedPlatformLocale } from './i18n-runtime';
import SiteRenderer from '../../frontend/src/pages/SiteEditor/SiteRenderer';
import { normalizeEditorConfig } from '../../frontend/src/pages/SiteEditor/schema';
import type { Product as RendererProduct, ProductCategory as RendererCategory } from '../../frontend/src/types';
import { languageDisplayName } from '../../frontend/src/utils/languageDisplayName';
import './tailwind.css';

type Product = { id: string; nameZh: string; description?: string; seoTitle?: string; seoDescription?: string; seoImage?: string; sku?: string; price: string; basePrice?: number; priceVisible?: boolean; priceSource?: string; moq: number; img: string; images?: string[]; hot: boolean; badge?: string; likeCount?: number; tags?: string[]; category: string; variants?: Array<{ id?: string; specification: string; option: string; stock: number; surcharge: number }> };
type ProductCategory = { code: string; label: string; parentCode?: string | null; sort: number };
type SeoConfig = { title?: string; description?: string; keywords?: string; shareImage?: string; canonicalUrl?: string; robots?: string };
type PublishedSite = { siteId: string; versionId: string; version: number; locale?: string; site: { name: string; slug: string; logoUrl?: string; defaultLanguage: string; supportedLanguages?: string[]; defaultCurrency: string; currencySymbol?: string; guestAccessEnabled?: boolean; guestPriceMode?: 'base' | 'hidden' | 'percentage' }; config: Record<string, unknown>; seo?: SeoConfig; products: Product[]; categories?: ProductCategory[]; i18n?: { sourceLocale: string; locales: string[]; messages: Record<string, Record<string, string>> } };
type PublicErrorCode = 'SITE_NOT_FOUND_OR_UNPUBLISHED' | 'CONTACT_NAME_REQUIRED' | 'CONTACT_METHOD_REQUIRED' | 'PURCHASE_REQUIREMENTS_REQUIRED' | 'INQUIRY_SUBMIT_FAILED' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
class PublicApiError extends Error { constructor(readonly errorCode: PublicErrorCode, message: string) { super(message); } }
type FormFieldKey = 'name' | 'contact' | 'email' | 'company' | 'phone' | 'country' | 'requirements';
type FormField = { key: FormFieldKey; label: string; enabled: boolean; required: boolean };
type SiteInfo = { brandLogoUrl?: string; contactDetails: { email: string; phone: string; whatsapp: string; address: string; hours: string }; contactLabels?: { email: string; phone: string; whatsapp: string; address: string; hours: string }; contactItems?: Array<{ id: string; label: string; content: string }>; contactModalTitle?: string; contactModalSubtitle?: string };
type EditorSection = { id?: string; type: string; visible?: boolean; title?: string; eyebrow?: string; logoUrl?: string; subtitle?: string; copyrightText?: string; buttonText?: string; secondaryButtonText?: string; buttonAction?: string; secondaryButtonAction?: string; showButton?: boolean; imageUrl?: string; imageUrls?: string[]; backgroundImageUrl?: string; backgroundColor?: string; backgroundOpacity?: number; sectionBackgroundImage?: string; count?: number; columns?: number; showPrice?: boolean; showMoq?: boolean; showEyebrow?: boolean; showSecondaryButton?: boolean; showTrustBar?: boolean; showStats?: boolean; showContact?: boolean; links?: string[]; navItems?: Array<{ id: string; label: string; targetId: string }>; showCategories?: boolean; formFields?: FormField[]; stats?: Array<{ id: string; value: string; label: string }>; trustItems?: Array<{ id: string; title: string; description: string }>; promiseTitle?: string; promiseText?: string; qualityBadgeText?: string; socialLinks?: Array<{ id: string; platform: string; label: string; url: string }>; contactDetails?: { email: string; phone: string; whatsapp: string; address: string; hours: string } };
type TranslationDescriptor = { key: string; pageId?: string; componentId?: string; componentType?: string };
const defaultFormFields: FormField[] = [{ key: 'name', label: '联系人', enabled: true, required: true }, { key: 'contact', label: '联系方式', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }];
const defaultHeroTrustItems = [{ id: 'quality', title: '品质保障', description: '严格质检与稳定品质' }, { id: 'service', title: '专业服务', description: '一对一采购咨询' }, { id: 'customization', title: '灵活定制', description: '支持品牌与包装定制' }, { id: 'reputation', title: '全球口碑', description: '服务海外品牌客户' }];
const inquiryFormFields = (configured: FormField[] = []) => [
  ...defaultFormFields.map(required => ({ ...required, label: configured.find(field => field.key === required.key)?.label || required.label })),
  ...configured.filter(field => !defaultFormFields.some(required => required.key === field.key) && !['email', 'phone'].includes(field.key)),
];
const anchorId = (item?: EditorSection, fallback?: string) => item?.id ? `section-${item.id}` : fallback;
const productSummary = (value?: string) => {
  if (!value) return '-';
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent?.replace(/\s+/g, ' ').trim() || '-';
};
const pathHosts = new Set((import.meta.env.VITE_STOREFRONT_PATH_HOSTS || 'site.aihubflux.com').split(',').map((host: string) => host.trim().toLowerCase()).filter(Boolean));
const pathSegments = location.pathname.split('/').filter(Boolean);
const pathSite = pathHosts.has(location.hostname.toLowerCase()) && pathSegments[0] && pathSegments[0] !== 'products' ? pathSegments[0] : null;
const querySite = new URLSearchParams(location.search).get('site') || pathSite;
const siteBasePath = pathSite ? `/${encodeURIComponent(pathSite)}` : '';
const storefrontPathname = () => pathSite ? `/${location.pathname.split('/').filter(Boolean).slice(1).join('/')}` : location.pathname;
const routeProductId = () => {
  const match = storefrontPathname().match(/^\/products\/([^/]+)\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
};
const api = async <T,>(path: string, init?: RequestInit): Promise<T> => { let res: Response; try { res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } }); } catch { throw new PublicApiError('NETWORK_ERROR', 'Network request failed'); } const body = await res.json().catch(() => ({})); if (!res.ok) throw new PublicApiError(body.errorCode || (res.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'UNKNOWN_ERROR'), Array.isArray(body.message) ? body.message.join('; ') : body.message || 'Request failed'); return body.data as T; };
const legacyImageOrigin = 'https://image.aihubflux.com/';
const gcsImageOrigin = 'https://storage.googleapis.com/mercivo-images-753805870951/';
const imageUrl = (id: string) => id.startsWith(legacyImageOrigin)
  ? `${gcsImageOrigin}${id.slice(legacyImageOrigin.length)}`
  : /^(?:https?:|data:|blob:|\/)/i.test(id)
    ? id
    : `https://images.unsplash.com/${id}?w=900&h=700&fit=max&auto=format`;
const formatPrice = (price: string, currency = 'CNY', configuredSymbol?: string) => {
  if (!price) return '-';
  if (/^[¥$€£]/.test(price) || /[A-Z]{3}/.test(price)) return price;
  const symbol = configuredSymbol || ({ CNY: '¥', BAM: 'KM', USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[currency];
  return symbol ? `${symbol}${price}` : `${currency} ${price}`;
};
const contrastColor = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b > .42 ? '#17231f' : '#ffffff';
};
const colorWithOpacity = (hex: string, opacity = 100) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;
  const rgb = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16)).join(',');
  return `rgba(${rgb},${Math.min(100, Math.max(0, opacity)) / 100})`;
};
const setMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
};
const applySeo = (data: PublishedSite, selectedProductId = routeProductId()) => {
  const seo = data.seo || {};
  const productId = selectedProductId;
  const product = productId ? data.products.find(item => item.id === productId) : undefined;
  const locale = data.locale || data.site.defaultLanguage;
  const currentMessages = data.i18n?.messages?.[locale] || {};
  const sourceMessages = data.i18n?.messages?.[data.site.defaultLanguage] || data.i18n?.messages?.[data.i18n?.sourceLocale || 'zh_CN'] || {};
  const translated = (key: string, fallback: string) => currentMessages[key] || sourceMessages[key] || fallback;
  const sections = ((data.config.pages as Record<string, { sections?: EditorSection[] }> | undefined)?.home?.sections || []);
  const header = sections.find(item => item.type === 'header'); const footer = sections.find(item => item.type === 'footer');
  const titleSection = header || footer; const siteName = titleSection?.id ? translated(`editor:home:${titleSection.id}:title`, titleSection.title || data.site.name) : data.site.name;
  const title = product ? `${translated(`product:${product.id}:name`, product.nameZh)}｜${siteName}` : (translated('seo:title', seo.title || '') || siteName);
  const description = product ? translated(`product:${product.id}:description`, product.description || '') : translated('seo:description', seo.description || '');
  const canonical = product ? `${location.origin}${location.pathname}` : (seo.canonicalUrl || `${location.origin}${location.pathname}`);
  const image = product?.seoImage || (product?.img ? imageUrl(product.img) : '') || seo.shareImage || (data.products[0]?.img ? imageUrl(data.products[0].img) : '');
  document.title = title;
  document.documentElement.lang = normalizeLocaleCode(locale).replace('_', '-');
  setMeta('meta[name="description"]', { name: 'description', content: description });
  setMeta('meta[name="robots"]', { name: 'robots', content: seo.robots || 'index,follow,max-image-preview:large' });
  if (seo.keywords) setMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords });
  setMeta('meta[property="og:type"]', { property: 'og:type', content: product ? 'product' : 'website' });
  setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  if (image) {
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  }
  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink); }
  canonicalLink.href = canonical;
  let schema = document.head.querySelector<HTMLScriptElement>('script[data-storefront-schema]');
  if (!schema) { schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.dataset.storefrontSchema = 'true'; document.head.appendChild(schema); }
  schema.textContent = JSON.stringify(product ? { '@context': 'https://schema.org', '@type': 'Product', name: translated(`product:${product.id}:name`, product.nameZh), description, sku: product.sku, image: image ? [image] : undefined, brand: { '@type': 'Brand', name: siteName } } : { '@context': 'https://schema.org', '@type': 'Organization', name: siteName, url: canonical, description, ...(image ? { logo: image } : {}) });
};

const MercivoLogo = () => <div className="unavailable-brand" aria-label="Mercivo">
  <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="url(#unavailableBrandGradient)" />
    <defs><linearGradient id="unavailableBrandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#A899FF" /><stop offset="1" stopColor="#7C6EF5" /></linearGradient></defs>
    <path d="M7 22V10L12.5 17L16 10L19.5 17L25 10V22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 10L19 7L22 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
  <span>Mercivo</span>
</div>;

const ContactInfo = ({ info }: { info: SiteInfo }) => <div className="contact-info-layer">{(info.contactItems || []).map(item => <span key={item.id}>{item.label ? `${item.label}：` : ''}{item.content || '-'}</span>)}</div>;

const FooterDetails = ({ navItems, contactItems, quickLabel, contactLabel }: { navItems: NonNullable<EditorSection['navItems']>; contactItems: NonNullable<SiteInfo['contactItems']>; quickLabel: string; contactLabel: string }) => {
  const rowCount = Math.max(navItems.length, contactItems.length);
  return <div className="footer-details">
    <strong className="footer-quick-heading">{quickLabel}</strong>
    <strong className="footer-contact-heading">{contactLabel}</strong>
    {Array.from({ length: rowCount }, (_, index) => <React.Fragment key={index}>
      {navItems[index] ? <a className="footer-nav-item" href={`#section-${navItems[index].targetId}`}>{navItems[index].label}</a> : <span aria-hidden="true" />}
      {contactItems[index] ? <span className="footer-contact-item">{contactItems[index].label ? `${contactItems[index].label}：` : ''}{contactItems[index].content || '-'}</span> : <span aria-hidden="true" />}
    </React.Fragment>)}
  </div>;
};

const ContactModal = ({ open, onClose, info, title, subtitle, themeColor }: { open: boolean; onClose: () => void; info: SiteInfo; title: string; subtitle: string; themeColor: string }) => {
  if (!open) return null;
  const contact = info.contactDetails;
  const labels = { email: '邮箱', phone: '电话', whatsapp: 'WhatsApp', address: '联系地址', hours: '工作时间', ...info.contactLabels };
  const legacyItems = (Object.keys(contact) as Array<keyof typeof contact>).filter(key => contact[key]).map(key => ({ id: `legacy-${key}`, label: labels[key], content: contact[key] }));
  const items = Array.isArray(info.contactItems) ? info.contactItems : legacyItems;
  return <StorefrontModal open title={title} description={contact.hours || subtitle} onCancel={onClose} footer={null} width={460} style={{ '--theme': themeColor, '--theme-contrast': contrastColor(themeColor) } as React.CSSProperties} styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
      <div className="contact-modal-body storefront-modal-body">
        <p className="contact-modal-note">{subtitle}</p>
        {items.map(item => <div className="contact-modal-card" key={item.id}><span className="contact-modal-icon"><MessageCircle /></span><div><small>{item.label || '-'}</small><strong>{item.content || '-'}</strong></div></div>)}
      </div>
  </StorefrontModal>;
};

function App() {
  const [site, setSite] = useState<PublishedSite | null>(null);
  const [error, setError] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [productCategory, setProductCategory] = useState('__all__');
  const [productSubcategory, setProductSubcategory] = useState('__all__');
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [heroIndex, setHeroIndex] = useState(0);
  const [language, setLanguage] = useState('');
  const [activeProductId, setActiveProductId] = useState<string | null>(() => routeProductId());
  const [inquiry, setInquiry] = useState<Record<FormFieldKey, string>>({ name: '', contact: '', email: '', company: '', phone: '', country: '', requirements: '' });
  const [inquiryState, setInquiryState] = useState<'idle' | 'submitting' | 'success' | 'error' | 'validation'>('idle');
  const [inquiryErrorCode, setInquiryErrorCode] = useState<PublicErrorCode>('INQUIRY_SUBMIT_FAILED');
  const loadSite = () => { const params = new URLSearchParams(); if (querySite) params.set('site', querySite); const requested = new URLSearchParams(location.search).get('lang'); if (requested) params.set('lang', requested); return api<PublishedSite>(`/api/v1/public/site${params.size ? `?${params}` : ''}`).then(data => { setSite(data); setLanguage(normalizeLocaleCode(data.locale || data.site.defaultLanguage)); applySeo(data, routeProductId()); setError(''); }); };
  useEffect(() => { loadSite().catch(err => setError(err instanceof PublicApiError ? err.errorCode : 'UNKNOWN_ERROR')); }, [querySite]);
  useEffect(() => { const syncRoute = () => { const productId = routeProductId(); setActiveProductId(productId); if (site) applySeo(site, productId); }; window.addEventListener('popstate', syncRoute); return () => window.removeEventListener('popstate', syncRoute); }, [site]);
  const submitInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (['name', 'contact', 'requirements'].some(key => !inquiry[key as FormFieldKey].trim())) { setInquiryState('validation'); return; }
    setInquiryState('submitting');
    try {
      await api(`/api/v1/public/inquiries${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify({ type: 'inquiry', ...inquiry, sourcePage: location.href }) });
      setInquiry({ name: '', contact: '', email: '', company: '', phone: '', country: '', requirements: '' }); setInquiryState('success');
    } catch (err) { setInquiryErrorCode(err instanceof PublicApiError ? err.errorCode : 'UNKNOWN_ERROR'); setInquiryState('error'); }
  };
  const t = (key: string, fallback: string) => { const resolvedKey = key === 'system:inquiry.error' ? `system:apiErrors.${inquiryErrorCode}` : key; return site?.i18n?.messages?.[language]?.[resolvedKey] || site?.i18n?.messages?.[site.site.defaultLanguage]?.[resolvedKey] || site?.i18n?.messages?.[site.i18n?.sourceLocale || 'zh_CN']?.[resolvedKey] || fallback; };
  const changeLanguage = (next: string) => {
    const normalized = normalizeLocaleCode(next);
    setLanguage(normalized);
    const url = new URL(location.href);
    url.searchParams.set('lang', normalized);
    history.replaceState(null, '', url);
    const params = new URLSearchParams();
    if (querySite) params.set('site', querySite);
    params.set('lang', normalized);
    void api<PublishedSite>(`/api/v1/public/site?${params}`).then(data => {
      const resolved = normalizeLocaleCode(data.locale || normalized);
      setSite(data);
      setLanguage(resolved);
      applySeo({ ...data, locale: resolved }, activeProductId);
    }).catch(() => undefined);
  };
  const editorText = (section: EditorSection | undefined, field: string, fallback = '') => section?.id ? t(`editor:home:${section.id}:${field}`, fallback) : fallback;
  const editorSections = useMemo<EditorSection[]>(() => {
    const pages = site?.config.pages as Record<string, { sections?: EditorSection[] }> | undefined;
    const messages = site?.i18n?.messages?.[language] || {};
    const descriptors = (site?.config.translationDescriptors || []) as TranslationDescriptor[];
    return (pages?.home?.sections?.filter(section => section.visible !== false) || []).map(section => {
      const prefix = `editor:home:${section.id}`;
      const translated = { ...section } as EditorSection;
      const componentDescriptors = descriptors.filter(item => item.pageId === 'home' && item.componentId === section.id);
      if (componentDescriptors.length) componentDescriptors.forEach(descriptor => {
        const value = messages[descriptor.key]; if (!value) return;
        const parts = descriptor.key.split(':'); const field = parts[parts.length - 1];
        if (parts.includes('nav')) translated.navItems = (translated.navItems || section.navItems)?.map(item => item.id === parts[parts.indexOf('nav') + 1] ? { ...item, label: value } : item);
        else if (parts.includes('form')) translated.formFields = (translated.formFields || section.formFields)?.map(item => item.key === parts[parts.indexOf('form') + 1] ? { ...item, label: value } : item);
        else if (parts.includes('stat')) translated.stats = (translated.stats || section.stats)?.map(item => item.id === parts[parts.indexOf('stat') + 1] ? { ...item, label: value } : item);
        else if (parts.includes('trust')) translated.trustItems = (translated.trustItems || section.trustItems || defaultHeroTrustItems).map(item => item.id === parts[parts.indexOf('trust') + 1] ? { ...item, [field]: value } : item);
        else if (parts.includes('social')) translated.socialLinks = (translated.socialLinks || section.socialLinks)?.map(item => item.id === parts[parts.indexOf('social') + 1] ? { ...item, label: value } : item);
        else (translated as Record<string, unknown>)[field] = value;
      }); else {
        for (const field of ['title', 'subtitle', 'eyebrow', 'buttonText', 'secondaryButtonText', 'promiseTitle', 'promiseText', 'qualityBadgeText'] as const) if (translated[field] && messages[`${prefix}:${field}`]) translated[field] = messages[`${prefix}:${field}`];
        translated.navItems = section.navItems?.map(item => ({ ...item, label: messages[`${prefix}:nav:${item.id}:label`] || item.label }));
        translated.formFields = section.formFields?.map(item => ({ ...item, label: messages[`${prefix}:form:${item.key}:label`] || item.label }));
        translated.socialLinks = section.socialLinks?.map(item => ({ ...item, label: messages[`${prefix}:social:${item.id}:label`] || item.label }));
        translated.stats = section.stats?.map(item => ({ ...item, label: messages[`${prefix}:stat:${item.id}:label`] || item.label }));
        translated.trustItems = (section.trustItems || (section.type === 'hero' ? defaultHeroTrustItems : [])).map(item => ({ ...item, title: messages[`${prefix}:trust:${item.id}:title`] || item.title, description: messages[`${prefix}:trust:${item.id}:description`] || item.description }));
      }
      if (section.type === 'footer' && messages[`${prefix}:copyrightText`]) translated.copyrightText = messages[`${prefix}:copyrightText`];
      return translated;
    });
  }, [site, language]);
  const configured = editorSections.length > 0;
  const section = (type: string) => editorSections.find(item => item.type === type);
  const hasSection = (type: string) => !configured || !!section(type);
  const productSection = section('products');
  const heroSection = section('hero');
  const textSection = section('text');
  const formSection = section('form');
  const footerSection = section('footer');
  const contactModalSection = section('contactModal');
  const sectionBackgroundStyle = (value?: EditorSection): React.CSSProperties | undefined => {
    if (!value?.backgroundColor && !value?.sectionBackgroundImage) return undefined;
    const opacity = Math.min(100, Math.max(0, value.backgroundOpacity ?? 100)) / 100;
    const hex = (value.backgroundColor || '#FFFFFF').replace('#', '');
    const rgb = /^[0-9a-f]{6}$/i.test(hex) ? [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)).join(',') : '255,255,255';
    return { backgroundColor: `rgba(${rgb},${opacity})`, ...(value.sectionBackgroundImage ? { backgroundImage: `linear-gradient(rgba(${rgb},${opacity}),rgba(${rgb},${opacity})),url(${value.sectionBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) };
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() => editorSections.forEach(item => {
      const anchor = anchorId(item, item.type);
      const selector = item.type === 'header' ? '.nav' : ['products', 'text', 'form', 'footer', 'hero'].includes(item.type) && anchor ? `#${CSS.escape(anchor)}` : '';
      const element = selector ? document.querySelector<HTMLElement>(selector) : null;
      if (!element) return;
      const style = sectionBackgroundStyle(item);
      element.classList.toggle('site-custom-background', !!style);
      if (style) Object.assign(element.style, style);
    }));
    return () => cancelAnimationFrame(frame);
  }, [editorSections]);
  useEffect(() => { document.documentElement.style.setProperty('--product-columns', String(Math.min(4, Math.max(2, Number(productSection?.columns) || 3)))); }, [productSection?.columns]);
  const siteLanguages = [...new Set((site?.site.supportedLanguages || [site?.site.defaultLanguage || 'zh_CN']).map(normalizeLocaleCode))];
  const themeColor = typeof site?.config.themeColor === 'string' ? site.config.themeColor : '#1A3D2E';
  const siteInfo = useMemo(() => {
    const source = site?.config.siteInfo as SiteInfo | undefined;
    if (!source) return undefined;
    const messages = site?.i18n?.messages?.[language] || {};
    const legacyLabels = { email: '邮箱', phone: '电话', whatsapp: 'WhatsApp', address: '联系地址', hours: '工作时间', ...source.contactLabels };
    const legacyItems = (Object.keys(source.contactDetails) as Array<keyof typeof source.contactDetails>).filter(field => source.contactDetails[field]).map(field => ({ id: `legacy-${field}`, label: legacyLabels[field], content: source.contactDetails[field] }));
    const contactItems = (Array.isArray(source.contactItems) ? source.contactItems : legacyItems).map(item => ({ ...item, label: messages[`editor:siteInfo:contact:${item.id}:label`] || item.label, content: messages[`editor:siteInfo:contact:${item.id}:content`] || item.content }));
    return { ...source, contactModalTitle: messages['editor:siteInfo:contactModalTitle'] || source.contactModalTitle, contactModalSubtitle: messages['editor:siteInfo:contactModalSubtitle'] || source.contactModalSubtitle, contactItems };
  }, [site, language]);
  const featured = useMemo(() => site?.products || [], [site]);
  const heroImages = useMemo(() => heroSection?.sectionBackgroundImage ? [heroSection.sectionBackgroundImage] : heroSection?.imageUrls?.length ? heroSection.imageUrls : featured.slice(0, 5).map(product => imageUrl(product.img)), [heroSection?.sectionBackgroundImage, heroSection?.imageUrls, featured]);
  useEffect(() => { setHeroIndex(0); if (heroImages.length < 2) return; const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroImages.length), 5000); return () => window.clearInterval(timer); }, [heroImages]);
  const categoryTree = useMemo(() => {
    const entries = site?.categories || [];
    return entries.filter(item => !item.parentCode).map(parent => ({ ...parent, children: entries.filter(item => item.parentCode === parent.code) }));
  }, [site?.categories]);
  const activePrimary = categoryTree.find(item => item.code === productCategory);
  const visibleProducts = useMemo(() => {
    if (productCategory === '__all__') return featured;
    if (productSubcategory !== '__all__') return featured.filter(item => item.category === productSubcategory);
    const codes = new Set([productCategory, ...(activePrimary?.children || []).map(item => item.code)]);
    return featured.filter(item => codes.has(item.category));
  }, [activePrimary, featured, productCategory, productSubcategory]);
  const pagedProducts = visibleProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize);
  useEffect(() => { setProductPage(1); }, [productCategory, productSubcategory, productPageSize, featured]);
  useEffect(() => {
    const productRoot = document.getElementById(anchorId(productSection, 'products') || 'products');
    if (!productRoot) return;
    const badgeConstants = t('constant:product.badges', '').split(';').map(value => value.trim());
    const badgeNames: Record<string, string> = { new: badgeConstants[0] || '新品', hot: badgeConstants[1] || '爆品', bestseller: badgeConstants[2] || '热销', recommended: badgeConstants[3] || '推荐' };
    productRoot.querySelectorAll<HTMLElement>('.product').forEach((card, index) => {
      const product = pagedProducts[index];
      if (!product) return;
      const description = card.querySelector<HTMLElement>('.product-info>p');
      if (description) { description.classList.add('product-rich-description'); description.textContent = productSummary(product.description); }
      card.querySelector('.product-tags')?.remove();
      const tags = document.createElement('div');
      tags.className = 'product-tags';
      const translatedTags = t(`product:${product.id}:tags`, '').split(';').map(value => value.trim()).filter(Boolean);
      product.tags?.forEach((value, tagIndex) => { const tag = document.createElement('span'); tag.textContent = translatedTags[tagIndex] || t(`product:${product.id}:tag:${tagIndex}`, value); tags.appendChild(tag); });
      description?.after(tags);
      const image = card.querySelector('.product-image');
      image?.querySelector('.product-like')?.remove();
      if (image) { const likes = document.createElement('span'); likes.className = 'product-like'; likes.textContent = `♥ ${product.likeCount || 0}`; image.appendChild(likes); }
      const badge = image?.querySelector<HTMLElement>(':scope>span:not(.product-like)');
      const badgeFallback = badgeNames[product.badge || ''] || (product.hot ? badgeNames.hot : '');
      const badgeText = badgeFallback;
      if (badge) { badge.textContent = badgeText; badge.style.display = badgeText ? '' : 'none'; }
      else if (image && badgeText) { const mark = document.createElement('span'); mark.textContent = badgeText; image.appendChild(mark); }
      const moq = card.querySelector<HTMLElement>('.product-info footer span');
      if (moq) { moq.textContent = `${t('constant:product.moq', '最低起订量')} ${product.moq}`; moq.style.display = productSection?.showMoq ? '' : 'none'; }
    });
  }, [pagedProducts, productSection?.showMoq, productSection?.id, language]);
  const categoryName = (code: string) => {
    const entry = site?.categories?.find(item => item.code === code);
    if (!entry) return code;
    const parent = entry.parentCode ? site?.categories?.find(item => item.code === entry.parentCode) : null;
    return `${parent ? `${t(`category:${parent.code}:label`, parent.label)} / ` : ''}${t(`category:${entry.code}:label`, entry.label)}`;
  };
  const runAction = (action?: string) => {
    if (!action) return;
    if (action === 'contactModal' || action === contactModalSection?.id) return setContactOpen(true);
    const target = editorSections.find(item => item.id === action || item.type === action);
    if (target?.id) document.getElementById(`section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const platform = platformMessages(requestedPlatformLocale());
  if (error) return <main className="unavailable-page">
    <section className="unavailable-card" role="alert">
      <MercivoLogo />
      <div className="unavailable-icon"><Globe2 /></div>
      <h1>{platform.unavailable}</h1>
      <p>{platform.unavailableDescription}</p>
      <p className="unavailable-help">{platform.administratorHelp}</p>
      <button type="button" onClick={() => { setError(''); loadSite().catch(err => setError(err instanceof PublicApiError ? err.errorCode : 'UNKNOWN_ERROR')); }}><span>{platform.retry}</span><ArrowRight /></button>
      <small>{platform.support}</small>
    </section>
  </main>;
  if (!site) return <main className="state"><div className="loader"/><p>{platform.loading}</p></main>;
  const rendererConfig = normalizeEditorConfig(site.config);
  rendererConfig.page = 'home';
  if (editorSections.length) rendererConfig.pages.home = { sections: editorSections as typeof rendererConfig.pages.home.sections };
  if (siteInfo) rendererConfig.siteInfo = {
    ...rendererConfig.siteInfo,
    ...siteInfo,
    contactModalTitle: siteInfo.contactModalTitle || rendererConfig.siteInfo.contactModalTitle,
    contactModalSubtitle: siteInfo.contactModalSubtitle || rendererConfig.siteInfo.contactModalSubtitle,
    contactItems: siteInfo.contactItems || [],
  };
  const rendererCategories: RendererCategory[] = (site.categories || []).filter(item => !item.parentCode).map(parent => ({ ...parent, status: 'enabled', remark: '', children: (site.categories || []).filter(item => item.parentCode === parent.code).map(child => ({ ...child, status: 'enabled', remark: '' })) }));
  const submitRendererInquiry = async (values: Record<string, string>) => {
    if (['name', 'contact', 'requirements'].some(key => !String(values[key] || '').trim())) throw new Error('validation');
    await api(`/api/v1/public/inquiries${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify({ type: 'inquiry', ...values, sourcePage: location.href }) });
  };
  const changeProduct = (productId: string | null) => {
    const url = new URL(location.href);
    url.pathname = productId ? `${siteBasePath}/products/${encodeURIComponent(productId)}` : `${siteBasePath}/`;
    history.pushState({ productId }, '', url);
    setActiveProductId(productId);
    applySeo(site, productId);
  };
  return <SiteRenderer config={rendererConfig} products={site.products as unknown as RendererProduct[]} categories={rendererCategories} currency={site.site.currencySymbol || site.site.defaultCurrency} brandLogoUrl={site.site.logoUrl || siteInfo?.brandLogoUrl || ''} language={language} supportedLanguages={siteLanguages} initialProductId={activeProductId} onProductChange={changeProduct} onLanguageChange={changeLanguage} onSubmitInquiry={submitRendererInquiry} translate={t} guestAccessEnabled={site.site.guestAccessEnabled} guestPriceMode={site.site.guestPriceMode} />;
  /* Legacy renderer retained temporarily for migration reference.
  const themeOpacity = typeof site.config.themeOpacity === 'number' ? site.config.themeOpacity : 100;
  const headerSection = section('header');
  return <div style={{ '--theme': colorWithOpacity(themeColor, themeOpacity), '--theme-contrast': contrastColor(themeColor) } as React.CSSProperties}>
    {hasSection('header') && headerSection?.showEyebrow !== false && !!headerSection?.eyebrow && <div className="site-announcement">{headerSection.eyebrow}</div>}
    {hasSection('header') && <header className="nav"><a className="brand" href="#top">{section('header')?.logoUrl || site.site.logoUrl || siteInfo?.brandLogoUrl ? <img src={section('header')?.logoUrl || site.site.logoUrl || siteInfo?.brandLogoUrl} alt={section('header')?.title || site.site.name} /> : <><Globe2/> {section('header')?.title || site.site.name}</>}</a><nav>{section('header')?.navItems?.map(item=><a key={item.id} href={`#section-${item.targetId}`}>{item.label}</a>)}</nav><div className="language-control"><Globe2/><AntSelect className="language-select" value={language || siteLanguages[0] || 'zh_CN'} onChange={changeLanguage} options={(siteLanguages.length ? siteLanguages : ['zh_CN']).map(code => ({ value: code, label: languageDisplayName(code, language || site.site.defaultLanguage) }))} /></div><button className="icon"><Menu/></button></header>}
    <main id="top">
      {hasSection('hero') && <section id={anchorId(heroSection)} className="hero"><div className="hero-carousel">{heroImages.map((url, index) => <img key={`${url}-${index}`} className={index === heroIndex ? 'active' : ''} src={url} alt="" />)}<div className="hero-shade"/><div className="hero-copy"><h1>{editorText(heroSection, 'title', heroSection?.title || '为您的品牌打造高品质产品')}</h1><p>{editorText(heroSection, 'subtitle', heroSection?.subtitle || '工厂直供、品牌定制与可靠的全球交付，由专业外贸团队全程服务。')}</p><div className="actions">{heroSection?.showButton !== false && <button className="primary" onClick={() => runAction(heroSection?.buttonAction || 'products')}>{editorText(heroSection, 'buttonText', heroSection?.buttonText || '查看产品')}<ArrowRight /></button>}{heroSection?.showSecondaryButton !== false && <button className="secondary" onClick={() => runAction(heroSection?.secondaryButtonAction || 'contactModal')}>{editorText(heroSection, 'secondaryButtonText', heroSection?.secondaryButtonText || '获取报价')}</button>}</div>{heroSection?.showTrustBar !== false && <div className="trust">{(heroSection?.trustItems || defaultHeroTrustItems).map(item => <span key={item.id}><ShieldCheck/><span><strong>{item.title}</strong><small>{item.description}</small></span></span>)}</div>}</div>{heroImages.length > 1 && <><button className="carousel-arrow prev" onClick={() => setHeroIndex(index => (index - 1 + heroImages.length) % heroImages.length)}><ChevronLeft /></button><button className="carousel-arrow next" onClick={() => setHeroIndex(index => (index + 1) % heroImages.length)}><ChevronRight /></button><div className="carousel-dots">{heroImages.map((_, index) => <button className={index === heroIndex ? 'active' : ''} key={index} onClick={() => setHeroIndex(index)} />)}</div></>}</div></section>}
      {hasSection('products') && <section className="section" id={anchorId(productSection, 'products')}>
        <div className="section-head"><div><span className="eyebrow">{editorText(productSection, 'eyebrow', productSection?.eyebrow || '')}</span><h2>{editorText(productSection, 'title', productSection?.title || '')}</h2></div><p>{editorText(productSection, 'subtitle', productSection?.subtitle || '')}</p></div>
        {productSection?.showCategories !== false && categoryTree.length > 0 && <div className="category-navigation"><h3 className="category-filter-title">{t('constant:storefront.categoryFilter', '类别筛选')}</h3><div className="category-selects"><AntSelect className="category-select" value={productCategory} onChange={value => { setProductCategory(value); setProductSubcategory('__all__'); }} options={[{ value: '__all__', label: t('category:__all__:label', '全部商品') }, ...categoryTree.map(category => ({ value: category.code, label: t(`category:${category.code}:label`, category.label) }))]} />{activePrimary?.children.length ? <AntSelect className="category-select" value={productSubcategory} onChange={setProductSubcategory} options={[{ value: '__all__', label: `${t('category:__all__:label', '全部商品')} ${t(`category:${activePrimary.code}:label`, activePrimary.label)}` }, ...activePrimary.children.map(category => ({ value: category.code, label: t(`category:${category.code}:label`, category.label) }))]} /> : null}</div><div className="category-tabs primary-tabs"><button className={productCategory === '__all__' ? 'active' : ''} onClick={() => { setProductCategory('__all__'); setProductSubcategory('__all__'); }}>{t('category:__all__:label', '全部商品')}</button>{categoryTree.map(category => <button className={category.code === productCategory ? 'active' : ''} key={category.code} onClick={() => { setProductCategory(category.code); setProductSubcategory('__all__'); }}>{t(`category:${category.code}:label`, category.label)}</button>)}</div>{activePrimary?.children.length ? <div className="category-tabs secondary-tabs"><button className={productSubcategory === '__all__' ? 'active' : ''} onClick={() => setProductSubcategory('__all__')}>{t('category:__all__:label', '全部商品')}</button>{activePrimary.children.map(category => <button className={category.code === productSubcategory ? 'active' : ''} key={category.code} onClick={() => setProductSubcategory(category.code)}>{t(`category:${category.code}:label`, category.label)}</button>)}</div> : null}</div>}
        {productSection?.showCategories !== false && categoryTree.length === 0 && <div className="category-empty">{t('system:empty.categories', '暂无分类')}</div>}
        <div className="grid">{pagedProducts.map(product => { const name = t(`product:${product.id}:name`, product.nameZh); const description = t(`product:${product.id}:description`, product.description || ''); const href = `${siteBasePath}/products/${product.id}?lang=${encodeURIComponent(language)}`; const hotBadge = t('constant:product.badges', '新品;爆品;热销;推荐').split(';')[1] || '爆品'; return <article className="product" key={product.id}><a className="product-detail-link" href={href}/><div className="product-image"><img src={imageUrl(product.img)} alt={name}/>{product.hot && <span>{hotBadge}</span>}</div><div className="product-info"><small>{categoryName(product.category)}</small><h3>{name}</h3><p>{productSummary(description)}</p><footer>{product.priceVisible !== false && <strong>{formatPrice(product.price, site.site.defaultCurrency)}</strong>}<span>{t('constant:product.moq', '最低起订量')} {product.moq}</span></footer></div></article>; })}</div>
        {!visibleProducts.length ? <div className="product-empty">{t('system:empty.products','当前分类暂无商品')}</div> : <ConfigProvider locale={antdLocaleFor(language, site.site.defaultLanguage)} theme={{ token: { colorPrimary: themeColor } }}><Pagination className="product-pagination" current={productPage} pageSize={productPageSize} total={visibleProducts.length} showSizeChanger pageSizeOptions={[10, 20, 50]} onChange={(nextPage, nextPageSize) => { setProductPage(nextPageSize === productPageSize ? nextPage : 1); setProductPageSize(nextPageSize); }} /></ConfigProvider>}
      </section>}
      {hasSection('text') && <section className="about" style={sectionBackgroundStyle(textSection)} id={anchorId(textSection, "about")}><div className="about-content">{textSection?.showEyebrow !== false && <span className="eyebrow">{textSection?.eyebrow || t('system:about.eyebrow','关于我们')}</span>}<h2>{textSection?.title || '不只是供应商，更是您的采购合作伙伴。'}</h2><p className="about-copy">{textSection?.subtitle || '以稳定的产品品质、灵活的定制能力和专业的外贸服务，帮助全球客户高效完成采购。'}</p>{textSection?.showStats !== false && !!textSection?.stats?.length && <div className="about-stats">{textSection.stats.map(item => <div key={item.id}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>}{(textSection?.promiseTitle || textSection?.promiseText) && <div className="about-promise"><strong>{textSection.promiseTitle}</strong><p>{textSection.promiseText}</p></div>}</div><div className="about-media">{textSection?.backgroundImageUrl ? <img src={textSection.backgroundImageUrl} alt={textSection.title || ''} /> : <div className="about-media-placeholder">-</div>}{textSection?.qualityBadgeText && <span className="about-quality-badge">{textSection.qualityBadgeText}</span>}</div></section>}
      {hasSection('form') && <section className={`contact ${formSection?.backgroundImageUrl ? 'has-background' : ''}`} style={formSection?.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(8,20,38,.72),rgba(8,20,38,.72)),url(${formSection.backgroundImageUrl})` } : undefined} id={anchorId(formSection, "contact")}><div>{formSection?.showEyebrow !== false && <span className="eyebrow">{formSection?.eyebrow || t('system:contact.eyebrow','询盘表单')}</span>}<h2>{formSection?.title || t('system:contact.title','与我们的外贸团队联系')}</h2><p>{formSection?.subtitle || t('system:contact.description','提交采购需求，外贸团队将尽快与您联系。')}</p>{siteInfo && <ContactInfo info={siteInfo} />}</div><form className="inquiry-form" onSubmit={submitInquiry}>{inquiryFormFields(formSection?.formFields).map(field => <label key={field.key} className={field.key === 'requirements' ? 'wide' : ''}><span>{field.label} *</span>{field.key === 'requirements' ? <textarea rows={4} required value={inquiry[field.key]} onChange={event => { setInquiryState('idle'); setInquiry({ ...inquiry, [field.key]: event.target.value }); }}/> : <input type="text" required value={inquiry[field.key]} onChange={event => { setInquiryState('idle'); setInquiry({ ...inquiry, [field.key]: event.target.value }); }}/>}</label>)}<button className="primary wide" disabled={inquiryState === 'submitting'} type="submit">{inquiryState === 'submitting' ? t('system:inquiry.submitting','提交中…') : (formSection?.buttonText || t('system:inquiry.submit','提交询盘'))}</button>{inquiryState === 'validation' && <p className="inquiry-feedback error">{t('system:inquiry.validation','请完整填写联系人、联系方式和采购需求。')}</p>}{inquiryState === 'success' && <p className="inquiry-feedback success">{t('system:inquiry.success','询盘已提交，我们将尽快与您联系。')}</p>}{inquiryState === 'error' && <p className="inquiry-feedback error">{t('system:inquiry.error','提交失败，请稍后重试。')}</p>}</form></section>}
    </main>
    {hasSection('footer') && <footer id={anchorId(footerSection)} className="footer"><div className="footer-brand"><strong>{footerSection?.title || site.site.name}</strong><p>{footerSection?.subtitle || t('system:footer.description','为全球客户提供专业采购服务。')}</p>{!!footerSection?.socialLinks?.some(item => item.label.trim()) && <div className="footer-socials">{footerSection.socialLinks.filter(item => item.label.trim()).map(item => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>)}</div>}</div><FooterDetails navItems={footerSection?.navItems || []} contactItems={footerSection?.showContact === false ? [] : siteInfo?.contactItems || []} quickLabel={t('constant:storefront.quickNavigation', '快速导航')} contactLabel={siteInfo?.contactModalTitle || '联系我们'} /><div className="footer-copyright">{footerSection?.copyrightText || `© ${new Date().getFullYear()} ${footerSection?.title || site.site.name}. All rights reserved.`}</div></footer>}
    {siteInfo && <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} info={siteInfo} title={siteInfo.contactModalTitle || t('system:contact.modalTitle','联系我们')} subtitle={siteInfo.contactModalSubtitle || t('system:contact.modalSubtitle','请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。')} themeColor={themeColor} />}
  </div>;
  */
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
