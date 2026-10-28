import type { Locale } from 'antd/es/locale';

const localeModules = import.meta.glob<{ default: Locale }>('/node_modules/antd/es/locale/*.js', { eager: true });
const antdLocales = Object.fromEntries(Object.entries(localeModules).map(([path, module]) => [path.split('/').pop()!.replace(/\.js$/, ''), module.default])) as Record<string, Locale>;

export const normalizeLocaleCode = (code?: string) => ({ zh: 'zh_CN', en: 'en_US', bs: 'en_US' }[code || ''] || code || 'zh_CN');
export const antdLocaleFor = (code?: string, fallback?: string) => antdLocales[normalizeLocaleCode(code)] || antdLocales[normalizeLocaleCode(fallback)] || antdLocales.en_US;

const platformCopy = {
  zh_CN: { unavailable: '站点暂时无法访问', unavailableDescription: '当前域名尚未关联到可用站点，或该站点暂未发布。', administratorHelp: '如果您是站点管理员，请在后台检查域名绑定、商户权限及发布状态。', retry: '重新加载', support: '由 Mercivo 提供技术支持' },
  zh_TW: { unavailable: '網站暫時無法存取', unavailableDescription: '目前網域尚未關聯至可用網站，或該網站尚未發佈。', administratorHelp: '如果您是網站管理員，請在後台檢查網域綁定、商戶權限及發佈狀態。', retry: '重新載入', support: '由 Mercivo 提供技術支援' },
  zh_HK: { unavailable: '網站暫時無法存取', unavailableDescription: '目前網域尚未連結至可用網站，或該網站尚未發佈。', administratorHelp: '如果您是網站管理員，請在後台檢查網域綁定、商戶權限及發佈狀態。', retry: '重新載入', support: '由 Mercivo 提供技術支援' },
  en_US: { unavailable: 'Site temporarily unavailable', unavailableDescription: 'This domain is not connected to an available site, or the site has not been published.', administratorHelp: 'If you manage this site, check its domain binding, merchant access, and publishing status.', retry: 'Reload', support: 'Powered by Mercivo' },
} as const;

export type PlatformCopy = { unavailable: string; unavailableDescription: string; administratorHelp: string; retry: string; support: string };
export const requestedPlatformLocale = () => {
  const requested = new URLSearchParams(location.search).get('lang');
  return normalizeLocaleCode(requested || navigator.languages?.[0]?.replace('-', '_') || navigator.language.replace('-', '_'));
};
export const platformMessages = (locale: string): PlatformCopy => platformCopy[locale as keyof typeof platformCopy] || (locale.startsWith('zh_') ? platformCopy.zh_CN : platformCopy.en_US);
