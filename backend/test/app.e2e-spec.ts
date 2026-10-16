import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import request = require('supertest');
import { AppModule } from '../src/app.module';

const localEnvironment = dotenv.config({ path: '../.env.local', quiet: true }).parsed || {};
jest.setTimeout(60_000);

const unwrap = <T>(body: T | { data: T }): T => body && typeof body === 'object' && 'data' in body ? body.data : body as T;
const decodeCaptcha = (image: string) => [...Buffer.from(image.split(',')[1], 'base64').toString('utf8').matchAll(/<text\b[^>]*>([^<])<\/text>/g)].map(match => match[1]).join('');

describe('Mercivo API real-database integration (e2e)', () => {
  let app: INestApplication;
  let tenantToken = '';
  let systemToken = '';
  let tenantId = '';
  let siteId = '';
  let siteSlug = '';
  const runId = process.env.E2E_RUN_ID || `API-E2E-${Date.now()}`;
  const phone = `139${Date.now().toString().slice(-8)}`;
  const password = process.env.E2E_TENANT_PASSWORD || 'Mercivo@E2E2026';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = process.env.E2E_DB_HOST || '127.0.0.1';
    process.env.DB_PORT = process.env.E2E_DB_PORT || process.env.DB_HOST_PORT || '3307';
    process.env.DB_USERNAME = process.env.E2E_DB_USERNAME || process.env.DB_USERNAME || 'root';
    process.env.DB_PASSWORD = process.env.E2E_DB_PASSWORD || localEnvironment.DB_PASSWORD || process.env.DB_PASSWORD;
    process.env.DB_DATABASE = process.env.E2E_DB_DATABASE || localEnvironment.DB_DATABASE || process.env.DB_DATABASE;
    process.env.JWT_SECRET = process.env.E2E_JWT_SECRET || localEnvironment.JWT_SECRET || process.env.JWT_SECRET;
    process.env.REDIS_HOST = process.env.E2E_REDIS_HOST || '127.0.0.1';
    process.env.REDIS_PORT = process.env.E2E_REDIS_PORT || process.env.REDIS_HOST_PORT || '6381';
    process.env.AUTH_CAPTCHA_DEBUG_ENABLED = 'true';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.getHttpAdapter().getInstance().get('/healthz', (_request: unknown, response: { status: (code: number) => { send: (body: string) => void } }) => response.status(200).send('ok'));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (!app) return;
    await app.get<Redis>('CAPTCHA_REDIS').quit();
    await app.close();
  });

  it('exposes health and protects tenant APIs', async () => {
    await request(app.getHttpServer()).get('/healthz').expect(200);
    await request(app.getHttpServer()).get('/api/v1/product').expect(401);
  });

  it('registers a traceable tenant with a one-time graphical captcha', async () => {
    const captchaResponse = await request(app.getHttpServer()).get('/api/v1/auth/captcha').expect(200);
    const captcha = unwrap<{ captchaId: string; image: string; debugCode?: string }>(captchaResponse.body);
    expect(captcha.image).toMatch(/^data:image\/svg\+xml;base64,/);
    const code = captcha.debugCode || decodeCaptcha(captcha.image);
    expect(code).toHaveLength(4);
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      phone, password, tenantName: `${runId} 集成测试商户`, captchaId: captcha.captchaId, captchaCode: code,
    }).expect(201);
    const registration = unwrap<{ accessToken: string; user: { role: string; tenantId: string; siteId: string } }>(response.body);
    tenantToken = registration.accessToken;
    tenantId = registration.user.tenantId;
    siteId = registration.user.siteId;
    expect(registration.user.role).toBe('admin');
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      phone: `137${Date.now().toString().slice(-8)}`, password, tenantName: `${runId} 重复验证码`, captchaId: captcha.captchaId, captchaCode: code,
    }).expect(400);
  });

  it('authenticates system admin from environment and grants release permissions', async () => {
    const systemPassword = process.env.E2E_SYSTEM_ADMIN_PASSWORD || localEnvironment.SYSTEM_ADMIN_PASSWORD || process.env.SYSTEM_ADMIN_PASSWORD;
    if (!systemPassword) throw new Error('SYSTEM_ADMIN_PASSWORD or E2E_SYSTEM_ADMIN_PASSWORD is required');
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      account: process.env.E2E_SYSTEM_ADMIN_USERNAME || localEnvironment.SYSTEM_ADMIN_USERNAME || process.env.SYSTEM_ADMIN_USERNAME || 'admin', password: systemPassword,
    }).expect(201);
    systemToken = unwrap<{ accessToken: string }>(login.body).accessToken;
    await request(app.getHttpServer()).get('/api/v1/system/overview').set('Authorization', `Bearer ${systemToken}`).expect(200);
    await request(app.getHttpServer()).patch(`/api/v1/system/tenants/${tenantId}`).set('Authorization', `Bearer ${systemToken}`).send({
      maxProducts: 100, maxMembers: 10, maxWarehouses: 5,
      permissions: ['page.dashboard', 'page.products', 'product.create', 'page.product-categories', 'product-category.manage', 'page.site.editor', 'site.edit', 'site.publish', 'site.domain'], permissionsCustomized: true,
    }).expect(200);
    const tenantLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ account: phone, password }).expect(201);
    tenantToken = unwrap<{ accessToken: string }>(tenantLogin.body).accessToken;
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${tenantToken}`).expect(200);
    expect(unwrap<{ tenantId: string }>(me.body).tenantId).toBe(tenantId);
  });

  it('enforces role boundaries and persists tenant-owned data', async () => {
    await request(app.getHttpServer()).get('/api/v1/system/tenants').set('Authorization', `Bearer ${tenantToken}`).expect(403);
    const auth = { Authorization: `Bearer ${tenantToken}` };
    const categoryResponse = await request(app.getHttpServer()).post('/api/v1/product-categories').set(auth).send({
      label: `${runId} 集成分类`, sort: 10, status: 'enabled', remark: runId,
    }).expect(201);
    const category = unwrap<{ code: string }>(categoryResponse.body);
    const created = await request(app.getHttpServer()).post('/api/v1/product').set(auth).send({
      nameZh: `${runId} 集成商品`, sku: `${runId}-SKU`, price: '19.90', basePrice: 19.9,
      stock: 0, moq: 1, status: 'pending', category: category.code, img: 'https://image.aihubflux.com/local/api-e2e-placeholder.webp',
    }).expect(201);
    expect(unwrap<{ siteId: string }>(created.body).siteId).toBe(siteId);
    const list = await request(app.getHttpServer()).get(`/api/v1/product?keyword=${encodeURIComponent(runId)}`).set(auth).expect(200);
    const result = unwrap<{ items?: Array<{ siteId: string }> } | Array<{ siteId: string }>>(list.body);
    const items = Array.isArray(result) ? result : result.items || [];
    expect(items.some(item => item.siteId === siteId)).toBe(true);
  });

  it('publishes and serves the registered site', async () => {
    const auth = { Authorization: `Bearer ${tenantToken}` };
    await request(app.getHttpServer()).post(`/api/v1/admin/sites/${siteId}/publish`).set(auth).send({ releaseNote: `${runId} 集成发布` }).expect(201);
    const response = await request(app.getHttpServer()).get('/api/v1/admin/sites').set(auth).expect(200);
    const sites = unwrap<Array<{ id: string; slug: string }>>(response.body);
    siteSlug = sites.find(site => site.id === siteId)?.slug || '';
    expect(siteSlug).toBeTruthy();
    const publishedBeforeLiveData = await request(app.getHttpServer()).get(`/api/v1/public/site?site=${encodeURIComponent(siteSlug)}`).set('Host', 'localhost').expect(200);
    const publishedVersionId = unwrap<{ versionId: string }>(publishedBeforeLiveData.body).versionId;
    const liveCategoryResponse = await request(app.getHttpServer()).post('/api/v1/product-categories').set(auth).send({
      label: `${runId} 发布后实时分类`, sort: 20, status: 'enabled', remark: runId,
    }).expect(201);
    const liveCategory = unwrap<{ code: string; label: string }>(liveCategoryResponse.body);
    const liveProductResponse = await request(app.getHttpServer()).post('/api/v1/product').set(auth).send({
      nameZh: `${runId} 发布后实时商品`, sku: `${runId}-LIVE-SKU`, price: '39.90', basePrice: 39.9,
      stock: 20, moq: 2, status: 'published', category: liveCategory.code, img: 'https://image.aihubflux.com/local/api-e2e-live.webp',
    }).expect(201);
    const liveProduct = unwrap<{ id: string }>(liveProductResponse.body);
    const publishedAfterLiveDataResponse = await request(app.getHttpServer()).get(`/api/v1/public/site?site=${encodeURIComponent(siteSlug)}`).set('Host', 'localhost').expect(200);
    const publishedAfterLiveData = unwrap<{ versionId: string; products: Array<{ id: string; nameZh: string; category: string }>; categories: Array<{ code: string; label: string }> }>(publishedAfterLiveDataResponse.body);
    expect(publishedAfterLiveData.versionId).toBe(publishedVersionId);
    expect(publishedAfterLiveData.products).toContainEqual(expect.objectContaining({ id: liveProduct.id, nameZh: `${runId} 发布后实时商品`, category: liveCategory.code }));
    expect(publishedAfterLiveData.categories).toContainEqual(expect.objectContaining({ code: liveCategory.code, label: `${runId} 发布后实时分类` }));
    const customDomain = `${tenantId}.localhost`;
    const domainResponse = await request(app.getHttpServer()).post(`/api/v1/admin/sites/${siteId}/domains`).set(auth).send({ hostname: customDomain, isPrimary: true }).expect(201);
    expect(unwrap<{ status: string; sslStatus: string }>(domainResponse.body)).toMatchObject({ status: 'active', sslStatus: 'active' });
    const customDomainSite = await request(app.getHttpServer()).get('/api/v1/public/site').set('Host', customDomain).expect(200);
    expect(unwrap<{ siteId: string }>(customDomainSite.body).siteId).toBe(siteId);
    const forwardedDomainSite = await request(app.getHttpServer()).get('/api/v1/public/site').set('Host', 'api:8080').set('X-Forwarded-Host', `${customDomain}:443`).expect(200);
    expect(unwrap<{ siteId: string }>(forwardedDomainSite.body).siteId).toBe(siteId);
    await request(app.getHttpServer()).get('/api/v1/public/site?site=invalid').set('Host', 'tenant.example.com').expect(400);
  });

  it('invalidates existing tokens while suspended and restores access', async () => {
    const auth = { Authorization: `Bearer ${systemToken}` };
    await request(app.getHttpServer()).patch(`/api/v1/system/tenants/${tenantId}`).set(auth).send({ status: 'suspended' }).expect(200);
    await request(app.getHttpServer()).get('/api/v1/product').set('Authorization', `Bearer ${tenantToken}`).expect(401);
    await request(app.getHttpServer()).get(`/api/v1/public/site?site=${encodeURIComponent(siteSlug)}`).set('Host', 'localhost').expect(404);
    await request(app.getHttpServer()).patch(`/api/v1/system/tenants/${tenantId}`).set(auth).send({ status: 'active' }).expect(200);
    await request(app.getHttpServer()).get('/api/v1/product').set('Authorization', `Bearer ${tenantToken}`).expect(200);
  });

  it('keeps removed CRM and AI endpoints unavailable', async () => {
    await request(app.getHttpServer()).get('/api/v1/agent').expect(404);
    await request(app.getHttpServer()).get('/api/v1/opportunities').expect(404);
    await request(app.getHttpServer()).post('/api/v1/chat/public/send').expect(404);
  });
});
