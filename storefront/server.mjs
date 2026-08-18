import http from 'node:http';
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = new URL('./dist/', import.meta.url).pathname;
const apiOrigin = process.env.API_INTERNAL_URL || 'http://api:3000';
const port = Number(process.env.PORT || 80);
const indexTemplate = await readFile(join(root, 'index.html'), 'utf8');
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function proxy(request, response, targetPath = request.url) {
  const target = new URL(targetPath, apiOrigin);
  const requestUpstream = target.protocol === 'https:' ? https.request : http.request;
  const upstream = requestUpstream(target, { method: request.method, headers: { ...request.headers, host: target.host, 'x-forwarded-host': request.headers.host || '' } }, result => {
    response.writeHead(result.statusCode || 502, result.headers);
    result.pipe(response);
  });
  upstream.on('error', () => { response.writeHead(502); response.end('Upstream unavailable'); });
  request.pipe(upstream);
}

async function siteData(host, query) {
  const preview = query.get('site');
  const url = new URL('/api/v1/public/site', apiOrigin);
  if (preview) url.searchParams.set('site', preview);
  const result = await fetch(url, { headers: { host: new URL(apiOrigin).host, 'x-forwarded-host': host } });
  if (!result.ok) return null;
  const payload = await result.json();
  return payload.data || payload;
}

function renderHtml(data, requestUrl, host) {
  if (!data) return indexTemplate;
  const pathProductId = requestUrl.pathname.match(/^\/products\/([^/]+)$/)?.[1];
  const product = pathProductId ? data.products?.find(item => item.id === pathProductId) : null;
  const seo = data.seo || {};
  const origin = `https://${host.split(':')[0]}`;
  const canonical = product ? `${origin}/products/${encodeURIComponent(product.id)}` : (seo.canonicalUrl || `${origin}/`);
  const title = product ? (product.seoTitle || `${product.nameEn || product.nameZh}｜${data.site.name}`) : (seo.title || `${data.site.name}｜官方网站`);
  const description = product ? (product.seoDescription || product.description || '') : (seo.description || `浏览${data.site.name}的产品与服务。`);
  const image = product?.seoImage || product?.img || seo.shareImage || data.products?.[0]?.img || '';
  const languages = data.site.supportedLanguages || [data.site.defaultLanguage];
  const alternates = languages.map(language => `<link rel="alternate" hreflang="${escapeHtml(language)}" href="${canonical}?lang=${escapeHtml(language)}">`).join('');
  const schema = product
    ? { '@context': 'https://schema.org', '@type': 'Product', name: product.nameEn || product.nameZh, description, image: image ? [image] : undefined, sku: product.sku, brand: { '@type': 'Brand', name: data.site.name }, offers: product.priceVisible ? { '@type': 'Offer', priceCurrency: data.site.defaultCurrency, price: String(product.price).split('–')[0], availability: 'https://schema.org/InStock', url: canonical } : undefined }
    : { '@context': 'https://schema.org', '@type': 'Organization', name: data.site.name, url: canonical, description, logo: image || undefined };
  const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${escapeHtml(seo.robots || 'index,follow,max-image-preview:large')}"><link rel="canonical" href="${escapeHtml(canonical)}">${alternates}<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="${product ? 'product' : 'website'}">${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  const products = (product ? [product] : data.products || []).slice(0, 24).map(item => `<article><h2>${escapeHtml(item.nameEn || item.nameZh)}</h2><p>${escapeHtml(item.description || '')}</p><a href="/products/${encodeURIComponent(item.id)}">查看产品</a></article>`).join('');
  const body = `<main data-server-seo><h1>${escapeHtml(product ? (product.nameEn || product.nameZh) : data.site.name)}</h1><p>${escapeHtml(description)}</p>${products}</main>`;
  return indexTemplate.replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://local');
  if (url.pathname === '/healthz') { response.writeHead(200, { 'content-type': 'text/plain' }); return response.end('ok'); }
  if (url.pathname.startsWith('/api/')) return proxy(request, response);
  if (url.pathname === '/sitemap.xml') return proxy(request, response, '/api/v1/public/sitemap.xml');
  if (url.pathname === '/robots.txt') return proxy(request, response, '/api/v1/public/robots.txt');
  const filePath = normalize(join(root, url.pathname));
  if (filePath.startsWith(root) && url.pathname !== '/') {
    try {
      if ((await stat(filePath)).isFile()) {
        response.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream', 'cache-control': 'public, max-age=2592000, immutable' });
        return createReadStream(filePath).pipe(response);
      }
    } catch {}
  }
  try {
    const data = await siteData(request.headers.host || 'localhost', url.searchParams);
    response.writeHead(data ? 200 : 404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, stale-while-revalidate=300', 'x-content-type-options': 'nosniff' });
    response.end(renderHtml(data, url, request.headers.host || 'localhost'));
  } catch {
    response.writeHead(503, { 'content-type': 'text/html; charset=utf-8' });
    response.end(indexTemplate);
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Storefront server listening on ${port}`));
