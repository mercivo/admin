import React, { useEffect, useState } from 'react';
import { storefrontManageApi, translationApi, workspaceApi } from '../../services/api/index';
import type { TranslationMessages } from '../../services/api/index';
import type { Product, ProductCategory } from '../../types';
import { DEFAULT_CURRENCY_CONFIG, DEFAULT_SYSTEM_CONFIG, type CurrencyConfig, type SystemConfig } from '../../config/sales';
import { applyEditorTranslations, normalizeEditorConfig, type EditorConfig } from '../SiteEditor/schema';
import SiteRenderer, { type StorefrontRoute, type StorefrontRouteChange } from '../SiteEditor/SiteRenderer';

const previewRoute = (): StorefrontRoute => {
  const match = location.pathname.match(/^\/site-preview\/products\/([^/]+)\/?$/);
  if (!match) return { page: 'home', restoreScroll: Number(history.state?.homeScroll) || 0 };
  try { return { page: 'product', productId: decodeURIComponent(match[1]) }; } catch { return { page: 'product', productId: match[1] }; }
};

export default function SitePreview() {
  const [data, setData] = useState<{ config: EditorConfig; products: Product[]; categories: ProductCategory[]; currency: string; logo: string; languages: string[]; language: string; system: SystemConfig; i18n: TranslationMessages }>();
  const [error, setError] = useState('');
  const [route, setRoute] = useState<StorefrontRoute>(() => previewRoute());
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousScrollRestoration = history.scrollRestoration;
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'visible';
    history.scrollRestoration = 'manual';
    return () => { document.documentElement.style.overflow = previousHtmlOverflow; document.body.style.overflow = previousBodyOverflow; history.scrollRestoration = previousScrollRestoration; };
  }, []);
  useEffect(() => { const syncRoute = () => setRoute(previewRoute()); window.addEventListener('popstate', syncRoute); return () => window.removeEventListener('popstate', syncRoute); }, []);
  useEffect(() => { const loadProducts = async () => { const first = await storefrontManageApi.products({ page: 1, pageSize: 50 }); const pages = Math.ceil(first.total / first.pageSize); const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => storefrontManageApi.products({ page: index + 2, pageSize: 50 }))); return { ...first, items: [first.items, ...rest.map(item => item.items)].flat() }; }; Promise.all([
    workspaceApi.getConfig<Record<string, unknown>>('siteEditor'), loadProducts(),
    workspaceApi.getSettings(), workspaceApi.getConfig<Partial<CurrencyConfig>>('currency').catch(() => DEFAULT_CURRENCY_CONFIG), workspaceApi.getConfig<Partial<SystemConfig>>('system').catch(() => DEFAULT_SYSTEM_CONFIG), translationApi.messages(),
  ]).then(([raw, pool, workspace, currencies, systemValue, i18n]) => { const config = normalizeEditorConfig(raw); const code = workspace.site.defaultCurrency || currencies.defaultCurrency || 'CNY'; const symbol = currencies.currencies?.find(item => item.code === code)?.symbol || code; const system = { inventoryWarning: { ...DEFAULT_SYSTEM_CONFIG.inventoryWarning, ...systemValue.inventoryWarning }, storefront: { ...DEFAULT_SYSTEM_CONFIG.storefront, ...systemValue.storefront } }; const translations = i18n?.messages ? i18n : { sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } }; setData({ config, products: pool.items, categories: pool.categories, currency: symbol, logo: workspace.site.logoUrl || '', languages: workspace.site.supportedLanguages || [workspace.site.defaultLanguage], language: workspace.site.defaultLanguage, system, i18n: translations }); }).catch(() => setError('站点草稿加载失败')); }, []);
  if (error) return <main className="grid min-h-screen place-items-center text-sm text-red-600">{error}</main>;
  if (!data) return <main aria-label="站点加载中" aria-busy="true" className="grid min-h-screen place-items-center bg-white"><span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-500" /></main>;
  const messages = data.i18n.messages[data.language] || {};
  const config = applyEditorTranslations(data.config, messages);
  const translate = (key: string, fallback: string) => messages[key] || data.i18n.messages[data.i18n.sourceLocale]?.[key] || fallback;
  const changeRoute: StorefrontRouteChange = (next, { homeScroll }) => {
    if (route.page === 'home') history.replaceState({ ...history.state, homeScroll }, '', location.href);
    const url = new URL(location.href);
    url.pathname = next.page === 'product' ? `/site-preview/products/${encodeURIComponent(next.productId)}` : '/site-preview';
    const restoreScroll = next.page === 'home' ? Number(history.state?.homeScroll) || homeScroll : homeScroll;
    const resolved = next.page === 'home' ? { ...next, restoreScroll } : next;
    history.pushState({ homeScroll }, '', url);
    setRoute(resolved);
  };
  return <main data-site-preview-page className="min-h-screen w-full overflow-visible bg-white"><SiteRenderer config={config} products={data.products} categories={data.categories} currency={data.currency} supportedLanguages={data.languages} language={data.language} onLanguageChange={language => setData(current => current ? { ...current, language } : current)} brandLogoUrl={data.logo} translate={translate} route={route} onRouteChange={changeRoute} stickyHeader guestAccessEnabled={data.system.storefront.guestAccessEnabled} guestPriceMode={data.system.storefront.guestPriceMode} /></main>;
}
