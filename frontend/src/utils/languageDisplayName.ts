const toLanguageTag = (code: string) => code.trim().replace(/_/g, '-');

const toDisplayLanguageTag = (code: string) => {
  const locale = new Intl.Locale(toLanguageTag(code));
  if (locale.language !== 'zh') return locale.language;
  const traditional = locale.script === 'Hant' || ['TW', 'HK', 'MO'].includes(locale.region || '');
  return traditional ? 'zh-Hant' : 'zh-Hans';
};

export const languageDisplayName = (code: string, displayLocale: string) => {
  if (!code) return '-';
  try {
    if (typeof Intl.DisplayNames !== 'function') return code;
    return new Intl.DisplayNames([toLanguageTag(displayLocale)], { type: 'language' }).of(toDisplayLanguageTag(code)) || code;
  } catch {
    return code;
  }
};
