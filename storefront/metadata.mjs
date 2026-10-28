const localizedValue = (data, locale, key, fallback = '') => {
  const messages = data.i18n?.messages || {};
  const sourceLocale = data.i18n?.sourceLocale || data.site?.defaultLanguage || 'zh_CN';
  return messages[locale]?.[key] || messages[sourceLocale]?.[key] || fallback;
};

const exactLocalizedValue = (data, locale, key, fallback = '') => data.i18n?.messages?.[locale]?.[key] || fallback;

export const resolveStorefrontMetadata = ({ data, locale, product, canonical }) => {
  const seo = data.seo || {};
  const siteName = localizedValue(data, locale, 'site:name', data.site?.name || '');
  const siteDescription = localizedValue(data, locale, 'site:description', data.site?.description || '');
  const isSourceLocale = locale === (data.i18n?.sourceLocale || data.site?.defaultLanguage || 'zh_CN');
  const seoTitle = exactLocalizedValue(data, locale, 'seo:title', isSourceLocale ? seo.title || '' : '');
  const seoDescription = exactLocalizedValue(data, locale, 'seo:description', isSourceLocale ? seo.description || '' : '');
  const keywords = exactLocalizedValue(data, locale, 'seo:keywords', isSourceLocale ? seo.keywords || '' : '');
  const productName = product ? localizedValue(data, locale, `product:${product.id}:name`, product.nameZh || '') : '';
  const productDescription = product ? localizedValue(data, locale, `product:${product.id}:description`, product.description || '') : '';
  const title = product ? `${productName}｜${siteName}` : (seoTitle || siteName);
  const description = product ? productDescription : (seoDescription || siteDescription);
  const image = product?.seoImage || product?.img || seo.shareImage || data.products?.[0]?.img || '';
  return {
    title,
    description,
    keywords,
    siteName,
    productName,
    canonical,
    image,
    faviconUrl: data.site?.faviconUrl || '',
    robots: seo.robots || 'index,follow,max-image-preview:large',
  };
};
