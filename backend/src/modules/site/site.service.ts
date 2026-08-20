import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Resolver, resolveTxt } from 'dns/promises';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site } from './site.entity';
import { SiteDomain } from './site-domain.entity';
import { SiteVersion } from './site-version.entity';
import { Tenant } from './tenant.entity';
import { Product } from '../product/product.entity';
import { Agent } from '../agent/agent.entity';
import { Testimonial } from '../storefront/testimonial.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { Lead } from '../lead/lead.entity';
import { CreateDomainDto, CreatePublicInquiryDto, CreateSiteDto, UpdateSiteDto } from './site.dto';
import { CacheService } from '../../common/cache/cache.service';
import { DictEntry } from '../dict/dict-entry.entity';
import { Customer } from '../customer/customer.entity';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SiteService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly domainRepo: Repository<SiteDomain>,
    @InjectRepository(SiteVersion) private readonly versionRepo: Repository<SiteVersion>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Testimonial) private readonly testimonialRepo: Repository<Testimonial>,
    @InjectRepository(AppConfig) private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(DictEntry) private readonly dictEntryRepo: Repository<DictEntry>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  listTenants(tenantId: string) { return this.tenantRepo.find({ where: { id: tenantId } }); }
  listSites(tenantId: string) { return this.siteRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } }); }
  async createSite(dto: CreateSiteDto & { tenantId: string }) {
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenantId } });
    if (!tenant) throw new ForbiddenException('商户不存在或已停用');
    if (await this.siteRepo.count({ where: { tenantId: dto.tenantId } }) >= 1) throw new BadRequestException('每个商户仅支持一个独立站');
    return this.siteRepo.save(this.siteRepo.create(dto));
  }
  async updateSite(id: string, dto: UpdateSiteDto, tenantId: string) {
    const site = await this.getSite(id, tenantId);
    const allowedLanguages = new Set(['zh', 'en', 'bs']);
    if ((dto.defaultLanguage && !allowedLanguages.has(dto.defaultLanguage)) || dto.supportedLanguages?.some(language => !allowedLanguages.has(language))) throw new BadRequestException('独立站仅支持中文、英文和波斯尼亚语');
    if (dto.translationAgentId) {
      const agent = await this.agentRepo.findOne({ where: { id: dto.translationAgentId, siteId: id, agentType: 'translation' } });
      if (!agent) throw new BadRequestException('请选择当前站点中类型为“翻译”的智能体');
    }
    if (dto.supportedLanguages && !dto.supportedLanguages.includes(dto.defaultLanguage || site.defaultLanguage)) throw new BadRequestException('支持语言必须包含站点默认语言');
    return this.siteRepo.save(Object.assign(site, dto));
  }
  async listDomains(siteId: string, tenantId: string) {
    await this.getSite(siteId, tenantId);
    const domains = await this.domainRepo.createQueryBuilder('domain').addSelect('domain.verificationToken').where('domain.siteId = :siteId', { siteId }).orderBy('domain.isPrimary', 'DESC').getMany();
    return domains.map(domain => this.domainDetails(domain));
  }
  async addDomain(siteId: string, dto: CreateDomainDto, tenantId: string) {
    await this.getSite(siteId, tenantId);
    const hostname = this.normalizeHost(dto.hostname);
    if (dto.isPrimary) await this.domainRepo.update({ siteId }, { isPrimary: false });
    const isLocal = hostname.endsWith('.localhost') || hostname === 'localhost';
    const verificationToken = isLocal ? null : randomBytes(24).toString('hex');
    const domain = await this.domainRepo.save(this.domainRepo.create({ siteId, hostname, isPrimary: dto.isPrimary ?? false, sslStatus: isLocal ? 'active' : 'pending', status: isLocal ? 'active' : 'disabled', verifiedAt: isLocal ? new Date() : null, verificationToken }));
    return this.domainDetails(domain);
  }
  async verifyDomain(id: string, tenantId: string) {
    const domain = await this.domainRepo.createQueryBuilder('domain').addSelect('domain.verificationToken').where('domain.id = :id', { id }).getOne();
    if (!domain) throw new NotFoundException('Domain not found');
    await this.getSite(domain.siteId, tenantId);
    if (!domain.verificationToken) return domain;
    const recordName = `_mercivo-verification.${domain.hostname}`;
    let records: string[][] = [];
    try {
      records = await resolveTxt(recordName);
    } catch {
      // Docker 内置 DNS 可能缓存首次查询的 NXDOMAIN，使用公共 DNS 复核可避免记录已生效却误报。
      const resolver = new Resolver();
      resolver.setServers(['1.1.1.1', '8.8.8.8']);
      try { records = await resolver.resolveTxt(recordName); } catch { throw new BadRequestException('未检测到域名验证 TXT 记录'); }
    }
    const expected = `mercivo-site-verification=${domain.verificationToken}`;
    if (!records.some(record => record.join('') === expected)) throw new BadRequestException('域名验证 TXT 记录不匹配');
    domain.status = 'active';
    domain.verifiedAt = new Date();
    domain.verificationToken = null;
    return this.domainRepo.save(domain);
  }
  async removeDomain(id: string, tenantId: string) { const domain = await this.domainRepo.findOne({ where: { id } }); if (!domain) throw new NotFoundException('Domain not found'); await this.getSite(domain.siteId, tenantId); await this.domainRepo.delete(id); }
  async listVersions(siteId: string, tenantId: string) { await this.getSite(siteId, tenantId); return this.versionRepo.find({ where: { siteId }, order: { version: 'DESC' } }); }

  async publish(siteId: string, publishedBy = 'system', tenantId?: string) {
    const site = await this.getSite(siteId, tenantId);
    const [products, testimonials, agents, editor, seo, categoryEntries] = await Promise.all([
      this.productRepo.find({ where: { siteId, status: 'published' }, order: { createdAt: 'DESC' } }),
      this.testimonialRepo.find({ where: { siteId }, order: { sort: 'ASC' } }),
      this.agentRepo.find({ where: { siteId, status: 'active' }, order: { createdAt: 'ASC' } }),
      (async () => (await this.configRepo.findOne({ where: { key: `${siteId}:siteEditor` } })) || this.configRepo.findOne({ where: { key: 'siteEditor' } }))(),
      (async () => (await this.configRepo.findOne({ where: { key: `${siteId}:seo` } })) || this.configRepo.findOne({ where: { key: 'seo' } }))(),
      this.dictEntryRepo.find({ where: { siteId, typeId: 'category', status: 'enabled' }, order: { sort: 'ASC' } }),
    ]);
    const latest = await this.versionRepo.findOne({ where: { siteId }, order: { version: 'DESC' } });
    const categories = categoryEntries.map(({ code, label, parentCode, sort }) => ({ code, label, parentCode, sort }));
    const snapshot = { site: { id: site.id, slug: site.slug, name: site.name, defaultLanguage: site.defaultLanguage, supportedLanguages: site.supportedLanguages || [site.defaultLanguage], defaultCurrency: site.defaultCurrency, guestPriceMode: site.guestPriceMode || 'base' }, config: editor?.value || {}, seo: seo?.value || {}, products, categories, testimonials, agent: agents.find(agent => agent.agentType !== 'translation') || null, generatedAt: new Date().toISOString() };
    const version = await this.versionRepo.save(this.versionRepo.create({ siteId, version: (latest?.version || 0) + 1, snapshot, publishedBy }));
    site.status = 'published'; site.publishedVersionId = version.id; await this.siteRepo.save(site);
    return version;
  }
  async rollback(siteId: string, versionId: string, tenantId?: string) {
    const site = await this.getSite(siteId, tenantId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, siteId } });
    if (!version) throw new NotFoundException('Site version not found');
    site.publishedVersionId = version.id; site.status = 'published'; await this.siteRepo.save(site); return version;
  }
  async resolvePublished(hostname: string, siteSlug?: string, authorization?: string) {
    const { site, version } = await this.resolveSiteVersion(hostname, siteSlug);
    const customer = await this.resolvePublicCustomer(site.id, authorization);
    const snapshot = version.snapshot as Record<string, any>;
    const guestMode = (site.guestPriceMode || snapshot.site?.guestPriceMode) === 'hidden' ? 'hidden' : 'base';
    const products = (snapshot.products || []).map((product: Product) => {
      const levelPrice = customer?.level ? product.levelPrices?.[customer.level] : undefined;
      const priceValue = customer ? (levelPrice ?? Number(product.basePrice)) : Number(product.basePrice);
      const priceVisible = !!customer || guestMode !== 'hidden';
      return { ...product, price: priceVisible ? this.calculatePublicPrice(priceValue, product.variants || []) : '', priceVisible, priceSource: customer ? (levelPrice == null ? 'base' : 'level') : guestMode };
    });
    return { siteId: site.id, versionId: version.id, version: version.version, ...snapshot, site: { ...snapshot.site, guestPriceMode: guestMode }, products, customer: customer ? { id: customer.id, name: customer.name, company: customer.company, phone: customer.phone, level: customer.level } : null };
  }
  async loginPublicCustomer(hostname: string, siteSlug: string | undefined, phone: string) {
    const { site } = await this.resolveSiteVersion(hostname, siteSlug);
    const phoneNormalized = phone.trim().replace(/[\s()-]/g, '');
    const customer = await this.customerRepo.findOne({ where: { siteId: site.id, phoneNormalized, status: 'active' } });
    if (!customer) throw new UnauthorizedException('未找到该手机号对应的有效客户');
    const accessToken = await this.jwt.signAsync({ sub: customer.id, type: 'storefront_customer', siteId: site.id, phone: customer.phone });
    return { accessToken, customer: { id: customer.id, name: customer.name, company: customer.company, phone: customer.phone, level: customer.level } };
  }
  async translatePublished(hostname: string, siteSlug: string | undefined, language: string) {
    const { site, version } = await this.resolveSiteVersion(hostname, siteSlug);
    const supported = site.supportedLanguages || [site.defaultLanguage];
    if (!supported.includes(language)) throw new BadRequestException('该站点未启用此语言');
    if (language === site.defaultLanguage) return { language, translations: {} };
    if (!site.translationAgentId) throw new ServiceUnavailableException('站点尚未配置翻译智能体');
    const cacheKey = `site-translation:${version.id}:${language}`;
    const cached = await this.cache.get<Record<string, string>>(cacheKey);
    if (cached) return { language, translations: cached };
    const agent = await this.agentRepo.findOne({ where: { id: site.translationAgentId, siteId: site.id, status: 'active', agentType: 'translation' } });
    if (!agent) throw new ServiceUnavailableException('翻译智能体不可用');
    const source = this.translationSource(version.snapshot as Record<string, any>);
    const translations = await this.callTranslationAgent(agent, site.defaultLanguage, language, source);
    await this.cache.set(cacheKey, translations, 1000 * 60 * 60 * 24 * 30);
    return { language, translations };
  }

  private translationSource(snapshot: Record<string, any>): Record<string, string> {
    const base: Record<string, string> = {
      'nav.products': 'Products', 'nav.about': 'About', 'nav.contact': 'Contact',
      'hero.eyebrow': 'Direct manufacturer · Global fulfillment', 'hero.title': 'Responsible products. Built for your brand.',
      'hero.description': 'Factory-direct sourcing, custom branding and reliable international delivery—all backed by a responsive export team.',
      'hero.productsCta': 'Explore products', 'hero.quoteCta': 'Request a quote', 'hero.quality': 'Quality assured', 'hero.shipping': 'Worldwide shipping', 'hero.samples': 'Custom samples',
      'products.eyebrow': 'Product collection', 'products.title': 'Made to move your business', 'products.description': 'Flexible MOQs and factory-direct pricing for growing global brands.', 'products.bestSeller': 'Best seller', 'products.moq': 'MOQ',
      'about.eyebrow': 'Why choose us', 'about.title': 'A sourcing partner, not just a supplier.', 'about.years': 'Years manufacturing', 'about.countries': 'Countries served', 'about.response': 'Quotation response',
      'testimonials.title': 'Customer stories', 'contact.eyebrow': 'Start a project', 'contact.title': 'Tell us what you need.', 'contact.description': 'Share your target quantity, specifications and branding requirements. Our export team will prepare a tailored quotation.',
      'contact.name': 'Your name', 'contact.email': 'Work email', 'contact.company': 'Company', 'contact.requirements': 'Quantity, material, size, printing…', 'contact.submit': 'Request quotation',
      'footer.rights': 'All rights reserved.', 'chat.online': 'Online', 'chat.placeholder': 'Ask about MOQ, pricing, shipping…', 'chat.welcome': 'Hi! How can I help with your sourcing needs today?',
    };
    (snapshot.products || []).forEach((p: any) => { base[`product.${p.id}.name`] = p.nameEn || p.nameZh; base[`product.${p.id}.description`] = p.description || 'Customizable materials, colors and branded printing.'; base[`product.${p.id}.category`] = p.category || ''; });
    (snapshot.categories || []).forEach((category: any) => { base[`category.${category.code}`] = category.label || category.code; });
    (snapshot.testimonials || []).forEach((item: any) => { base[`testimonial.${item.id}.text`] = item.text; });
    return base;
  }

  private async callTranslationAgent(agent: Agent, sourceLanguage: string, targetLanguage: string, source: Record<string, string>): Promise<Record<string, string>> {
    const apiKey = this.config.get<string>('AI_API_KEY') || this.config.get<string>('OPENAI_API_KEY');
    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
    if (!apiKey) throw new ServiceUnavailableException('服务端尚未配置 AI_API_KEY');
    const model = agent.model.toLowerCase().replace(/^gpt-4o-mini$/, 'gpt-4o-mini').replace(/^gpt-4o$/, 'gpt-4o');
    const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: agent.systemPrompt || 'You are a professional website localization agent. Preserve brand names, numbers, units, HTML meaning and JSON keys. Return only a JSON object with exactly the input keys and translated string values.' }, { role: 'user', content: `Translate this storefront copy from ${sourceLanguage} to ${targetLanguage}. Return every key.\n${JSON.stringify(source)}` }] }) });
    if (!response.ok) throw new BadGatewayException(`翻译智能体调用失败 (${response.status})`);
    const body = await response.json() as any;
    try {
      const result = JSON.parse(body.choices?.[0]?.message?.content || '{}');
      if (!result || typeof result !== 'object' || Object.keys(source).some(key => typeof result[key] !== 'string')) throw new Error('invalid shape');
      return result;
    } catch { throw new BadGatewayException('翻译智能体返回了无效的结构化结果'); }
  }
  async createPublicInquiry(hostname: string, siteSlug: string | undefined, dto: CreatePublicInquiryDto) {
    const { site } = await this.resolveSiteVersion(hostname, siteSlug);
    return this.leadRepo.save(this.leadRepo.create({ tenantId: site.tenantId, siteId: site.id, name: dto.name || '网站访客', email: dto.email || '', company: dto.company || '', phone: dto.phone || '', country: dto.country || '', product: 'Website inquiry', summary: dto.requirements || '未填写采购需求', status: 'new', score: 60, tag: `site:${site.id}` }));
  }
  async resolvePublicSite(hostname: string, siteSlug?: string) {
    return (await this.resolveSiteVersion(hostname, siteSlug)).site;
  }
  async authorizeDomain(hostname: string) {
    try {
      await this.resolveSiteVersion(hostname);
      return true;
    } catch {
      return false;
    }
  }
  async sitemap(hostname: string, siteKey?: string) {
    const { site, version } = await this.resolveSiteVersion(hostname, siteKey);
    const snapshot = version.snapshot as Record<string, any>;
    const origin = `https://${this.normalizeHost(hostname)}`;
    const basePath = siteKey ? `/${encodeURIComponent(siteKey)}` : '';
    const languages = site.supportedLanguages || [site.defaultLanguage];
    const alternate = languages.map(language => `<xhtml:link rel="alternate" hreflang="${this.xml(language)}" href="${origin}${basePath}/?lang=${this.xml(language)}"/>`).join('');
    const products = (snapshot.products || []).map((product: Product) => `<url><loc>${origin}${basePath}/products/${encodeURIComponent(product.id)}</loc><lastmod>${new Date(version.publishedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${origin}${basePath}/</loc><lastmod>${new Date(version.publishedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>${alternate}</url>${products}</urlset>`;
  }
  async robots(hostname: string, siteKey?: string) {
    const { version } = await this.resolveSiteVersion(hostname, siteKey);
    const snapshot = version.snapshot as Record<string, any>;
    const noindex = String(snapshot.seo?.robots || 'index,follow').includes('noindex');
    const origin = `https://${this.normalizeHost(hostname)}`;
    const basePath = siteKey ? `/${encodeURIComponent(siteKey)}` : '';
    return `User-agent: *\n${noindex ? 'Disallow: /' : 'Disallow: /api/'}\n${noindex ? '' : 'Allow: /\n'}\nSitemap: ${origin}${basePath}/sitemap.xml\n`;
  }
  private async resolveSiteVersion(hostname: string, siteSlug?: string) {
    let site: Site | null = null;
    const normalizedHost = this.normalizeHost(hostname);
    if (siteSlug) {
      const previewHosts = (this.config.get<string>('STOREFRONT_PREVIEW_HOSTS') || 'localhost,127.0.0.1').split(',').map(value => this.normalizeHost(value));
      if (!previewHosts.includes(normalizedHost)) throw new BadRequestException('Site preview parameter is not allowed on this host');
      site = await this.siteRepo.findOne({ where: [{ slug: siteSlug }, { tenantId: siteSlug }] });
    }
    if (!site) {
      const domain = await this.domainRepo.findOne({ where: { hostname: normalizedHost, status: 'active' } });
      if (domain) site = await this.siteRepo.findOne({ where: { id: domain.siteId } });
    }
    if (!site || site.status !== 'published' || !site.publishedVersionId) throw new NotFoundException('Published site not found');
    const tenant = await this.tenantRepo.findOne({ where: { id: site.tenantId } });
    if (!tenant || tenant.status !== 'active' || (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now())) throw new NotFoundException('Published site not found');
    const version = await this.versionRepo.findOne({ where: { id: site.publishedVersionId, siteId: site.id } });
    if (!version) throw new NotFoundException('Published version not found');
    return { site, version };
  }
  private async getSite(id: string, tenantId?: string) { const site = await this.siteRepo.findOne({ where: tenantId ? { id, tenantId } : { id } }); if (!site) throw new NotFoundException(`Site ${id} not found`); return site; }
  private async resolvePublicCustomer(siteId: string, authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: string; siteId: string }>(token);
      if (payload.type !== 'storefront_customer' || payload.siteId !== siteId) return null;
      return this.customerRepo.findOne({ where: { id: payload.sub, siteId, status: 'active' } });
    } catch { return null; }
  }
  private calculatePublicPrice(basePrice: number, variants: NonNullable<Product['variants']>) {
    const safeBase = Math.max(0, Number(basePrice) || 0);
    if (!variants.length) return safeBase.toFixed(2);
    const prices = variants.map(item => safeBase + Math.max(0, Number(item.surcharge) || 0));
    const min = Math.min(...prices).toFixed(2); const max = Math.max(...prices).toFixed(2);
    return min === max ? min : `${min}–${max}`;
  }
  private domainDetails(domain: SiteDomain) {
    return {
      ...domain,
      verificationRecord: domain.verificationToken ? { type: 'TXT', name: `_mercivo-verification.${domain.hostname}`, value: `mercivo-site-verification=${domain.verificationToken}` } : null,
      routingRecord: { type: 'CNAME', name: domain.hostname, value: this.config.get<string>('STOREFRONT_CNAME_TARGET') || 'site.aihubflux.com' },
    };
  }
  private xml(value: string) { return value.replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char)); }
  private normalizeHost(host: string) { return host.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]; }
}
