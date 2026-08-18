import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dynamicEnUS, enUS, getStoredLocale, Locale, LOCALE_STORAGE_KEY } from './translations';

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; toggleLocale: () => void; t: (text: string) => string };
const I18nContext = createContext<I18nContextValue | null>(null);
const reverseEnUS = Object.fromEntries(Object.entries(enUS).map(([zh, en]) => [en, zh]));

export function translate(text: string, locale: Locale): string {
  const leading = text.match(/^\s*/)?.[0] || '';
  const trailing = text.match(/\s*$/)?.[0] || '';
  const value = text.trim();
  if (!value) return text;
  if (locale === 'zh-CN') return `${leading}${reverseEnUS[value] || value}${trailing}`;
  const exact = enUS[value];
  if (exact) return `${leading}${exact}${trailing}`;
  for (const [pattern, formatter] of dynamicEnUS) {
    const match = value.match(pattern);
    if (match) return `${leading}${formatter(...match.slice(1))}${trailing}`;
  }
  return text;
}

const translatableAttributes = ['placeholder', 'title', 'aria-label'];
function translateElementTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script,style,code,pre')) continue;
    const next = translate(node.nodeValue || '', locale);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
  for (const element of elements) for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute);
    if (value) { const next = translate(value, locale); if (next !== value) element.setAttribute(attribute, next); }
  }
}

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const setLocale = useCallback((next: Locale) => { localStorage.setItem(LOCALE_STORAGE_KEY, next); setLocaleState(next); }, []);
  const toggleLocale = useCallback(() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN'), [locale, setLocale]);
  const t = useCallback((text: string) => translate(text, locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    translateElementTree(document.body, locale);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData' && record.target.nodeValue) {
          const next = translate(record.target.nodeValue, locale); if (next !== record.target.nodeValue) record.target.nodeValue = next;
        }
        for (const node of record.addedNodes) if (node instanceof Element) translateElementTree(node, locale);
        if (record.type === 'attributes' && record.target instanceof Element) translateElementTree(record.target, locale);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatableAttributes });
    return () => observer.disconnect();
  }, [locale]);

  useEffect(() => {
    const syncLocale = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) setLocaleState(getStoredLocale());
    };
    window.addEventListener('storage', syncLocale);
    return () => window.removeEventListener('storage', syncLocale);
  }, []);

  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t }), [locale, setLocale, toggleLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
};

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { locale, toggleLocale } = useI18n();
  const labels = locale === 'zh-CN' ? ['中文', '英文'] : ['EN', 'CN'];
  return <button type="button" onClick={toggleLocale} aria-label={locale === 'zh-CN' ? '切换到英文' : 'Switch to Chinese'} className={`flex flex-shrink-0 items-center gap-1 rounded-lg border border-border bg-secondary transition-colors hover:border-primary/30 ${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'}`}>
    <span className="font-semibold text-foreground">{labels[0]}</span><span className="mx-0.5 text-border">/</span><span className="text-muted-foreground">{labels[1]}</span>
  </button>;
};
