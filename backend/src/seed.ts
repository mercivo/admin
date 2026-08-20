import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Product } from './modules/product/product.entity';
import { Lead } from './modules/lead/lead.entity';
import { DictType } from './modules/dict/dict-type.entity';
import { DictEntry } from './modules/dict/dict-entry.entity';
import { Agent } from './modules/agent/agent.entity';
import { Testimonial } from './modules/storefront/testimonial.entity';
import { AppConfig } from './modules/workspace/app-config.entity';
import { TeamMember } from './modules/workspace/team-member.entity';
import { KnowledgeFile } from './modules/workspace/knowledge-file.entity';
import { ChatSession } from './modules/chat/chat-session.entity';
import { ChatMessage } from './modules/chat/chat-message.entity';
import { Tenant } from './modules/site/tenant.entity';
import { Site } from './modules/site/site.entity';
import { SiteDomain } from './modules/site/site-domain.entity';
import { SiteVersion } from './modules/site/site-version.entity';
import { User } from './modules/auth/user.entity';
import { hashPassword } from './modules/auth/password.util';

dotenv.config();

async function seed() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'seo_platform',
    extra: {
      connectionLimit: parseInt(process.env.DB_POOL_MAX || '5', 10),
      ...(process.env.DB_SOCKET_PATH ? { socketPath: process.env.DB_SOCKET_PATH } : {}),
    },
    entities: [Product, Lead, DictType, DictEntry, Agent, Testimonial, AppConfig, TeamMember, KnowledgeFile, ChatSession, ChatMessage, Tenant, Site, SiteDomain, SiteVersion, User],
    synchronize: process.env.DB_SCHEMA_BOOTSTRAP === 'true',
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  await ds.initialize();
  console.log('Database connected');

  const productRepo = ds.getRepository(Product);
  const leadRepo = ds.getRepository(Lead);
  const dictTypeRepo = ds.getRepository(DictType);
  const dictEntryRepo = ds.getRepository(DictEntry);
  const agentRepo = ds.getRepository(Agent);
  const testimonialRepo = ds.getRepository(Testimonial);
  const configRepo = ds.getRepository(AppConfig);
  const teamRepo = ds.getRepository(TeamMember);
  const knowledgeRepo = ds.getRepository(KnowledgeFile);
  const sessionRepo = ds.getRepository(ChatSession);
  const messageRepo = ds.getRepository(ChatMessage);
  const tenantRepo = ds.getRepository(Tenant);
  const siteRepo = ds.getRepository(Site);
  const domainRepo = ds.getRepository(SiteDomain);
  const versionRepo = ds.getRepository(SiteVersion);
  const userRepo = ds.getRepository(User);

  // The platform administrator is infrastructure data, not demo/business data.
  // Keep it independently configurable so an empty production bootstrap still
  // has a system account without creating a tenant or sample records.
  if (process.env.SYSTEM_ADMIN_BOOTSTRAP_ENABLED !== 'false') {
    const systemUsername = process.env.SYSTEM_ADMIN_USERNAME || 'admin';
    const systemPassword = process.env.SYSTEM_ADMIN_PASSWORD;
    if (!systemPassword || systemPassword.length < 12) throw new Error('SYSTEM_ADMIN_PASSWORD must be configured with at least 12 characters');
    const existingSystemAdmin = await userRepo.findOne({ where: { username: systemUsername } });
    const systemAdminValues = {
      tenantId: null,
      siteId: null,
      phone: null,
      username: systemUsername,
      passwordHash: await hashPassword(systemPassword),
      role: 'system_admin' as const,
      status: 'active' as const,
      lastLoginAt: null,
    };
    if (existingSystemAdmin) {
      await userRepo.save(userRepo.merge(existingSystemAdmin, systemAdminValues));
    } else {
      await userRepo.save(userRepo.create(systemAdminValues));
    }
    console.log('System administrator ensured');
  }

  // Fresh production/test environments may need an empty business database.
  if (process.env.SEED_DATA_ENABLED === 'false') {
    await ds.destroy();
    console.log('Bootstrap completed without demo or business seed data');
    return;
  }

  // ---- Products ----
  const products = [
    { nameZh: '环保购物袋', nameEn: 'Eco Shopping Bag', sku: 'ECO-001', price: '$0.80–$1.20', stock: 50000, moq: 500, status: 'published' as const, category: 'eco', img: 'photo-1542601906990-b4d3fb778b09', hot: true },
    { nameZh: '棉质手提包', nameEn: 'Cotton Tote Bag', sku: 'TOT-002', price: '$1.20–$2.00', stock: 30000, moq: 300, status: 'published' as const, category: 'tote', img: 'photo-1553062407-98eeb64c6a62', hot: false },
    { nameZh: '抽绳袋', nameEn: 'Drawstring Bag', sku: 'DRW-003', price: '$0.50–$0.80', stock: 800, moq: 1000, status: 'draft' as const, category: 'drawstring', img: 'photo-1584917865442-de89df76afd3', hot: false },
    { nameZh: '帆布包', nameEn: 'Canvas Tote Bag', sku: 'CVS-004', price: '$1.50–$2.50', stock: 20000, moq: 200, status: 'published' as const, category: 'tote', img: 'photo-1491637639811-60e2756cc1c7', hot: true },
    { nameZh: '无纺布袋', nameEn: 'Non-woven Bag', sku: 'NWB-005', price: '$0.30–$0.60', stock: 100000, moq: 2000, status: 'published' as const, category: 'eco', img: 'photo-1593642632559-0c6d3fc62b89', hot: false },
    { nameZh: '可重复使用购物袋', nameEn: 'Reusable Grocery Bag', sku: 'RGB-006', price: '$0.90–$1.50', stock: 45000, moq: 500, status: 'published' as const, category: 'eco', img: 'photo-1547949003-9792a18a2601', hot: true },
  ];

  if (await productRepo.count() === 0) {
    for (const p of products) await productRepo.save(p);
  }
  console.log('Products seeded');

  // ---- Leads ----
  const leads = [
    { name: 'Sarah Johnson', company: 'GreenLife Co.', email: 'sarah@greenlife.com', phone: '+1 555-0192', country: 'USA', product: 'Eco Bags', summary: '询问环保袋MOQ，有500个采购需求，希望了解定制印刷方案', status: 'new' as const, score: 85, tag: '高意向' },
    { name: 'Marco Rossi', company: 'EcoShop Italy', email: 'marco@ecoshop.it', phone: '+39 06 1234567', country: 'Italy', product: 'Tote Bags', summary: '要求报价单，已提供公司邮箱，询问印刷定制及交货时间', status: 'contacted' as const, score: 72, tag: '跟进中' },
    { name: 'Yuki Tanaka', company: 'NaturalJP', email: 'yuki@naturaljp.co', phone: '+81 3-1234-5678', country: 'Japan', product: 'Cotton Bags', summary: '已签订购买合同，首批1000个棉质手提包，预付30%货款', status: 'converted' as const, score: 98, tag: '已成交' },
    { name: 'Emma Clarke', company: 'SustainUK', email: 'emma@sustainuk.co', phone: '+44 20 1234 5678', country: 'UK', product: 'Drawstring Bags', summary: '对抽绳袋感兴趣，询问环保认证情况及材料来源', status: 'new' as const, score: 61, tag: '待跟进' },
    { name: 'Carlos Mendez', company: 'EcoMex', email: 'carlos@ecomex.mx', phone: '+52 55 1234 5678', country: 'Mexico', product: 'Eco Bags', summary: '了解产品后要求安排视频通话演示，已预约下周三', status: 'contacted' as const, score: 79, tag: '高意向' },
    { name: 'Annika Johansson', company: 'GreenSweden AB', email: 'annika@greensweden.se', phone: '+46 8 1234567', country: 'Sweden', product: 'Canvas Bags', summary: '大客户，年需求量10万件，要求样品和详细报价', status: 'new' as const, score: 94, tag: '大客户' },
  ];

  if (await leadRepo.count() === 0) {
    for (const l of leads) await leadRepo.save(l);
  }
  console.log('Leads seeded');

  // ---- Dict Types ----
  const dictTypes = [
    { typeId: 'category', label: '商品分类', icon: '📦' },
    { typeId: 'lead-status', label: '线索状态', icon: '👥' },
    { typeId: 'order-status', label: '订单状态', icon: '📋' },
  ];

  if (await dictTypeRepo.count() === 0) {
    for (const dt of dictTypes) await dictTypeRepo.save(dt);
  }

  // ---- Dict Entries ----
  const dictEntries = [
    // category
    { typeId: 'category', code: 'eco', label: '环保袋', sort: 1, status: 'enabled' as const, remark: '可降解环保材质产品', parentCode: null },
    { typeId: 'category', code: 'eco-shopping', label: '购物袋', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { typeId: 'category', code: 'eco-grocery', label: '杂货袋', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { typeId: 'category', code: 'eco-produce', label: '蔬果袋', sort: 3, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { typeId: 'category', code: 'tote', label: '手提包', sort: 2, status: 'enabled' as const, remark: '时尚手提类产品', parentCode: null },
    { typeId: 'category', code: 'tote-cotton', label: '棉质手提包', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'tote' },
    { typeId: 'category', code: 'tote-canvas', label: '帆布手提包', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'tote' },
    { typeId: 'category', code: 'tote-jute', label: '黄麻手提包', sort: 3, status: 'disabled' as const, remark: '', parentCode: 'tote' },
    { typeId: 'category', code: 'drawstring', label: '抽绳袋', sort: 3, status: 'enabled' as const, remark: '抽绳收口类袋包', parentCode: null },
    { typeId: 'category', code: 'draw-sport', label: '运动抽绳袋', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'drawstring' },
    { typeId: 'category', code: 'draw-gift', label: '礼品抽绳袋', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'drawstring' },
    { typeId: 'category', code: 'nonwoven', label: '无纺布袋', sort: 4, status: 'disabled' as const, remark: '无纺布材质', parentCode: null },
    // lead-status
    { typeId: 'lead-status', code: 'new', label: '新线索', sort: 1, status: 'enabled' as const, remark: '刚进入系统的线索', parentCode: null },
    { typeId: 'lead-status', code: 'new-ai', label: 'AI询盘', sort: 1, status: 'enabled' as const, remark: '通过AI助手产生', parentCode: 'new' },
    { typeId: 'lead-status', code: 'new-form', label: '表单提交', sort: 2, status: 'enabled' as const, remark: '官网表单', parentCode: 'new' },
    { typeId: 'lead-status', code: 'new-refer', label: '客户推荐', sort: 3, status: 'enabled' as const, remark: '', parentCode: 'new' },
    { typeId: 'lead-status', code: 'contacted', label: '已联系', sort: 2, status: 'enabled' as const, remark: '已与客户取得联系', parentCode: null },
    { typeId: 'lead-status', code: 'converted', label: '已转化', sort: 3, status: 'enabled' as const, remark: '已成功转化为客户', parentCode: null },
    { typeId: 'lead-status', code: 'lost', label: '已流失', sort: 4, status: 'enabled' as const, remark: '线索已流失', parentCode: null },
    // order-status
    { typeId: 'order-status', code: 'pending', label: '待确认', sort: 1, status: 'enabled' as const, remark: '', parentCode: null },
    { typeId: 'order-status', code: 'confirmed', label: '已确认', sort: 2, status: 'enabled' as const, remark: '', parentCode: null },
    { typeId: 'order-status', code: 'confirmed-deposit', label: '已付定金', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'confirmed' },
    { typeId: 'order-status', code: 'confirmed-full', label: '已付全款', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'confirmed' },
  ];

  if (await dictEntryRepo.count() === 0) {
    for (const de of dictEntries) await dictEntryRepo.save(de as DictEntry);
  }
  console.log('Dictionary seeded');

  // ---- Agents ----
  const agents = [
    { agentId: 'inquiry', name: '询盘智能体', description: '自动接待独立站访客，识别采购意向并将有效询盘沉淀为客户线索', status: 'active' as const, model: 'GPT-4o', lang: '多语言', agentType: 'sales' as const, chats: 0, leads: 0, rate: '—', satisfaction: 0, icon: 'MessageOutlined', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { agentId: 'translation', name: '翻译智能体', description: '将独立站的中文内容生成为目标语言版本，并按站点发布版本缓存', status: 'active' as const, model: 'GPT-4o', lang: '多语言', agentType: 'translation' as const, systemPrompt: '保留品牌名、商品编码、数值和 HTML 结构，使用符合目标市场的自然商业表达。', chats: 0, leads: 0, rate: '—', satisfaction: 0, icon: 'GlobalOutlined', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  ];

  if (await agentRepo.count() === 0) {
    for (const a of agents) await agentRepo.save(a);
  }
  console.log('Agents seeded');

  // ---- Testimonials ----
  const testimonials = [
    { name: 'Sarah Johnson', company: 'GreenLife Co., USA', text: "Exceptional quality and reliable lead times. We've been ordering from EcoBags for 3 years and the consistency is unmatched.", rating: 5, img: 'photo-1494790108377-be9c29b29330', orders: '12,000 pcs/year', sort: 1 },
    { name: 'Marco Rossi', company: 'EcoShop Italy, IT', text: 'The custom printing quality exceeded our expectations. Our customers love the branded bags. Highly recommend!', rating: 5, img: 'photo-1500648767791-00dcc994a43e', orders: '5,000 pcs/order', sort: 2 },
    { name: 'Yuki Tanaka', company: 'NaturalJP, Japan', text: "Fast response, professional team. The eco-certification documentation helped us meet Japan's strict import requirements.", rating: 5, img: 'photo-1438761681033-6461ffad8d80', orders: '8,000 pcs/year', sort: 3 },
  ];

  if (await testimonialRepo.count() === 0) {
    for (const t of testimonials) await testimonialRepo.save(t);
  }
  console.log('Testimonials seeded');

  if (await teamRepo.count() === 0) {
    await teamRepo.save([
      { name: 'Alex Johnson', email: 'alex@mercivo.com', role: 'admin', avatar: 'AJ', color: 'bg-primary text-white' },
      { name: 'Sarah Chen', email: 'sarah@mercivo.com', role: 'editor', avatar: 'SC', color: 'bg-violet-500 text-white' },
      { name: 'Mike Wang', email: 'mike@mercivo.com', role: 'editor', avatar: 'MW', color: 'bg-emerald-500 text-white' },
      { name: 'Lisa Park', email: 'lisa@mercivo.com', role: 'viewer', avatar: 'LP', color: 'bg-amber-500 text-white' },
    ] as TeamMember[]);
  }
  if (await knowledgeRepo.count() === 0) {
    await knowledgeRepo.save([
      { name: '产品目录-2026.pdf', type: 'PDF', size: '4.2 MB', status: 'indexed', chunks: 126 },
      { name: '常见问题FAQ.docx', type: 'DOCX', size: '820 KB', status: 'indexed', chunks: 48 },
      { name: '物流与付款政策.pdf', type: 'PDF', size: '1.1 MB', status: 'indexed', chunks: 35 },
    ] as KnowledgeFile[]);
  }
  const configs = {
    settings: { account: { name: 'Alex Johnson', email: 'alex@mercivo.com', phone: '+1 (555) 123-4567', timezone: 'UTC+8 (Asia/Shanghai)' }, site: { name: 'Mercivo Official', domain: 'www.mercivo.com', description: 'Global B2B sourcing platform connecting buyers with premium suppliers', language: 'English', currency: 'USD ($)' }, billing: { currentPlan: 'pro' } },
    plans: { items: [{ id: 'starter', name: 'Starter', price: '$29/mo', desc: '适合个人创业者', limits: ['1个智能体', '500次对话/月', '基础分析'] }, { id: 'pro', name: 'Professional', price: '$99/mo', desc: '适合小型团队', limits: ['5个智能体', '5,000次对话/月', '高级分析', '知识库'] }, { id: 'enterprise', name: 'Enterprise', price: '$299/mo', desc: '适合大型企业', limits: ['无限智能体', '无限对话', '专属模型', 'API接入', '优先支持'] }] },
    siteEditor: { page: 'home', status: 'published', version: 1, productSource: '全部商品', sort: '最新上架', displayCount: 9, columns: 3, welcome: '你好！我是EcoBags的AI助手，有什么可以帮您？', position: '右下角' },
    seo: { title: '', description: '', keywords: '', shareImage: '', canonicalUrl: '', robots: 'index,follow,max-image-preview:large' },
    dashboard: { traffic: [{ day: '周一', visitors: 0, leads: 0, aiChats: 0 }, { day: '周二', visitors: 0, leads: 0, aiChats: 0 }, { day: '周三', visitors: 0, leads: 0, aiChats: 0 }, { day: '周四', visitors: 0, leads: 0, aiChats: 0 }, { day: '周五', visitors: 0, leads: 0, aiChats: 0 }, { day: '周六', visitors: 0, leads: 0, aiChats: 0 }, { day: '周日', visitors: 0, leads: 0, aiChats: 0 }], activities: [] },
  };
  for (const [key, value] of Object.entries(configs)) {
    if (!(await configRepo.exist({ where: { key } }))) await configRepo.save({ key, value });
  }
  console.log('Workspace data seeded');
  if (await sessionRepo.count() === 0) {
    const session = await sessionRepo.save({ title: '产品咨询', starred: true });
    await messageRepo.save({ sessionId: session.id, type: 'ai', text: '你好！我是迈犀沃 AI 助手，可以协助您处理商品、客户、商机、开发信与独立站运营。' });
  }
  let site = (await siteRepo.find({ order: { createdAt: 'ASC' }, take: 1 }))[0] || null;
  if (!site) {
    let tenant = (await tenantRepo.find({ order: { createdAt: 'ASC' }, take: 1 }))[0] || null;
    if (!tenant) tenant = await tenantRepo.save({ slug: 'mercivo-demo', name: 'Mercivo Demo', status: 'active' });
    site = await siteRepo.save(siteRepo.create({ tenantId: tenant.id, slug: 'eco-bags', name: 'EcoBags Official', status: 'draft', defaultLanguage: 'zh', defaultCurrency: 'CNY', publishedVersionId: null }));
    await domainRepo.save([
      { siteId: site.id, hostname: 'localhost', isPrimary: true, sslStatus: 'active', status: 'active' },
      { siteId: site.id, hostname: 'eco-bags.mercivo.site', isPrimary: false, sslStatus: 'pending', status: 'active' },
    ] as SiteDomain[]);
  }
  await Promise.all([
    productRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    leadRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    agentRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    testimonialRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    knowledgeRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    sessionRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    teamRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    dictTypeRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    dictEntryRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
  ]);
  if (!site.publishedVersionId) {
    const snapshot = { site: { id: site.id, slug: site.slug, name: site.name, defaultLanguage: site.defaultLanguage, defaultCurrency: site.defaultCurrency }, config: configs.siteEditor, products: await productRepo.find({ where: { siteId: site.id, status: 'published' } }), testimonials: await testimonialRepo.find({ where: { siteId: site.id } }), agent: await agentRepo.findOne({ where: { siteId: site.id, status: 'active' } }), generatedAt: new Date().toISOString() };
    const version = await versionRepo.save({ siteId: site.id, version: 1, status: 'published', snapshot, publishedBy: 'seed' });
    site.status = 'published'; site.publishedVersionId = version.id; await siteRepo.save(site);
  }
  await ds.destroy();
  console.log('Seed completed!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
