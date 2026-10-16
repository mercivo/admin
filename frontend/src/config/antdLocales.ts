export type AntdLocaleOption = {
  value: string;
  label: string;
  nativeLabel: string;
  region: string;
};

export const ANTD_LOCALE_OPTIONS: AntdLocaleOption[] = [
  { value: 'zh_CN', label: '简体中文', nativeLabel: '简体中文', region: '东亚' },
  { value: 'zh_TW', label: '繁体中文', nativeLabel: '繁體中文', region: '东亚' },
  { value: 'zh_HK', label: '繁体中文（中国香港）', nativeLabel: '繁體中文', region: '东亚' },
  { value: 'en_US', label: '英语', nativeLabel: 'English', region: '欧洲与美洲' },
  { value: 'en_GB', label: '英语（英国）', nativeLabel: 'English (UK)', region: '欧洲与美洲' },
  { value: 'ja_JP', label: '日语', nativeLabel: '日本語', region: '东亚' },
  { value: 'ko_KR', label: '韩语', nativeLabel: '한국어', region: '东亚' },
  { value: 'ar_EG', label: '阿拉伯语', nativeLabel: 'العربية', region: '中东与中亚' },
  { value: 'az_AZ', label: '阿塞拜疆语', nativeLabel: 'Azərbaycanca', region: '中东与中亚' },
  { value: 'bg_BG', label: '保加利亚语', nativeLabel: 'Български', region: '欧洲与美洲' },
  { value: 'bn_BD', label: '孟加拉语', nativeLabel: 'বাংলা', region: '南亚' },
  { value: 'by_BY', label: '白俄罗斯语', nativeLabel: 'Беларуская', region: '欧洲与美洲' },
  { value: 'ca_ES', label: '加泰罗尼亚语', nativeLabel: 'Català', region: '欧洲与美洲' },
  { value: 'cs_CZ', label: '捷克语', nativeLabel: 'Čeština', region: '欧洲与美洲' },
  { value: 'da_DK', label: '丹麦语', nativeLabel: 'Dansk', region: '欧洲与美洲' },
  { value: 'de_DE', label: '德语', nativeLabel: 'Deutsch', region: '欧洲与美洲' },
  { value: 'el_GR', label: '希腊语', nativeLabel: 'Ελληνικά', region: '欧洲与美洲' },
  { value: 'es_ES', label: '西班牙语', nativeLabel: 'Español', region: '欧洲与美洲' },
  { value: 'et_EE', label: '爱沙尼亚语', nativeLabel: 'Eesti', region: '欧洲与美洲' },
  { value: 'eu_ES', label: '巴斯克语', nativeLabel: 'Euskara', region: '欧洲与美洲' },
  { value: 'fa_IR', label: '波斯语', nativeLabel: 'فارسی', region: '中东与中亚' },
  { value: 'fi_FI', label: '芬兰语', nativeLabel: 'Suomi', region: '欧洲与美洲' },
  { value: 'fr_BE', label: '法语（比利时）', nativeLabel: 'Français (Belgique)', region: '欧洲与美洲' },
  { value: 'fr_CA', label: '法语（加拿大）', nativeLabel: 'Français (Canada)', region: '欧洲与美洲' },
  { value: 'fr_FR', label: '法语（法国）', nativeLabel: 'Français', region: '欧洲与美洲' },
  { value: 'ga_IE', label: '爱尔兰语', nativeLabel: 'Gaeilge', region: '欧洲与美洲' },
  { value: 'gl_ES', label: '加利西亚语', nativeLabel: 'Galego', region: '欧洲与美洲' },
  { value: 'he_IL', label: '希伯来语', nativeLabel: 'עברית', region: '中东与中亚' },
  { value: 'hi_IN', label: '印地语', nativeLabel: 'हिन्दी', region: '南亚' },
  { value: 'hr_HR', label: '克罗地亚语', nativeLabel: 'Hrvatski', region: '欧洲与美洲' },
  { value: 'hu_HU', label: '匈牙利语', nativeLabel: 'Magyar', region: '欧洲与美洲' },
  { value: 'hy_AM', label: '亚美尼亚语', nativeLabel: 'Հայերեն', region: '中东与中亚' },
  { value: 'id_ID', label: '印度尼西亚语', nativeLabel: 'Bahasa Indonesia', region: '东南亚' },
  { value: 'is_IS', label: '冰岛语', nativeLabel: 'Íslenska', region: '欧洲与美洲' },
  { value: 'it_IT', label: '意大利语', nativeLabel: 'Italiano', region: '欧洲与美洲' },
  { value: 'ka_GE', label: '格鲁吉亚语', nativeLabel: 'ქართული', region: '中东与中亚' },
  { value: 'kk_KZ', label: '哈萨克语', nativeLabel: 'Қазақша', region: '中东与中亚' },
  { value: 'km_KH', label: '高棉语', nativeLabel: 'ភាសាខ្មែរ', region: '东南亚' },
  { value: 'kmr_IQ', label: '库尔德语（北部）', nativeLabel: 'Kurdî', region: '中东与中亚' },
  { value: 'kn_IN', label: '卡纳达语', nativeLabel: 'ಕನ್ನಡ', region: '南亚' },
  { value: 'ku_IQ', label: '库尔德语（中部）', nativeLabel: 'کوردی', region: '中东与中亚' },
  { value: 'lt_LT', label: '立陶宛语', nativeLabel: 'Lietuvių', region: '欧洲与美洲' },
  { value: 'lv_LV', label: '拉脱维亚语', nativeLabel: 'Latviešu', region: '欧洲与美洲' },
  { value: 'mk_MK', label: '马其顿语', nativeLabel: 'Македонски', region: '欧洲与美洲' },
  { value: 'ml_IN', label: '马拉雅拉姆语', nativeLabel: 'മലയാളം', region: '南亚' },
  { value: 'mn_MN', label: '蒙古语', nativeLabel: 'Монгол', region: '东亚' },
  { value: 'ms_MY', label: '马来语', nativeLabel: 'Bahasa Melayu', region: '东南亚' },
  { value: 'my_MM', label: '缅甸语', nativeLabel: 'မြန်မာ', region: '东南亚' },
  { value: 'nb_NO', label: '挪威语', nativeLabel: 'Norsk bokmål', region: '欧洲与美洲' },
  { value: 'ne_NP', label: '尼泊尔语', nativeLabel: 'नेपाली', region: '南亚' },
  { value: 'nl_BE', label: '荷兰语（比利时）', nativeLabel: 'Nederlands (België)', region: '欧洲与美洲' },
  { value: 'nl_NL', label: '荷兰语（荷兰）', nativeLabel: 'Nederlands', region: '欧洲与美洲' },
  { value: 'pl_PL', label: '波兰语', nativeLabel: 'Polski', region: '欧洲与美洲' },
  { value: 'pt_BR', label: '葡萄牙语（巴西）', nativeLabel: 'Português (Brasil)', region: '欧洲与美洲' },
  { value: 'pt_PT', label: '葡萄牙语（葡萄牙）', nativeLabel: 'Português', region: '欧洲与美洲' },
  { value: 'ro_RO', label: '罗马尼亚语', nativeLabel: 'Română', region: '欧洲与美洲' },
  { value: 'ru_RU', label: '俄语', nativeLabel: 'Русский', region: '欧洲与美洲' },
  { value: 'si_LK', label: '僧伽罗语', nativeLabel: 'සිංහල', region: '南亚' },
  { value: 'sk_SK', label: '斯洛伐克语', nativeLabel: 'Slovenčina', region: '欧洲与美洲' },
  { value: 'sl_SI', label: '斯洛文尼亚语', nativeLabel: 'Slovenščina', region: '欧洲与美洲' },
  { value: 'sr_RS', label: '塞尔维亚语', nativeLabel: 'Српски', region: '欧洲与美洲' },
  { value: 'sv_SE', label: '瑞典语', nativeLabel: 'Svenska', region: '欧洲与美洲' },
  { value: 'ta_IN', label: '泰米尔语', nativeLabel: 'தமிழ்', region: '南亚' },
  { value: 'th_TH', label: '泰语', nativeLabel: 'ไทย', region: '东南亚' },
  { value: 'tk_TK', label: '土库曼语', nativeLabel: 'Türkmen', region: '中东与中亚' },
  { value: 'tr_TR', label: '土耳其语', nativeLabel: 'Türkçe', region: '中东与中亚' },
  { value: 'uk_UA', label: '乌克兰语', nativeLabel: 'Українська', region: '欧洲与美洲' },
  { value: 'ur_PK', label: '乌尔都语', nativeLabel: 'اردو', region: '南亚' },
  { value: 'uz_UZ', label: '乌兹别克语', nativeLabel: 'Oʻzbekcha', region: '中东与中亚' },
  { value: 'vi_VN', label: '越南语', nativeLabel: 'Tiếng Việt', region: '东南亚' },
];

export const ANTD_LOCALE_CODES = ANTD_LOCALE_OPTIONS.map(option => option.value);
export const DEFAULT_ANTD_LOCALE = 'zh_CN';
const legacyLocaleMap: Record<string, string> = { zh: 'zh_CN', en: 'en_US', bs: 'en_US' };

export const normalizeAntdLocale = (value?: string) => {
  const normalized = legacyLocaleMap[value || ''] || value || DEFAULT_ANTD_LOCALE;
  return ANTD_LOCALE_CODES.includes(normalized) ? normalized : DEFAULT_ANTD_LOCALE;
};

export const antdLocaleLabel = (value: string) => {
  const option = ANTD_LOCALE_OPTIONS.find(item => item.value === value);
  if (!option) return value;
  return option.label === option.nativeLabel ? `${option.label} (${option.value})` : `${option.label} · ${option.nativeLabel} (${option.value})`;
};
