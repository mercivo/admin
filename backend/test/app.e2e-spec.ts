import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/auth/user.entity';
import { Site } from '../src/modules/site/site.entity';
import { Tenant } from '../src/modules/site/tenant.entity';
import { ChatSession } from '../src/modules/chat/chat-session.entity';
import { ChatMessage } from '../src/modules/chat/chat-message.entity';
import Redis from 'ioredis';

jest.setTimeout(30000);

describe('Mercivo API (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let systemToken: string;
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '3307';
    process.env.DB_USERNAME = 'root';
    process.env.DB_PASSWORD = 'seo_platform_2024';
    process.env.DB_DATABASE = 'seo_platform';
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6380';
    process.env.JWT_SECRET = 'seo-jwt-secret-change-in-production';
    process.env.AUTH_CAPTCHA_DEBUG_ENABLED = 'true';
    process.env.SYSTEM_ADMIN_USERNAME = 'admin';
    process.env.SYSTEM_ADMIN_PASSWORD = 'aihubflux@2026';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => {
    if (app) {
      await app.get<Redis>('CAPTCHA_REDIS').quit();
      await app.close();
    }
  });

  it('serves a published storefront without authentication', () => request(app.getHttpServer()).get('/api/v1/public/site').set('Host', 'localhost').expect(200));
  it('rejects slug overrides on production storefront hosts', () => request(app.getHttpServer()).get('/api/v1/public/site?site=eco-bags').set('Host', 'tenant.example.com').expect(400));
  it('isolates public chat sessions by site and visitor', async () => {
    const first = await request(app.getHttpServer()).post('/api/v1/chat/public/send').set('Host', 'localhost').send({ visitorId: `visitor-a-${Date.now()}`, text: 'MOQ?' }).expect(201);
    const second = await request(app.getHttpServer()).post('/api/v1/chat/public/send').set('Host', 'localhost').send({ visitorId: `visitor-b-${Date.now()}`, sessionId: first.body.data?.sessionId || first.body.sessionId, text: 'Price?' }).expect(201);
    const firstData = first.body.data || first.body;
    const secondData = second.body.data || second.body;
    expect(firstData.sessionId).not.toBe(secondData.sessionId);
    const ds = app.get(DataSource);
    await ds.getRepository(ChatMessage).delete([{ sessionId: firstData.sessionId }, { sessionId: secondData.sessionId }]);
    await ds.getRepository(ChatSession).delete([firstData.sessionId, secondData.sessionId]);
  });
  it('rejects protected APIs without a token', () => request(app.getHttpServer()).get('/api/v1/product').expect(401));
  it('logs in and returns tenant context', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ account: '13800000000', password: 'TenantAdmin@2026' }).expect(201);
    token = response.body.accessToken || response.body.data?.accessToken;
    expect(token).toBeTruthy();
  });
  it('returns only products belonging to the authenticated site', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/product').set('Authorization', `Bearer ${token}`).expect(200);
    const products = response.body.data || response.body;
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((item: { siteId: string }) => Boolean(item.siteId))).toBe(true);
  });
  it('drives the tenant operations console through real APIs', async () => {
    const server = app.getHttpServer();
    const auth = { Authorization: `Bearer ${token}` };
    const suffix = Date.now().toString(36);

    const dashboard = await request(server).get('/api/v1/dashboard/stats').set(auth).expect(200);
    expect(dashboard.body.data || dashboard.body).toMatchObject({ totalProducts: expect.any(Number), totalLeads: expect.any(Number), aiChats: expect.any(Number), customerValue: expect.any(Number) });

    const productResponse = await request(server).post('/api/v1/product').set(auth).send({ nameZh: '自动化测试商品', nameEn: 'Automated Product', sku: `E2E-${suffix}`, price: '$9.90', stock: 30, moq: 3, status: 'draft', category: 'eco', img: 'photo-test', hot: false }).expect(201);
    const product = productResponse.body.data || productResponse.body;
    await request(server).put(`/api/v1/product/${product.id}`).set(auth).send({ stock: 36, status: 'published' }).expect(200).expect(response => expect((response.body.data || response.body).stock).toBe(36));
    await request(server).put(`/api/v1/product/${product.id}/seo`).set(auth).send({ seoTitle: 'Automated SEO title', seoDescription: 'Automated SEO description' }).expect(200);
    await request(server).get(`/api/v1/product/${product.id}/seo`).set(auth).expect(200).expect(response => expect((response.body.data || response.body).seoTitle).toBe('Automated SEO title'));

    const leadResponse = await request(server).post('/api/v1/lead').set(auth).send({ name: '自动化客户', company: '自动化企业', email: `lead-${suffix}@example.com`, phone: '+8613800000001', country: 'China', product: 'Automated Product', summary: '端到端测试线索', status: 'new', score: 90, tag: 'E2E' }).expect(201);
    const lead = leadResponse.body.data || leadResponse.body;
    await request(server).put(`/api/v1/lead/${lead.id}`).set(auth).send({ assignedTo: 'Alex Johnson' }).expect(200).expect(response => expect((response.body.data || response.body).assignedTo).toBe('Alex Johnson'));
    const conversion = await request(server).post(`/api/v1/lead/${lead.id}/convert`).set(auth).expect(201);
    const conversionData = conversion.body.data || conversion.body;
    expect(conversionData.lead.status).toBe('converted');
    expect(conversionData.customer.email).toBe(`lead-${suffix}@example.com`);
    await request(server).get('/api/v1/customers/levels/rules').set(auth).expect(200).expect(response => expect((response.body.data || response.body)).toHaveLength(4));

    const sitesResponse = await request(server).get('/api/v1/admin/sites').set(auth).expect(200);
    const sites = sitesResponse.body.data || sitesResponse.body;
    expect(sites.length).toBeGreaterThan(0);
    await request(server).get(`/api/v1/admin/sites/${sites[0].id}/versions`).set(auth).expect(200);

    const originalSettingsResponse = await request(server).get('/api/v1/workspace/config/settings').set(auth).expect(200);
    const originalSettings = originalSettingsResponse.body.data || originalSettingsResponse.body;
    await request(server).put('/api/v1/workspace/config/settings').set(auth).send({ value: { ...originalSettings, automationVerifiedAt: suffix } }).expect(200);
    await request(server).get('/api/v1/workspace/config/settings').set(auth).expect(200).expect(response => expect((response.body.data || response.body).automationVerifiedAt).toBe(suffix));
    await request(server).put('/api/v1/workspace/config/settings').set(auth).send({ value: originalSettings }).expect(200);

    const memberResponse = await request(server).post('/api/v1/workspace/team').set(auth).send({ name: 'E2E Operator', email: `operator-${suffix}@example.com`, role: 'viewer' }).expect(201);
    const member = memberResponse.body.data || memberResponse.body;
    await request(server).put(`/api/v1/workspace/team/${member.id}`).set(auth).send({ role: 'editor' }).expect(200);
    await request(server).delete(`/api/v1/workspace/team/${member.id}`).set(auth).expect(200);

    const knowledgeResponse = await request(server).post('/api/v1/workspace/knowledge').set(auth).send({ name: `e2e-${suffix}.pdf`, type: 'PDF', size: '1 KB' }).expect(201);
    const knowledge = knowledgeResponse.body.data || knowledgeResponse.body;
    await request(server).delete(`/api/v1/workspace/knowledge/${knowledge.id}`).set(auth).expect(200);

    const agentsResponse = await request(server).get('/api/v1/agent').set(auth).expect(200);
    const agents = agentsResponse.body.data || agentsResponse.body;
    expect(agents.length).toBeGreaterThan(0);
    const originalAgentStatus = agents[0].status;
    await request(server).put(`/api/v1/agent/${agents[0].agentId}`).set(auth).send({ status: originalAgentStatus === 'paused' ? 'active' : 'paused' }).expect(200);
    await request(server).put(`/api/v1/agent/${agents[0].agentId}`).set(auth).send({ status: originalAgentStatus }).expect(200);

    const dictTypeId = `e2e-${suffix}`;
    await request(server).post('/api/v1/dict/types').set(auth).send({ typeId: dictTypeId, label: '自动化字典', icon: '🧪' }).expect(201);
    await request(server).post(`/api/v1/dict/${dictTypeId}/entries`).set(auth).send({ code: 'enabled', label: '启用', sort: 1, status: 'enabled', remark: 'E2E' }).expect(201);
    await request(server).put(`/api/v1/dict/${dictTypeId}/entries/enabled`).set(auth).send({ label: '已启用' }).expect(200);
    await request(server).get('/api/v1/dict/tree').set(auth).expect(200).expect(response => expect((response.body.data || response.body).some((item: { id: string }) => item.id === dictTypeId)).toBe(true));
    await request(server).delete(`/api/v1/dict/types/${dictTypeId}`).set(auth).expect(200);

    await request(server).delete(`/api/v1/customers/${conversionData.customer.id}`).set(auth).expect(200);
    await request(server).delete(`/api/v1/lead/${lead.id}`).set(auth).expect(200);
    await request(server).delete(`/api/v1/product/${product.id}`).set(auth).expect(200);
  });
  it('rejects bot-filled inquiry honeypots', () => request(app.getHttpServer()).post('/api/v1/public/inquiries').set('Host', 'localhost').send({ name: 'Bot User', email: 'bot@example.com', requirements: 'Bulk product request', website: 'spam.example' }).expect(400));
  it('provides a graphical one-time captcha', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/captcha').expect(200);
    expect(response.body.image || response.body.data?.image).toMatch(/^data:image\/svg\+xml;base64,/);
  });
  it('registers a tenant with a one-time graphical captcha and can log in', async () => {
    const captchaResponse = await request(app.getHttpServer()).get('/api/v1/auth/captcha').expect(200);
    const captcha = captchaResponse.body.data || captchaResponse.body;
    const phone = `139${Date.now().toString().slice(-8)}`;
    const registration = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ phone, password: 'Registered@2026', tenantName: 'E2E 临时商户', captchaId: captcha.captchaId, captchaCode: captcha.debugCode }).expect(201);
    const data = registration.body.data || registration.body;
    expect(data.user.role).toBe('admin');
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ phone: `137${Date.now().toString().slice(-8)}`, password: 'Registered@2026', tenantName: '重复验证码', captchaId: captcha.captchaId, captchaCode: captcha.debugCode }).expect(400);
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({ account: phone, password: 'Registered@2026' }).expect(201);
    const ds = app.get(DataSource);
    await ds.getRepository(User).delete({ id: data.user.userId });
    await ds.getRepository(Site).delete({ id: data.user.siteId });
    await ds.getRepository(Tenant).delete({ id: data.user.tenantId });
  });
  it('allows the separate system administrator to inspect all tenants', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ account: 'admin', password: 'aihubflux@2026' }).expect(201);
    systemToken = login.body.accessToken || login.body.data?.accessToken;
    const response = await request(app.getHttpServer()).get('/api/v1/system/overview').set('Authorization', `Bearer ${systemToken}`).expect(200);
    expect((response.body.data || response.body).totalTenants).toBeGreaterThan(0);
  });
  it('forbids tenant administrators from system APIs', () => request(app.getHttpServer()).get('/api/v1/system/tenants').set('Authorization', `Bearer ${token}`).expect(403));
  it('applies tenant suspension immediately to existing tokens', async () => {
    const tenantsResponse = await request(app.getHttpServer()).get('/api/v1/system/tenants').set('Authorization', `Bearer ${systemToken}`).expect(200);
    const tenants = tenantsResponse.body.data || tenantsResponse.body;
    const demo = tenants.find((item: { slug: string }) => item.slug === 'mercivo-demo');
    expect(demo).toBeTruthy();
    try {
      await request(app.getHttpServer()).patch(`/api/v1/system/tenants/${demo.id}`).set('Authorization', `Bearer ${systemToken}`).send({ status: 'suspended' }).expect(200);
      await request(app.getHttpServer()).get('/api/v1/product').set('Authorization', `Bearer ${token}`).expect(401);
      await request(app.getHttpServer()).get('/api/v1/public/site').set('Host', 'localhost').expect(404);
    } finally {
      await request(app.getHttpServer()).patch(`/api/v1/system/tenants/${demo.id}`).set('Authorization', `Bearer ${systemToken}`).send({ status: 'active' }).expect(200);
    }
  });
});
