import http from 'node:http';
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { effectiveRequestHost } from './edge-host.mjs';
import { renderInitialDocument } from './server-render.mjs';
import { resolveStorefrontMetadata } from './metadata.mjs';

const root = new URL('./dist/', import.meta.url).pathname;
const defaultApiOrigin = process.env.NODE_ENV === 'production'
  ? 'https://mercivo-api-753805870951.asia-east1.run.app'
  : 'http://api:8080';
const configuredApiOrigin = (process.env.API_INTERNAL_URL || defaultApiOrigin).trim().replace(/\/$/, '');
// Cloud Run's service URL is stable across revisions. Use it for service-to-service
// traffic until the optional api.aihubflux.com Cloud Run domain mapping is healthy.
const apiOrigin = configuredApiOrigin === 'https://api.aihubflux.com' ? defaultApiOrigin : configuredApiOrigin;
const pathHosts = new Set((process.env.STOREFRONT_PATH_HOSTS || 'site.aihubflux.com').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
try {
  const parsedApiOrigin = new URL(apiOrigin);
  if (!['http:', 'https:'].includes(parsedApiOrigin.protocol) || parsedApiOrigin.pathname !== '/') throw new Error();
} catch {
  throw new Error('API_INTERNAL_URL must be an HTTP(S) origin without a path or trailing punctuation');
}
const port = Number(process.env.PORT || 8080);
const indexTemplate = await readFile(join(root, 'index.html'), 'utf8');
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const securityHeaders = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

const effectiveHost = headers => effectiveRequestHost(headers, process.env.EDGE_PROXY_SHARED_SECRET || '', event => {
  console.warn(JSON.stringify({ event: 'storefront_edge_host_rejected', ...event }));
});

function proxy(request, response, targetPath = request.url, originalHost = effectiveHost(request.headers)) {
  const target = new URL(targetPath, apiOrigin);
  const requestUpstream = target.protocol === 'https:' ? https.request : http.request;
  const headers = { ...request.headers, host: target.host, 'x-forwarded-host': originalHost };
  delete headers['x-mercivo-edge-token'];
  delete headers['x-mercivo-original-host'];
  const upstream = requestUpstream(target, { method: request.method, family: 4, servername: target.hostname, headers }, result => {
    response.writeHead(result.statusCode || 502, result.headers);
    result.pipe(response);
  });
  upstream.on('error', error => {
    console.error(`Storefront proxy failed: ${error.code || 'UNKNOWN'} ${error.message}`);
    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ code: 502, errorCode: 'SERVICE_UNAVAILABLE', data: null, message: 'Service temporarily unavailable' }));
  });
  request.pipe(upstream);
}

function requestRoute(host, requestUrl) {
  const normalizedHost = String(host || '').toLowerCase().split(':')[0];
  const segments = requestUrl.pathname.split('/').filter(Boolean);
  const pathSite = pathHosts.has(normalizedHost) && segments[0] && !['api', 'assets', 'products', 'healthz', 'robots.txt', 'sitemap.xml'].includes(segments[0]) ? segments[0] : '';
  const pathname = pathSite ? `/${segments.slice(1).join('/')}` : requestUrl.pathname;
  return { site: requestUrl.searchParams.get('site') || pathSite, basePath: pathSite ? `/${encodeURIComponent(pathSite)}` : '', pathname: pathname || '/' };
}

async function siteData(host, site, language) {
  const url = new URL('/api/v1/public/site', apiOrigin);
  if (site) url.searchParams.set('site', site);
  if (language) url.searchParams.set('lang', language);
  const result = await fetch(url, { headers: { host: new URL(apiOrigin).host, 'x-forwarded-host': host } });
  if (!result.ok) return null;
  const payload = await result.json();
  return payload.data || payload;
}

function renderHtml(data, requestUrl, host, route) {
  if (!data) return renderInitialDocument(indexTemplate);
  const pathProductId = route.pathname.match(/^\/products\/([^/]+)$/)?.[1];
  const product = pathProductId ? data.products?.find(item => item.id === pathProductId) : null;
  const seo = data.seo || {};
  const locale = data.locale || data.site.defaultLanguage;
  const messages = data.i18n?.messages?.[locale] || {};
  const sourceMessages = data.i18n?.messages?.[data.site.defaultLanguage] || data.i18n?.messages?.[data.i18n?.sourceLocale || 'zh_CN'] || {};
  const t = (key, fallback) => messages[key] || sourceMessages[key] || fallback;
  const origin = `https://${host.split(':')[0]}`;
  const languageQuery = `?lang=${encodeURIComponent(locale)}`;
  const canonicalBase = product ? `${origin}${route.basePath}/products/${encodeURIComponent(product.id)}` : (seo.canonicalUrl || `${origin}${route.basePath}/`);
  const canonical = `${canonicalBase}${canonicalBase.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`;
  const metadata = resolveStorefrontMetadata({ data, locale, product, canonical });
  const { title, description, keywords, siteName, productName, image, faviconUrl, robots } = metadata;
  const languages = data.site.supportedLanguages || [data.site.defaultLanguage];
  const alternates = languages.map(language => `<link rel="alternate" hreflang="${escapeHtml(language.replace('_', '-'))}" href="${escapeHtml(canonicalBase)}${canonicalBase.includes('?') ? '&' : '?'}lang=${escapeHtml(language)}">`).join('');
  const schema = product
    ? { '@context': 'https://schema.org', '@type': 'Product', name: productName, description, image: image ? [image] : undefined, sku: product.sku, brand: { '@type': 'Brand', name: siteName }, offers: product.priceVisible ? { '@type': 'Offer', priceCurrency: data.site.defaultCurrency, price: String(product.price).split('～')[0], availability: 'https://schema.org/InStock', url: canonical } : undefined }
    : { '@context': 'https://schema.org', '@type': 'Organization', name: siteName, url: canonical, description, logo: image || undefined };
  const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : ''}<meta name="robots" content="${escapeHtml(robots)}"><link rel="canonical" href="${escapeHtml(canonical)}">${faviconUrl ? `<link rel="icon" href="${escapeHtml(faviconUrl)}">` : ''}${alternates}<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="${product ? 'product' : 'website'}">${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">` : ''}<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  const products = (product ? [product] : data.products || []).slice(0, 24).map(item => { const name = t(`product:${item.id}:name`, item.nameZh); return `<article><h2>${escapeHtml(name)}</h2><p>${escapeHtml(t(`product:${item.id}:description`, item.description || ''))}</p><a aria-label="${escapeHtml(t('system:products.viewDetail', 'View {name} details').replace('{name}', name))}" href="${route.basePath}/products/${encodeURIComponent(item.id)}${languageQuery}">${escapeHtml(name)}</a></article>`; }).join('');
  const body = `<main data-server-seo><h1>${escapeHtml(product ? productName : siteName)}</h1><p>${escapeHtml(description)}</p>${products}</main>`;
  return renderInitialDocument(indexTemplate, head, body);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://local');
  const requestHost = effectiveHost(request.headers);
  const route = requestRoute(requestHost, url);
  if (url.pathname === '/healthz') { response.writeHead(200, { ...securityHeaders, 'content-type': 'text/plain' }); return response.end('ok'); }
  if (url.pathname.startsWith('/api/')) return proxy(request, response, request.url, requestHost);
  if (route.pathname === '/sitemap.xml') return proxy(request, response, `/api/v1/public/sitemap.xml${route.site ? `?site=${encodeURIComponent(route.site)}` : ''}`, requestHost);
  if (route.pathname === '/robots.txt') return proxy(request, response, `/api/v1/public/robots.txt${route.site ? `?site=${encodeURIComponent(route.site)}` : ''}`, requestHost);
  const filePath = normalize(join(root, url.pathname));
  if (filePath.startsWith(root) && url.pathname !== '/') {
    try {
      if ((await stat(filePath)).isFile()) {
        response.writeHead(200, { ...securityHeaders, 'content-type': mime[extname(filePath)] || 'application/octet-stream', 'cache-control': 'public, max-age=2592000, immutable' });
        return createReadStream(filePath).pipe(response);
      }
    } catch {}
  }
  try {
    const data = await siteData(requestHost, route.site, url.searchParams.get('lang'));
    response.writeHead(data ? 200 : 404, { ...securityHeaders, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
    response.end(renderHtml(data, url, requestHost, route));
  } catch (error) {
    console.error(`Storefront rendering failed: ${error?.code || 'UNKNOWN'} ${error?.message || error}`);
    response.writeHead(503, { ...securityHeaders, 'content-type': 'text/html; charset=utf-8' });
    response.end(renderInitialDocument(indexTemplate));
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Storefront server listening on ${port}`));
