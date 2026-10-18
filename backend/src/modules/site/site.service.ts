import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AppConfig } from '../workspace/app-config.entity';
import { CreateDomainDto, CreateSiteDto, SiteVersionQueryDto, UpdateSiteDto } from './site.dto';
import { ProductCategory } from '../product-category/product-category.entity';
import { Warehouse } from '../inventory/inventory.entity';
import { ANTD_LOCALE_SET } from '../../common/constants/antd-locales';
import { TranslationService } from '../translation/translation.service';
import { pageLimit, pageOffset, pageResult } from '../../common/dto/page-query.dto';

@Injectable()
export class SiteService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly domainRepo: Repository<SiteDomain>,
    @InjectRepository(SiteVersion) private readonly versionRepo: Repository<SiteVersion>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(AppConfig) private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(ProductCategory) private readonly productCategoryRepo: Repository<ProductCategory>,
    @InjectRepository(Warehouse) private readonly warehouseRepo: Repository<Warehouse>,
    private readonly config: ConfigService,
    private readonly translations: TranslationService,
  ) {}

  listTenants(tenantId: string) { return this.tenantRepo.find({ where: { id: tenantId } }); }
  listSites(tenantId: string) { return this.siteRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } }); }
  async createSite(dto: CreateSiteDto & { tenantId: string }) {
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenantId } });
    if (!tenant) throw new ForbiddenException('商户不存在或已停用');
    if (await this.siteRepo.count({ where: { tenantId: dto.tenantId } }) >= 1) throw new BadRequestException('每个商户仅支持一个独立站');
    const site = await this.siteRepo.save(this.siteRepo.create(dto));
    await this.warehouseRepo.save(this.warehouseRepo.create({ tenantId: dto.tenantId, siteId: site.id, code: 'DEFAULT', name: '默认仓库', contact: '', phone: '', address: '', status: 'active', isDefault: true }));
    return site;
  }
  async updateSite(id: string, dto: UpdateSiteDto, tenantId: string) {
    const site = await this.getSite(id, tenantId);
    if ((dto.defaultLanguage && !ANTD_LOCALE_SET.has(dto.defaultLanguage)) || dto.supportedLanguages?.some(language => !ANTD_LOCALE_SET.has(language))) throw new BadRequestException('语言编码必须使用 Ant Design 支持的 locale');
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
  async listVersions(siteId: string, tenantId: string, query: SiteVersionQueryDto) {
    await this.getSite(siteId, tenantId);
    const [items, total] = await this.versionRepo.findAndCount({
      select: { id: true, siteId: true, version: true, status: true, publishedBy: true, publishedAt: true, releaseNote: true },
      where: { siteId },
      order: { version: 'DESC' },
      skip: pageOffset(query),
      take: pageLimit(query),
    });
    return pageResult(items, total, query);
  }

  async publish(siteId: string, publishedBy: string, releaseNote: string, tenantId?: string) {
    const site = await this.getSite(siteId, tenantId);
    const normalizedReleaseNote = releaseNote?.trim();
    if (!normalizedReleaseNote) throw new BadRequestException('请填写发版备注');
    const [products, editor, seo, categoryEntries, currencyConfig, siteMeta] = await Promise.all([
      this.productRepo.find({ where: { siteId, status: 'published' }, order: { createdAt: 'DESC' } }),
      (async () => (await this.configRepo.findOne({ where: { key: `${siteId}:siteEditor` } })) || this.configRepo.findOne({ where: { key: 'siteEditor' } }))(),
      (async () => (await this.configRepo.findOne({ where: { key: `${siteId}:seo` } })) || this.configRepo.findOne({ where: { key: 'seo' } }))(),
      this.productCategoryRepo.find({ where: { siteId, status: 'enabled' }, order: { sort: 'ASC' } }),
      this.configRepo.findOne({ where: { key: `${siteId}:currency` } }),
      this.configRepo.findOne({ where: { key: `${siteId}:site-meta` } }),
    ]);
    const displayCurrency = String(site.defaultCurrency || 'CNY').toUpperCase();
    const missing = products.filter(product => !product.currencyPrices?.[displayCurrency]);
    if (missing.length) throw new BadRequestException(`以下商品缺少 ${displayCurrency} 基础售价：${missing.map(product => `${product.nameZh}（${product.sku}）`).join('、')}`);
    const publishedProducts = products.map(product => {
      const fixedPrice = product.currencyPrices![displayCurrency];
      return { ...product, currencyPrices: undefined, basePrice: fixedPrice.basePrice, levelPrices: fixedPrice.levelPrices, variants: (product.variants || []).map(variant => ({ ...variant, surcharge: Number(variant.surcharges?.[displayCurrency] ?? 0), surcharges: undefined })) };
    });
    const i18n = await this.translations.validateForPublish(siteId);
    const latest = await this.versionRepo.findOne({ where: { siteId }, order: { version: 'DESC' } });
    const categories = categoryEntries.map(({ code, label, parentCode, sort }) => ({ code, label, parentCode, sort }));
    const symbol = ((currencyConfig?.value as any)?.currencies || []).find((item: any) => item.code === displayCurrency)?.symbol || displayCurrency;
    const snapshot = { site: { id: site.id, slug: site.slug, name: site.name, logoUrl: String((siteMeta?.value as any)?.logoUrl || ''), defaultLanguage: site.defaultLanguage, supportedLanguages: site.supportedLanguages || [site.defaultLanguage], defaultCurrency: displayCurrency, currencySymbol: symbol, guestPriceMode: site.guestPriceMode || 'base' }, config: editor?.value || {}, seo: seo?.value || {}, products: publishedProducts, categories, i18n, generatedAt: new Date().toISOString() };
    const version = await this.versionRepo.save(this.versionRepo.create({ siteId, version: (latest?.version || 0) + 1, snapshot, publishedBy, releaseNote: normalizedReleaseNote }));
    site.status = 'published'; site.publishedVersionId = version.id; await this.siteRepo.save(site);
    return version;
  }
  async rollback(siteId: string, versionId: string, tenantId?: string) {
    const site = await this.getSite(siteId, tenantId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, siteId } });
    if (!version) throw new NotFoundException('Site version not found');
    site.publishedVersionId = version.id; site.status = 'published'; await this.siteRepo.save(site); return version;
  }
  async resolvePublished(hostname: string, siteSlug?: string, requestedLanguage?: string) {
    const { site, version } = await this.resolveSiteVersion(hostname, siteSlug);
    const snapshot = version.snapshot as Record<string, any>;
    const [systemConfig, liveProducts, liveCategoryEntries, liveI18n] = await Promise.all([
      this.configRepo.findOne({ where: { key: `${site.id}:system` } }),
      this.productRepo.find({ where: { siteId: site.id, status: 'published' }, order: { createdAt: 'DESC' } }),
      this.productCategoryRepo.find({ where: { siteId: site.id, status: 'enabled' }, order: { sort: 'ASC' } }),
      this.translations.messages(site.id),
    ]);
    const storefront = (systemConfig?.value as any)?.storefront || {};
    const guestMode = ['base', 'hidden', 'percentage'].includes(storefront.guestPriceMode) ? storefront.guestPriceMode : ((site.guestPriceMode || snapshot.site?.guestPriceMode) === 'hidden' ? 'hidden' : 'base');
    const guestAccessEnabled = storefront.guestAccessEnabled !== false;
    const guestPricePercentage = Math.max(0, Number(storefront.guestPricePercentage) || 100);
    const displayCurrency = String(site.defaultCurrency || snapshot.site?.defaultCurrency || 'CNY').toUpperCase();
    const products = liveProducts.map((product: Product) => {
      const currencyPrice = product.currencyPrices?.[displayCurrency];
      const basePrice = Number(currencyPrice?.basePrice ?? product.basePrice);
      const priceValue = guestMode === 'percentage' ? basePrice * guestPricePercentage / 100 : basePrice;
      const priceVisible = guestMode !== 'hidden';
      return { ...product, currencyPrices: undefined, price: priceVisible ? this.calculatePublicPrice(priceValue, product.variants || []) : '', priceVisible, priceSource: guestMode };
    });
    const categories = liveCategoryEntries.map(({ code, label, parentCode, sort }) => ({ code, label, parentCode, sort }));
    const supported = snapshot.site?.supportedLanguages || [snapshot.site?.defaultLanguage || 'zh_CN'];
    const locale = requestedLanguage && supported.includes(requestedLanguage) ? requestedLanguage : snapshot.site?.defaultLanguage || 'zh_CN';
    return { siteId: site.id, versionId: version.id, version: version.version, ...snapshot, locale, site: { ...snapshot.site, guestAccessEnabled, guestPriceMode: guestMode, guestPricePercentage }, products: guestAccessEnabled ? products : [], categories, i18n: liveI18n };
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
    const origin = `https://${this.normalizeHost(hostname)}`;
    const basePath = siteKey ? `/${encodeURIComponent(siteKey)}` : '';
    const languages = site.supportedLanguages || [site.defaultLanguage];
    const alternate = languages.map(language => `<xhtml:link rel="alternate" hreflang="${this.xml(language)}" href="${origin}${basePath}/?lang=${this.xml(language)}"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${origin}${basePath}/</loc><lastmod>${new Date(version.publishedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>${alternate}</url></urlset>`;
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
    if (!site || site.status !== 'published' || !site.publishedVersionId) throw new NotFoundException({ errorCode: 'SITE_NOT_FOUND_OR_UNPUBLISHED', message: 'Published site not found' });
    const tenant = await this.tenantRepo.findOne({ where: { id: site.tenantId } });
    if (!tenant || tenant.status !== 'active' || (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now())) throw new NotFoundException({ errorCode: 'SITE_NOT_FOUND_OR_UNPUBLISHED', message: 'Published site not found' });
    const version = await this.versionRepo.findOne({ where: { id: site.publishedVersionId, siteId: site.id } });
    if (!version) throw new NotFoundException({ errorCode: 'SITE_NOT_FOUND_OR_UNPUBLISHED', message: 'Published version not found' });
    return { site, version };
  }
  private async getSite(id: string, tenantId?: string) { const site = await this.siteRepo.findOne({ where: tenantId ? { id, tenantId } : { id } }); if (!site) throw new NotFoundException(`Site ${id} not found`); return site; }
  private calculatePublicPrice(basePrice: number, variants: NonNullable<Product['variants']>) {
    const safeBase = Math.max(0, Number(basePrice) || 0);
    if (!variants.length) return safeBase.toFixed(2);
    const prices = variants.map(item => safeBase + Math.max(0, Number(item.surcharge) || 0));
    const min = Math.min(...prices).toFixed(2); const max = Math.max(...prices).toFixed(2);
    return min === max ? min : `${min}～${max}`;
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
