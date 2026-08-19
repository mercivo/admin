import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Bot, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, Globe2, LogOut, Mail, MapPin, Menu, MessageCircle, Phone, Send, ShieldCheck, Truck, User, X } from 'lucide-react';
import './styles.css';
import './seo.css';
import './unavailable.css';
import { AntSelect } from './controls';

type Product = { id: string; nameEn: string; nameZh: string; description?: string; seoTitle?: string; seoDescription?: string; seoImage?: string; sku?: string; price: string; priceVisible?: boolean; priceSource?: string; moq: number; img: string; hot: boolean; badge?: string; likeCount?: number; tags?: string[]; category: string };
type ProductCategory = { code: string; label: string; parentCode?: string | null; sort: number };
type SeoConfig = { title?: string; description?: string; keywords?: string; shareImage?: string; canonicalUrl?: string; robots?: string };
type PublishedSite = { siteId: string; versionId: string; version: number; site: { name: string; slug: string; defaultLanguage: string; supportedLanguages?: string[]; defaultCurrency: string; guestPriceMode?: 'base' | 'hidden' }; customer?: { id: string; name: string; level: string } | null; config: Record<string, unknown>; seo?: SeoConfig; products: Product[]; categories?: ProductCategory[]; testimonials: Array<{ id: string; name: string; company: string; text: string; rating: number }>; agent?: { name: string } | null };
type TranslationResponse = { language: string; translations: Record<string, string> };
type PublicChatResponse = { sessionId: string; message: { text?: string } };
type FormFieldKey = 'name' | 'email' | 'company' | 'phone' | 'country' | 'requirements';
type FormField = { key: FormFieldKey; label: string; enabled: boolean; required: boolean };
type SiteInfo = { contactDetails: { email: string; phone: string; whatsapp: string; address: string; hours: string }; socialLinks: Array<{ id: string; platform: string; label: string; url: string; visible: boolean }>; contactModalTitle?: string; contactModalSubtitle?: string };
type EditorSection = { id?: string; type: string; visible?: boolean; title?: string; eyebrow?: string; logoUrl?: string; subtitle?: string; buttonText?: string; secondaryButtonText?: string; buttonAction?: string; secondaryButtonAction?: string; showButton?: boolean; imageUrl?: string; imageUrls?: string[]; backgroundImageUrl?: string; backgroundColor?: string; backgroundOpacity?: number; sectionBackgroundImage?: string; count?: number; columns?: number; showPrice?: boolean; showMoq?: boolean; showEyebrow?: boolean; showSecondaryButton?: boolean; showTrustBar?: boolean; showStats?: boolean; showSocials?: boolean; showContact?: boolean; welcome?: string; position?: 'left' | 'right'; links?: string[]; navItems?: Array<{ id: string; label: string; targetId: string }>; showCategories?: boolean; formFields?: FormField[]; stats?: Array<{ id: string; value: string; label: string }>; promiseTitle?: string; promiseText?: string; socialLinks?: Array<{ id: string; platform: string; label: string; url: string; visible: boolean }>; contactDetails?: { email: string; phone: string; whatsapp: string; address: string; hours: string } };
type Inquiry = Record<FormFieldKey | 'website', string>;
const defaultFormFields: FormField[] = [{ key: 'email', label: '邮箱', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }];
const anchorId = (item?: EditorSection, fallback?: string) => item?.id ? `section-${item.id}` : fallback;
const supportedLanguageCodes = new Set(['zh', 'en', 'bs']);
const languageName = (code: string) => ({ zh: '中文', en: '英文', bs: '波斯尼亚语' }[code] || code);
const customerTokenKey = 'mercivo_storefront_customer_token';
const pathHosts = new Set((import.meta.env.VITE_STOREFRONT_PATH_HOSTS || 'site.aihubflux.com').split(',').map((host: string) => host.trim().toLowerCase()).filter(Boolean));
const pathSegments = location.pathname.split('/').filter(Boolean);
const pathSite = pathHosts.has(location.hostname.toLowerCase()) && pathSegments[0] && pathSegments[0] !== 'products' ? pathSegments[0] : null;
const querySite = new URLSearchParams(location.search).get('site') || pathSite;
const siteBasePath = pathSite ? `/${encodeURIComponent(pathSite)}` : '';
const storefrontPathname = pathSite ? `/${pathSegments.slice(1).join('/')}` : location.pathname;
const api = async <T,>(path: string, init?: RequestInit): Promise<T> => { const token = localStorage.getItem(customerTokenKey); const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) } }); const body = await res.json(); if (!res.ok) throw new Error(body.message || 'Request failed'); return body.data as T; };
const imageUrl = (id: string) => id.startsWith('http') ? id : `https://images.unsplash.com/${id}?w=900&h=700&fit=crop&auto=format`;
const formatPrice = (price: string, currency = 'CNY') => {
  if (!price) return '—';
  if (/^[¥$€£]/.test(price) || /[A-Z]{3}/.test(price)) return price;
  const symbol = ({ CNY: '¥', USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[currency];
  return symbol ? `${symbol}${price}` : `${currency} ${price}`;
};
const contrastColor = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b > .42 ? '#17231f' : '#ffffff';
};
const setMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
};
const applySeo = (data: PublishedSite) => {
  const seo = data.seo || {};
  const productId = storefrontPathname.match(/^\/products\/([^/]+)$/)?.[1];
  const product = productId ? data.products.find(item => item.id === productId) : undefined;
  const title = product ? (product.seoTitle || `${product.nameEn || product.nameZh}｜${data.site.name}`) : (seo.title || `${data.site.name}｜官方网站`);
  const description = product ? (product.seoDescription || product.description || '') : (seo.description || `浏览${data.site.name}的产品，并向我们的外贸团队获取专属报价。`);
  const canonical = product ? `${location.origin}${location.pathname}` : (seo.canonicalUrl || `${location.origin}${location.pathname}`);
  const image = product?.seoImage || (product?.img ? imageUrl(product.img) : '') || seo.shareImage || (data.products[0]?.img ? imageUrl(data.products[0].img) : '');
  document.title = title;
  document.documentElement.lang = data.site.defaultLanguage || 'zh';
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
  schema.textContent = JSON.stringify(product ? { '@context': 'https://schema.org', '@type': 'Product', name: product.nameEn || product.nameZh, description, sku: product.sku, image: image ? [image] : undefined, brand: { '@type': 'Brand', name: data.site.name } } : { '@context': 'https://schema.org', '@type': 'Organization', name: data.site.name, url: canonical, description, ...(image ? { logo: image } : {}) });
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

const ContactInfo = ({ info }: { info: SiteInfo }) => <div className="contact-info-layer">{info.contactDetails.email && <a href={`mailto:${info.contactDetails.email}`}>{info.contactDetails.email}</a>}{info.contactDetails.phone && <a href={`tel:${info.contactDetails.phone}`}>{info.contactDetails.phone}</a>}{info.contactDetails.whatsapp && <a href={`https://wa.me/${info.contactDetails.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp: {info.contactDetails.whatsapp}</a>}{info.contactDetails.address && <span>{info.contactDetails.address}</span>}{info.contactDetails.hours && <span>{info.contactDetails.hours}</span>}<div>{info.socialLinks.filter(item => item.visible && item.url).map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div></div>;

const ContactModal = ({ open, onClose, info, title, subtitle }: { open: boolean; onClose: () => void; info: SiteInfo; title: string; subtitle: string }) => {
  const [copied, setCopied] = useState('');
  if (!open) return null;
  const contact = info.contactDetails;
  const copy = (key: string, value: string) => navigator.clipboard.writeText(value).then(() => { setCopied(key); window.setTimeout(() => setCopied(''), 1800); });
  const whatsapp = (contact.whatsapp || contact.phone).replace(/\D/g, '');
  return <div className="contact-modal" role="dialog" aria-modal="true" aria-label={title}>
    <button className="contact-modal-backdrop" onClick={onClose} aria-label="关闭联系我们弹窗" />
    <section className="contact-modal-panel">
      <header><div><h2>{title}</h2><p>{contact.hours || subtitle}</p></div><button onClick={onClose} aria-label="关闭"><X /></button></header>
      <div className="contact-modal-body">
        <p className="contact-modal-note">{subtitle}</p>
        {contact.phone && <div className="contact-modal-card"><span className="contact-modal-icon"><Phone /></span><div><small>电话 / WhatsApp</small><strong>{contact.phone}</strong></div><button onClick={() => copy('phone', contact.phone)} aria-label="复制电话">{copied === 'phone' ? <Check /> : <Copy />}</button></div>}
        {whatsapp && <a className="contact-modal-card whatsapp" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><span className="contact-modal-icon"><MessageCircle /></span><div><strong>WhatsApp 聊天</strong><small>{contact.whatsapp || contact.phone}</small></div><ExternalLink /></a>}
        {contact.email && <div className="contact-modal-card"><span className="contact-modal-icon"><Mail /></span><div><small>邮箱</small><strong>{contact.email}</strong></div><button onClick={() => copy('email', contact.email)} aria-label="复制邮箱">{copied === 'email' ? <Check /> : <Copy />}</button></div>}
        {contact.email && <a className="contact-modal-email" href={`mailto:${contact.email}?subject=${encodeURIComponent('产品询价')}&body=${encodeURIComponent('您好，我想咨询产品报价、定制与交付信息，请与我联系。')}`}><Mail />发送邮件</a>}
        {contact.address && <div className="contact-modal-meta"><MapPin /><span>地址：{contact.address}</span></div>}
        {contact.hours && <div className="contact-modal-card"><span className="contact-modal-icon"><Clock /></span><div><small>工作时间</small><strong>{contact.hours}</strong></div></div>}
        {!!info.socialLinks.filter(item => item.visible && item.url).length && <div className="contact-modal-socials">{info.socialLinks.filter(item => item.visible && item.url).map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div>}
      </div>
    </section>
  </div>;
};

function App() {
  const [site, setSite] = useState<PublishedSite | null>(null);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: '您好！请问有什么采购需求可以帮您？' }]);
  const [input, setInput] = useState('');
  const [inquiry, setInquiry] = useState<Inquiry>({ name: '', email: '', company: '', phone: '', country: '', requirements: '', website: '' });
  const [productCategory, setProductCategory] = useState('全部');
  const [productSubcategory, setProductSubcategory] = useState('全部');
  const [heroIndex, setHeroIndex] = useState(0);
  const [language, setLanguage] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const visitorId = useMemo(() => {
    const key = 'mercivo_storefront_visitor';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    localStorage.setItem(key, value);
    return value;
  }, []);
  const loadSite = () => api<PublishedSite>(`/api/v1/public/site${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`).then(data => { setSite(data); setLanguage(current => current || data.site.defaultLanguage || 'zh'); applySeo(data); setError(''); });
  useEffect(() => { loadSite().catch(err => setError(err.message)); }, [querySite]);
  const loginCustomer = async (event: React.FormEvent) => {
    event.preventDefault(); setLoggingIn(true); setLoginError('');
    try {
      const result = await api<{ accessToken: string }>(`/api/v1/public/customer/login${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify(loginForm) });
      localStorage.setItem(customerTokenKey, result.accessToken); await loadSite(); setLoginOpen(false); setLoginForm({ phone: '' });
    } catch (err) { setLoginError(err instanceof Error ? err.message : '登录失败'); }
    finally { setLoggingIn(false); }
  };
  const logoutCustomer = () => { localStorage.removeItem(customerTokenKey); setSite(current => current ? { ...current, customer: null } : current); void loadSite(); };
  const t = (key: string, fallback: string) => translations[key] || fallback;
  const changeLanguage = async (next: string) => {
    if (!site || next === language) return;
    setLanguage(next); document.documentElement.lang = next;
    if (next === site.site.defaultLanguage) { setTranslations({}); return; }
    const storageKey = `mercivo_translation_${site.versionId}_${next}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) { setTranslations(JSON.parse(stored)); return; }
    setTranslating(true);
    try { const result = await api<TranslationResponse>(`/api/v1/public/site/translate${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify({ language: next }) }); setTranslations(result.translations); sessionStorage.setItem(storageKey, JSON.stringify(result.translations)); }
    catch (err) { setLanguage(site.site.defaultLanguage); document.documentElement.lang = site.site.defaultLanguage; alert(err instanceof Error ? err.message : '暂时无法翻译'); }
    finally { setTranslating(false); }
  };
  const editorSections = useMemo<EditorSection[]>(() => {
    const pages = site?.config.pages as Record<string, { sections?: EditorSection[] }> | undefined;
    return pages?.home?.sections?.filter(section => section.visible !== false) || [];
  }, [site]);
  const configured = editorSections.length > 0;
  const section = (type: string) => editorSections.find(item => item.type === type);
  const hasSection = (type: string) => !configured || !!section(type);
  const productSection = section('products');
  const heroSection = section('hero');
  const textSection = section('text');
  const formSection = section('form');
  const footerSection = section('footer');
  const assistantSection = section('assistant');
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
  const siteLanguages = (site?.site.supportedLanguages || [site?.site.defaultLanguage || 'zh']).filter(code => supportedLanguageCodes.has(code));
  const themeColor = typeof site?.config.themeColor === 'string' ? site.config.themeColor : '#1A3D2E';
  const siteInfo = site?.config.siteInfo as SiteInfo | undefined;
  const pathProductId = storefrontPathname.match(/^\/products\/([^/]+)$/)?.[1];
  const featured = useMemo(() => pathProductId ? (site?.products || []).filter(product => product.id === pathProductId) : site?.products || [], [site, pathProductId]);
  const heroImages = useMemo(() => heroSection?.imageUrls?.length ? heroSection.imageUrls : featured.slice(0, 5).map(product => imageUrl(product.img)), [heroSection?.imageUrls, featured]);
  useEffect(() => { setHeroIndex(0); if (heroImages.length < 2) return; const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroImages.length), 5000); return () => window.clearInterval(timer); }, [heroImages]);
  const categoryTree = useMemo(() => {
    const entries = site?.categories || [];
    return entries.filter(item => !item.parentCode).map(parent => ({ ...parent, children: entries.filter(item => item.parentCode === parent.code) }));
  }, [site?.categories]);
  const activePrimary = categoryTree.find(item => item.code === productCategory);
  const visibleProducts = useMemo(() => {
    if (productCategory === '全部') return featured;
    if (productSubcategory !== '全部') return featured.filter(item => item.category === productSubcategory);
    const codes = new Set([productCategory, ...(activePrimary?.children || []).map(item => item.code)]);
    return featured.filter(item => codes.has(item.category));
  }, [activePrimary, featured, productCategory, productSubcategory]);
  useEffect(() => {
    const productRoot = document.getElementById(anchorId(productSection, 'products') || 'products');
    if (!productRoot) return;
    const badgeNames: Record<string, string> = { new: '新品', hot: '爆品', bestseller: '热销', recommended: '推荐' };
    productRoot.querySelectorAll<HTMLElement>('.product').forEach((card, index) => {
      const product = visibleProducts[index];
      if (!product) return;
      const description = card.querySelector<HTMLElement>('.product-info>p');
      if (description) { description.classList.add('product-rich-description'); description.innerHTML = product.description || '<p>支持材质、颜色及品牌印刷定制。</p>'; }
      card.querySelector('.product-tags')?.remove();
      if (product.tags?.length) { const tags = document.createElement('div'); tags.className = 'product-tags'; product.tags.forEach(value => { const tag = document.createElement('span'); tag.textContent = value; tags.appendChild(tag); }); description?.after(tags); }
      const image = card.querySelector('.product-image');
      image?.querySelector('.product-like')?.remove();
      if (image) { const likes = document.createElement('span'); likes.className = 'product-like'; likes.textContent = `♥ ${product.likeCount || 0}`; image.appendChild(likes); }
      const badge = image?.querySelector<HTMLElement>(':scope>span:not(.product-like)');
      const badgeText = badgeNames[product.badge || ''] || (product.hot ? '爆品' : '');
      if (badge) { badge.textContent = badgeText; badge.style.display = badgeText ? '' : 'none'; }
      else if (image && badgeText) { const mark = document.createElement('span'); mark.textContent = badgeText; image.appendChild(mark); }
      const moq = card.querySelector<HTMLElement>('.product-info footer span');
      if (moq) { moq.textContent = `最小起订量 ${product.moq}`; moq.style.display = productSection?.showMoq ? '' : 'none'; }
    });
  }, [visibleProducts, productSection?.showMoq, productSection?.id]);
  const categoryName = (code: string) => {
    const entry = site?.categories?.find(item => item.code === code);
    if (!entry) return code;
    const parent = entry.parentCode ? site?.categories?.find(item => item.code === entry.parentCode) : null;
    return `${parent ? `${t(`category.${parent.code}`, parent.label)} / ` : ''}${t(`category.${entry.code}`, entry.label)}`;
  };
  const inquiryFields = (formSection?.formFields || defaultFormFields).filter(field => field.enabled);
  const runAction = (action?: string) => {
    if (!action) return;
    if (action === 'contactModal' || action === contactModalSection?.id) return setContactOpen(true);
    const target = editorSections.find(item => item.id === action || item.type === action);
    if (target?.id) document.getElementById(`section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const sendChat = async () => { if (!input.trim() || !site) return; const text = input; setInput(''); setMessages(v => [...v, { role: 'user', text }]); try { const sessionKey = `mercivo_chat_session_${site.siteId}`; const reply = await api<PublicChatResponse>(`/api/v1/chat/public/send${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify({ sessionId: localStorage.getItem(sessionKey) || undefined, visitorId, text }) }); localStorage.setItem(sessionKey, reply.sessionId); setMessages(v => [...v, { role: 'ai', text: reply.message.text || '' }]); } catch { setMessages(v => [...v, { role: 'ai', text: '请留下您的采购需求，我们会尽快回复。' }]); } };
  const submitInquiry = async (e: React.FormEvent) => { e.preventDefault(); if (!site) return; const payload = Object.fromEntries(Object.entries(inquiry).filter(([key, value]) => key === 'website' || value.trim())); await api(`/api/v1/public/inquiries${querySite ? `?site=${encodeURIComponent(querySite)}` : ''}`, { method: 'POST', body: JSON.stringify(payload) }); setInquiry({ name: '', email: '', company: '', phone: '', country: '', requirements: '', website: '' }); alert('提交成功，我们将在 24 小时内回复。'); };
  const renderInquiryField = (field: FormField) => {
    const placeholder = field.key === 'email' ? 'name@company.com' : '请填写产品、数量、规格、交付国家等信息';
    const update = (value: string) => setInquiry(current => ({ ...current, [field.key]: value }));
    return <label className={`form-field ${field.key === 'requirements' ? 'wide' : ''}`} key={field.key}><span>{field.label}<b>*</b></span>{field.key === 'requirements'
      ? <textarea required={field.required} placeholder={placeholder} value={inquiry[field.key]} onChange={event => update(event.target.value)} />
      : <input required={field.required} type={field.key === 'email' ? 'email' : field.key === 'phone' ? 'tel' : 'text'} placeholder={placeholder} value={inquiry[field.key]} onChange={event => update(event.target.value)} />}</label>;
  };
  if (error) return <main className="unavailable-page">
    <section className="unavailable-card" role="alert">
      <MercivoLogo />
      <div className="unavailable-icon"><Globe2 /></div>
      <h1>站点暂时无法访问</h1>
      <p>当前域名尚未关联到可用站点，或该站点暂未发布。</p>
      <p className="unavailable-help">如果您是站点管理员，请在后台检查域名绑定、商户权限及发布状态。</p>
      <button type="button" onClick={() => { setError(''); loadSite().catch(err => setError(err instanceof Error ? err.message : '站点加载失败')); }}><span>重新加载</span><ArrowRight /></button>
      <small>由 Mercivo 提供技术支持</small>
    </section>
  </main>;
  if (!site) return <main className="state"><div className="loader"/><p>正在加载站点…</p></main>;
  return <div style={{ '--theme': themeColor, '--theme-contrast': contrastColor(themeColor) } as React.CSSProperties}>
    {hasSection('header') && <header className="nav"><a className="brand" href="#top">{section('header')?.logoUrl ? <img src={section('header')!.logoUrl} alt={section('header')?.title || site.site.name} /> : <><Globe2/> {section('header')?.title || site.site.name}</>}</a><nav>{section('header')?.navItems?.length ? section('header')!.navItems!.map(item=><a key={item.id} href={`#section-${item.targetId}`}>{item.label}</a>) : (section('header')?.links || ['产品','关于我们','联系我们']).map(link=><a key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}</nav><button className="customer-account" onClick={() => site.customer ? logoutCustomer() : setLoginOpen(true)} title={site.customer ? '清除客户识别' : '识别客户'}>{site.customer ? <><User/><span>{site.customer.name}</span><LogOut className="logout-icon"/></> : <><User/><span>客户识别</span></>}</button><div className={`language-control ${translating ? 'is-translating' : ''}`}><Globe2/><AntSelect className="language-select" label="切换站点语言" disabled={translating} value={language || siteLanguages[0] || 'zh'} onChange={changeLanguage} options={(siteLanguages.length ? siteLanguages : ['zh']).map(code => ({ value: code, label: languageName(code) }))} />{translating && <span className="language-loading" aria-live="polite">翻译中…</span>}</div><button className="icon"><Menu/></button></header>}
    <main id="top">
      {hasSection('hero') && <section id={anchorId(heroSection)} className="hero"><div className="hero-carousel">{heroImages.map((url, index) => <img key={url} className={index === heroIndex ? 'active' : ''} src={url} alt={`轮播图片 ${index + 1}`} />)}<div className="hero-shade"/><div className="hero-copy"><h1>{heroSection?.title || t('hero.title','为您的品牌打造高品质产品')}</h1><p>{heroSection?.subtitle || t('hero.description','工厂直供、品牌定制与可靠的全球交付，由专业外贸团队全程服务。')}</p><div className="actions">{heroSection?.showButton !== false && <button className="primary" onClick={() => runAction(heroSection?.buttonAction || 'products')}>{heroSection?.buttonText || t('hero.productsCta','查看产品')}<ArrowRight /></button>}{heroSection?.showSecondaryButton !== false && <button className="secondary" onClick={() => runAction(heroSection?.secondaryButtonAction || 'contactModal')}>{heroSection?.secondaryButtonText || t('hero.quoteCta','获取报价')}</button>}</div><div className="trust"><span><ShieldCheck/> {t('hero.quality','品质保障')}</span><span><Truck/> {t('hero.shipping','全球发货')}</span><span><CheckCircle/> {t('hero.samples','支持定制样品')}</span></div></div>{heroImages.length > 1 && <><button className="carousel-arrow prev" onClick={() => setHeroIndex(index => (index - 1 + heroImages.length) % heroImages.length)} aria-label="上一张"><ChevronLeft /></button><button className="carousel-arrow next" onClick={() => setHeroIndex(index => (index + 1) % heroImages.length)} aria-label="下一张"><ChevronRight /></button><div className="carousel-dots">{heroImages.map((_, index) => <button aria-label={`切换到第 ${index + 1} 张`} className={index === heroIndex ? 'active' : ''} key={index} onClick={() => setHeroIndex(index)} />)}</div></>}</div></section>}
      {hasSection('products') && <section className="section" id={anchorId(productSection, "products")}><div className="section-head"><div><span className="eyebrow">{t('products.eyebrow','产品系列')}</span><h2>{productSection?.title || t('products.title','助力业务增长的优质产品')}</h2></div><p>{t('products.description','灵活的起订量与工厂直供价格，满足全球品牌的采购需求。')}</p></div>{productSection?.showCategories !== false && categoryTree.length > 0 && <div className="category-navigation"><div className="category-selects"><AntSelect className="category-select" value={productCategory} onChange={value => { setProductCategory(value); setProductSubcategory('全部'); }} options={[{ value: '全部', label: '全部商品' }, ...categoryTree.map(category => ({ value: category.code, label: t(`category.${category.code}`, category.label) }))]} />{activePrimary?.children.length ? <AntSelect className="category-select" value={productSubcategory} onChange={setProductSubcategory} options={[{ value: '全部', label: `全部${t(`category.${activePrimary.code}`, activePrimary.label)}` }, ...activePrimary.children.map(category => ({ value: category.code, label: t(`category.${category.code}`, category.label) }))]} /> : null}</div><div className="category-tabs primary-tabs"><button className={productCategory === '全部' ? 'active' : ''} onClick={() => { setProductCategory('全部'); setProductSubcategory('全部'); }}>全部商品</button>{categoryTree.map(category => <button className={category.code === productCategory ? 'active' : ''} key={category.code} onClick={() => { setProductCategory(category.code); setProductSubcategory('全部'); }}>{t(`category.${category.code}`, category.label)}</button>)}</div>{activePrimary?.children.length ? <div className="category-tabs secondary-tabs"><button className={productSubcategory === '全部' ? 'active' : ''} onClick={() => setProductSubcategory('全部')}>全部</button>{activePrimary.children.map(category => <button className={category.code === productSubcategory ? 'active' : ''} key={category.code} onClick={() => setProductSubcategory(category.code)}>{t(`category.${category.code}`, category.label)}</button>)}</div> : null}</div>}<div className="grid">{visibleProducts.map(product => <article className="product" key={product.id}><a className="product-detail-link" href={`${siteBasePath}/products/${product.id}`} aria-label={`查看 ${product.nameZh || product.nameEn} 详情`}/><div className="product-image"><img src={imageUrl(product.img)} alt={t(`product.${product.id}.name`,product.nameEn)}/>{product.hot && <span>{t('products.bestSeller','热销产品')}</span>}</div><div className="product-info"><small>{categoryName(product.category)}</small><h3>{t(`product.${product.id}.name`,product.nameZh || product.nameEn)}</h3><p>{t(`product.${product.id}.description`,product.description || '支持材质、颜色及品牌印刷定制。')}</p><footer>{product.priceVisible === false ? <button className="price-login" onClick={() => setLoginOpen(true)}>登录后查看价格</button> : <strong>{formatPrice(product.price, site.site.defaultCurrency)}</strong>}<span>{t('products.moq','最低起订量')} {product.moq}</span></footer></div></article>)}</div>{!visibleProducts.length && <div className="product-empty">当前分类暂无商品</div>}</section>}
      {hasSection('text') && <section className={`about ${textSection?.backgroundImageUrl ? 'has-background' : ''}`} style={textSection?.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(8,20,38,.72),rgba(8,20,38,.72)),url(${textSection.backgroundImageUrl})` } : undefined} id={anchorId(textSection, "about")}><div><span className="eyebrow">{t('about.eyebrow','关于我们')}</span><h2>{textSection?.title || t('about.title','不只是供应商，更是您的采购合作伙伴。')}</h2></div><div className="about-copy">{textSection?.subtitle || t('about.description','以稳定的产品品质、灵活的定制能力和专业的外贸服务，帮助全球客户高效完成采购。')}</div></section>}
      {site.testimonials.length > 0 && <section className="section"><span className="eyebrow">{t('testimonials.title','客户评价')}</span><div className="quotes">{site.testimonials.slice(0,3).map(item => <blockquote key={item.id}><p>“{t(`testimonial.${item.id}.text`,item.text)}”</p><footer><strong>{item.name}</strong><span>{item.company}</span></footer></blockquote>)}</div></section>}
      {hasSection('form') && <section className={`contact ${formSection?.backgroundImageUrl ? 'has-background' : ''}`} style={formSection?.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(8,20,38,.72),rgba(8,20,38,.72)),url(${formSection.backgroundImageUrl})` } : undefined} id={anchorId(formSection, "contact")}><div><span className="eyebrow">{t('contact.eyebrow','开启合作')}</span><h2>{formSection?.title || t('contact.title','告诉我们您的采购需求')}</h2><p>{formSection?.subtitle || t('contact.description','请填写邮箱和采购需求，我们的外贸团队将为您准备专属报价。')}</p>{siteInfo && <ContactInfo info={siteInfo} />}</div><form onSubmit={submitInquiry}>{inquiryFields.map(renderInquiryField)}<input tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-9999px'}} value={inquiry.website} onChange={event=>setInquiry(current=>({...current,website:event.target.value}))}/>{formSection?.showButton !== false && <button className="primary" type="submit">{formSection?.buttonText || t('contact.submit','提交询盘')}</button>}</form></section>}
    </main>
    {hasSection('footer') && <footer id={anchorId(footerSection)} className="footer"><div className="footer-brand"><strong>{footerSection?.title || site.site.name}</strong><p>{footerSection?.subtitle || '为全球客户提供专业采购服务。'}</p>{footerSection?.showSocials !== false && <div className="footer-socials">{(siteInfo?.socialLinks || []).filter(item => item.visible && item.url).map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div>}</div>{footerSection?.navItems?.length ? <nav>{footerSection.navItems.map(item => <a key={item.id} href={`#section-${item.targetId}`}>{item.label}</a>)}</nav> : null}{footerSection?.showContact !== false && siteInfo?.contactDetails && <address className="footer-contact"><strong>联系我们</strong>{siteInfo!.contactDetails.email && <a href={`mailto:${siteInfo!.contactDetails.email}`}>{siteInfo!.contactDetails.email}</a>}{siteInfo!.contactDetails.phone && <a href={`tel:${siteInfo!.contactDetails.phone}`}>{siteInfo!.contactDetails.phone}</a>}{siteInfo!.contactDetails.whatsapp && <a href={`https://wa.me/${siteInfo!.contactDetails.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp: {siteInfo!.contactDetails.whatsapp}</a>}{siteInfo!.contactDetails.address && <span>{siteInfo!.contactDetails.address}</span>}{siteInfo!.contactDetails.hours && <span>{siteInfo!.contactDetails.hours}</span>}</address>}<div className="footer-copyright">© {new Date().getFullYear()} {footerSection?.title || site.site.name}. All rights reserved.</div></footer>}
    {hasSection('assistant') && site.agent && <button className="chat-trigger" style={assistantSection?.position === 'left' ? {left:24,right:'auto'} : undefined} onClick={()=>setChatOpen(true)} aria-label="打开 AI 助手"><MessageCircle/></button>}
    {hasSection('assistant') && site.agent && chatOpen && <aside className="chat" style={assistantSection?.position === 'left' ? {left:24,right:'auto'} : undefined}><header><div><Bot/><span><strong>{site.agent?.name || '销售助手'}</strong><small>{t('chat.online','在线')}</small></span></div><button onClick={()=>setChatOpen(false)}><X/></button></header><div className="messages">{messages.map((m,i)=><p className={m.role} key={i}>{m.text}</p>)}</div><footer><input placeholder={t('chat.placeholder','请输入产品、价格或物流问题…')} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}/><button onClick={sendChat}><Send/></button></footer></aside>}
    {siteInfo && <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} info={siteInfo} title={siteInfo.contactModalTitle || '联系我们'} subtitle={siteInfo.contactModalSubtitle || '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。'} />}
    {loginOpen && <div className="customer-login-modal" role="dialog" aria-modal="true" aria-label="客户识别"><button className="customer-login-backdrop" onClick={() => setLoginOpen(false)} aria-label="关闭弹窗"/><form className="customer-login-panel" onSubmit={loginCustomer}><div className="customer-login-head"><div className="customer-login-icon"><User/></div><div><h2>客户识别</h2><p>输入预留手机号，查看对应等级价格</p></div><button type="button" onClick={() => setLoginOpen(false)} aria-label="关闭"><X/></button></div><label><span>客户手机号</span><input required autoFocus type="tel" autoComplete="tel" value={loginForm.phone} onChange={event => setLoginForm({ phone: event.target.value })} placeholder="+86 138 0000 0000"/></label>{loginError && <p className="customer-login-error">{loginError}</p>}<button className="primary customer-login-submit" disabled={loggingIn} type="submit">{loggingIn ? '匹配中…' : '匹配并查看客户价'}</button><small>手机号仅用于匹配供应商为您设置的客户价格等级。</small></form></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
