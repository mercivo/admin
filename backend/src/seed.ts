import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Product } from './modules/product/product.entity';
import { ProductCategory } from './modules/product-category/product-category.entity';
import { Testimonial } from './modules/storefront/testimonial.entity';
import { AppConfig } from './modules/workspace/app-config.entity';
import { TeamMember } from './modules/workspace/team-member.entity';
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
    entities: [Product, ProductCategory, Testimonial, AppConfig, TeamMember, Tenant, Site, SiteDomain, SiteVersion, User],
    synchronize: process.env.DB_SCHEMA_BOOTSTRAP === 'true',
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  await ds.initialize();
  console.log('Database connected');

  const productRepo = ds.getRepository(Product);
  const productCategoryRepo = ds.getRepository(ProductCategory);
  const testimonialRepo = ds.getRepository(Testimonial);
  const configRepo = ds.getRepository(AppConfig);
  const teamRepo = ds.getRepository(TeamMember);
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


  // ---- Product Categories ----
  const productCategories = [
    { code: 'eco', label: '环保袋', sort: 1, status: 'enabled' as const, remark: '可降解环保材质产品', parentCode: null },
    { code: 'eco-shopping', label: '购物袋', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { code: 'eco-grocery', label: '杂货袋', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { code: 'eco-produce', label: '蔬果袋', sort: 3, status: 'enabled' as const, remark: '', parentCode: 'eco' },
    { code: 'tote', label: '手提包', sort: 2, status: 'enabled' as const, remark: '时尚手提类产品', parentCode: null },
    { code: 'tote-cotton', label: '棉质手提包', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'tote' },
    { code: 'tote-canvas', label: '帆布手提包', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'tote' },
    { code: 'tote-jute', label: '黄麻手提包', sort: 3, status: 'disabled' as const, remark: '', parentCode: 'tote' },
    { code: 'drawstring', label: '抽绳袋', sort: 3, status: 'enabled' as const, remark: '抽绳收口类袋包', parentCode: null },
    { code: 'draw-sport', label: '运动抽绳袋', sort: 1, status: 'enabled' as const, remark: '', parentCode: 'drawstring' },
    { code: 'draw-gift', label: '礼品抽绳袋', sort: 2, status: 'enabled' as const, remark: '', parentCode: 'drawstring' },
    { code: 'nonwoven', label: '无纺布袋', sort: 4, status: 'disabled' as const, remark: '无纺布材质', parentCode: null },
  ];

  if (await productCategoryRepo.count() === 0) {
    for (const category of productCategories) await productCategoryRepo.save(category as ProductCategory);
  }
  console.log('Product categories seeded');


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
  const configs = {
    settings: { account: { name: 'Alex Johnson', email: 'alex@mercivo.com', phone: '+1 (555) 123-4567', timezone: 'UTC+8 (Asia/Shanghai)' }, site: { name: 'Mercivo Official', domain: 'www.mercivo.com', description: 'Global B2B sourcing platform connecting buyers with premium suppliers', language: 'English', currency: 'USD ($)' }, billing: { currentPlan: 'pro' } },
    plans: { items: [{ id: 'starter', name: 'Starter', price: '$29/mo', desc: '适合个人创业者', limits: ['20件商品', '1位成员', '1个独立站'] }, { id: 'pro', name: 'Professional', price: '$99/mo', desc: '适合小型团队', limits: ['500件商品', '5位成员', '1个独立站'] }, { id: 'enterprise', name: 'Enterprise', price: '$299/mo', desc: '适合大型企业', limits: ['无限商品', '20位成员', '1个独立站', '优先支持'] }] },
    siteEditor: { page: 'home', status: 'published', version: 1, productSource: '全部商品', sort: '最新上架', displayCount: 9, columns: 3 },
    seo: { title: '', description: '', keywords: '', shareImage: '', canonicalUrl: '', robots: 'index,follow,max-image-preview:large' },
    dashboard: { activities: [] },
  };
  for (const [key, value] of Object.entries(configs)) {
    if (!(await configRepo.exist({ where: { key } }))) await configRepo.save({ key, value });
  }
  console.log('Workspace data seeded');
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
    testimonialRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    teamRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
    productCategoryRepo.update({ siteId: '' }, { tenantId: site.tenantId, siteId: site.id }),
  ]);
  if (!site.publishedVersionId) {
    const snapshot = { site: { id: site.id, slug: site.slug, name: site.name, defaultLanguage: site.defaultLanguage, defaultCurrency: site.defaultCurrency }, config: configs.siteEditor, products: await productRepo.find({ where: { siteId: site.id, status: 'published' } }), testimonials: await testimonialRepo.find({ where: { siteId: site.id } }), generatedAt: new Date().toISOString() };
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
