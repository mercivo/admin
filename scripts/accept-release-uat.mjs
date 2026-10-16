const apiBase = process.env.UAT_API_BASE || 'http://localhost:3000/api/v1';
const runId = process.env.UAT_RUN_ID || `UAT-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
const phone = process.env.UAT_PHONE || `139${Date.now().toString().slice(-8)}`;
const password = process.env.UAT_PASSWORD || 'Mercivo@UAT2026';

const ids = { runId, phone };
const checks = [];

function unwrap(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

async function request(path, { method = 'GET', token, body, expected = [200, 201], headers = {} } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} expected ${expected.join('/')} but got ${response.status}: ${text.slice(0, 500)}`);
  }
  checks.push(`${method} ${path} -> ${response.status}`);
  return unwrap(payload);
}

function captchaCode(image) {
  const encoded = image.split(',')[1];
  const svg = Buffer.from(encoded, 'base64').toString('utf8');
  const chars = [...svg.matchAll(/<text\b[^>]*>([^<])<\/text>/g)].map(match => match[1]);
  if (chars.length !== 4) throw new Error('Unable to decode the generated SVG captcha');
  return chars.join('');
}

function items(value) {
  if (Array.isArray(value)) return value;
  return value?.items || value?.records || value?.list || [];
}

async function main() {
  await request('/healthz', { expected: [200] }).catch(async () => {
    const response = await fetch('http://localhost:3000/healthz');
    if (!response.ok) throw new Error(`healthz returned ${response.status}`);
    checks.push('GET /healthz -> 200');
  });

  const captcha = await request('/auth/captcha');
  const registration = await request('/auth/register', {
    method: 'POST',
    body: { phone, password, tenantName: `${runId} 验收商户`, captchaId: captcha.captchaId, captchaCode: captchaCode(captcha.image) },
  });
  let token = registration.accessToken;
  Object.assign(ids, registration.user, { tenantName: `${runId} 验收商户` });
  if (!token || !registration.user?.tenantId || !registration.user?.siteId) throw new Error('Registration did not return complete tenant context');

  const systemPassword = process.env.UAT_SYSTEM_ADMIN_PASSWORD;
  if (!systemPassword) throw new Error('UAT_SYSTEM_ADMIN_PASSWORD is required');
  const systemLogin = await request('/auth/login', { method: 'POST', body: { account: process.env.UAT_SYSTEM_ADMIN_USERNAME || 'admin', password: systemPassword } });
  const systemToken = systemLogin.accessToken;
  await request('/system/overview', { token: systemToken });
  await request(`/system/tenants/${registration.user.tenantId}`, {
    method: 'PATCH', token: systemToken,
    body: {
      maxProducts: 100,
      maxMembers: 10,
      maxWarehouses: 5,
      permissions: [...new Set([...(registration.tenant?.permissions || []), 'site.publish'])],
      permissionsCustomized: true,
    },
  });

  const refreshedLogin = await request('/auth/login', { method: 'POST', body: { account: phone, password } });
  token = refreshedLogin.accessToken;
  await request('/auth/me', { token });
  await request('/workspace/settings/site-info', {
    method: 'PUT', token, body: { name: `${runId} 独立站`, description: '第一版上线验收站点' },
  });
  await request('/workspace/settings/site-languages', {
    method: 'PUT', token, body: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'] },
  });

  const category = await request('/product-categories', {
    method: 'POST', token, body: { label: `${runId} 验收分类`, sort: 10, status: 'enabled', remark: runId },
  });
  ids.categoryCode = category.code;
  const product = await request('/product', {
    method: 'POST', token,
    body: {
      nameZh: `${runId} 验收商品`, sku: `${runId}-SKU`, description: '<p>全链路验收商品</p>',
      price: '99.00', basePrice: 99, stock: 0, moq: 1, status: 'published', category: category.code,
      img: 'https://image.aihubflux.com/local/uat-placeholder.webp', hot: true, tags: ['UAT'],
      variants: [{ specification: '规格', option: '标准', stock: 0, surcharge: 0 }],
    },
  });
  ids.productId = product.id;
  await request(`/product/${product.id}/seo`, {
    method: 'PUT', token, body: { seoTitle: `${runId} SEO`, seoDescription: '上线验收 SEO', brand: 'Mercivo', enableReviews: true, reviewRating: 5 },
  });

  const customer = await request('/customers', {
    method: 'POST', token, body: { name: `${runId} 验收客户`, email: `buyer-${Date.now()}@example.com`, phone: '13800138000', status: 'active', country: 'CN', notes: runId },
  });
  ids.customerId = customer.id;
  const supplier = await request('/purchase/suppliers', {
    method: 'POST', token, body: { name: `${runId} 验收供应商`, contact: '验收人', phone: '13700137000', email: `supplier-${Date.now()}@example.com`, status: 'active', remark: runId },
  });
  ids.supplierId = supplier.id;

  const warehouses = await request('/inventory/warehouse-options', { token });
  const defaultWarehouse = items(warehouses)[0] || warehouses[0];
  if (!defaultWarehouse?.id) throw new Error('Default warehouse was not created during registration');
  ids.defaultWarehouseId = defaultWarehouse.id;
  const secondWarehouse = await request('/inventory/warehouses', {
    method: 'POST', token, body: { name: `${runId} 备用仓`, contact: '验收人', phone: '13600136000', address: '上海', status: 'active' },
  });
  ids.secondWarehouseId = secondWarehouse.id;

  const purchase = await request('/purchase/orders', {
    method: 'POST', token,
    body: { supplierId: supplier.id, warehouseId: defaultWarehouse.id, currency: 'CNY', taxAmount: 13, shippingFee: 5, remark: runId, lines: [{ productId: product.id, variantKey: 'BASE', quantity: 100, unitPrice: 10 }] },
  });
  ids.purchaseOrderId = purchase.id;
  ids.purchaseOrderNo = purchase.orderNo;
  const confirmedPurchase = await request(`/purchase/orders/${purchase.id}/confirm`, { method: 'PATCH', token, expected: [200, 201, 400] });
  const purchaseLine = confirmedPurchase?.lines?.[0] || purchase.lines?.[0];
  if (!purchaseLine?.id) throw new Error('Purchase order response did not contain a line id');
  const receipt = await request('/purchase/receipts', {
    method: 'POST', token, body: { orderId: purchase.id, remark: runId, lines: [{ orderLineId: purchaseLine.id, quantity: 100 }] },
  });
  ids.purchaseReceiptId = receipt.id;

  const stocks = await request('/inventory/stocks', { token });
  const stocked = items(stocks).find(item => item.productId === product.id && item.warehouseId === defaultWarehouse.id && Number(item.onHand) === 100);
  if (!stocked || Number(stocked.onHand) !== 100) throw new Error(`Purchase inventory invariant failed: ${JSON.stringify(stocked)}`);

  const transfer = await request('/inventory/transfers', {
    method: 'POST', token, body: { sourceWarehouseId: defaultWarehouse.id, destinationWarehouseId: secondWarehouse.id, remark: runId, lines: [{ productId: product.id, variantKey: stocked.variantKey, quantity: 10 }] },
  });
  ids.transferId = transfer.id;
  await request(`/inventory/transfers/${transfer.id}/receive`, { method: 'POST', token });

  const sale = await request('/sales/orders', {
    method: 'POST', token,
    body: { customerId: customer.id, warehouseId: defaultWarehouse.id, currency: 'CNY', discount: 0, shippingFee: 8, shippingAddress: '上海', contactName: '验收客户', contactPhone: '13800138000', remark: runId, lines: [{ productId: product.id, variantKey: stocked.variantKey, quantity: 5, unitPrice: 99 }] },
  });
  ids.salesOrderId = sale.id;
  ids.salesOrderNo = sale.orderNo;
  const confirmedSale = await request(`/sales/orders/${sale.id}/confirm`, { method: 'PATCH', token, expected: [200, 201, 400] });
  const salesLine = confirmedSale?.lines?.[0] || sale.lines?.[0];
  if (!salesLine?.id) throw new Error('Sales order response did not contain a line id');
  const shipment = await request('/sales/shipments', {
    method: 'POST', token, body: { orderId: sale.id, deliveryMethod: 'logistics', logisticsCompany: 'UAT Express', trackingNo: runId, remark: runId, lines: [{ orderLineId: salesLine.id, quantity: 5 }] },
  });
  ids.shipmentId = shipment.id;

  const date = new Date().toISOString().slice(0, 10);
  const payment = await request('/finance/payments', { method: 'POST', token, body: { orderId: purchase.id, amount: 100, paymentMethod: 'bank_transfer', accountName: runId, referenceNo: `${runId}-PAY`, transactionDate: date, remark: runId } });
  ids.paymentId = payment.id;
  await request(`/finance/payments/${payment.id}/confirm`, { method: 'PATCH', token });
  const financeReceipt = await request('/finance/receipts', { method: 'POST', token, body: { orderId: sale.id, amount: 100, paymentMethod: 'bank_transfer', accountName: runId, referenceNo: `${runId}-REC`, transactionDate: date, remark: runId } });
  ids.financeReceiptId = financeReceipt.id;
  await request(`/finance/receipts/${financeReceipt.id}/confirm`, { method: 'PATCH', token });
  await request('/finance/statistics', { token });

  await request('/workspace/team', {
    method: 'POST', token,
    body: { name: `${runId} 验收成员`, phone: `137${Date.now().toString().slice(-8)}`, password: 'Member@UAT2026', permissions: ['page.dashboard'] },
  });

  const published = await request(`/admin/sites/${registration.user.siteId}/publish`, { method: 'POST', token, body: { releaseNote: `${runId} 第一版验收发布` } });
  ids.publishedVersionId = published.id || published.versionId;
  await request(`/admin/sites/${registration.user.siteId}/versions`, { token });
  const siteList = await request('/admin/sites', { token });
  const site = items(siteList).find(item => item.id === registration.user.siteId);
  if (!site?.slug) throw new Error('Published site slug was not returned');
  ids.siteSlug = site.slug;
  await request(`/public/site?site=${encodeURIComponent(site.slug)}`, { expected: [200], headers: { host: 'localhost' } });
  await request(`/public/sitemap.xml?site=${encodeURIComponent(site.slug)}`, { expected: [200], headers: { host: 'localhost' } });
  await request(`/public/robots.txt?site=${encodeURIComponent(site.slug)}`, { expected: [200], headers: { host: 'localhost' } });

  const publicLead = await request(`/public/inquiries?site=${encodeURIComponent(site.slug)}`, {
    method: 'POST', headers: { host: 'localhost' },
    body: { type: 'inquiry', name: `${runId} 询盘客户`, contact: 'lead@example.com', email: 'lead@example.com', productId: product.id, productName: product.nameZh, sourcePage: '/', requirements: `${runId} 询价 500 件` },
  });
  ids.publicLeadId = publicLead.id;
  const managedLead = await request('/storefront/leads', {
    method: 'POST', token,
    body: { type: 'contact', name: `${runId} 后台线索`, contact: 'managed@example.com', email: 'managed@example.com', requirements: `${runId} 后台线索流转` },
  });
  ids.workflowLeadId = managedLead.id;
  await request(`/storefront/leads/${managedLead.id}`, { method: 'PATCH', token, body: { status: 'following', note: `${runId} 已跟进` } });
  await request(`/storefront/leads/${managedLead.id}`, { method: 'PATCH', token, body: { status: 'closed', note: `${runId} 已完成`, closeReason: '验收闭环' } });

  await request('/system/overview', { token, expected: [403] });
  await request('/product', { expected: [401] });

  console.log(JSON.stringify({ status: 'PASS', runId, checks: checks.length, ids }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ status: 'FAIL', runId, checks: checks.length, ids, error: error.message }, null, 2));
  process.exitCode = 1;
});
