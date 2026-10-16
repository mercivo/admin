import type { Locale } from 'antd/es/locale';
import { DEFAULT_ANTD_LOCALE, normalizeAntdLocale } from './antdLocales';

const localeModules = import.meta.glob<{ default: Locale }>('/node_modules/antd/es/locale/*.js', { eager: true });
const locales = Object.fromEntries(
  Object.entries(localeModules).map(([path, module]) => [path.split('/').pop()!.replace(/\.js$/, ''), module.default]),
) as Record<string, Locale>;

export const antdLocaleFor = (code?: string) => locales[normalizeAntdLocale(code)] || locales[DEFAULT_ANTD_LOCALE];
