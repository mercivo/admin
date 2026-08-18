import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto, UpdateProductSeoDto } from './product.dto';
import { Tenant } from '../site/tenant.entity';
import { DictEntry } from '../dict/dict-entry.entity';
import { FilterXSS } from 'xss';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(DictEntry) private readonly dictEntryRepository: Repository<DictEntry>,
  ) { }

  async findAll(siteId: string): Promise<Product[]> {
    return this.productRepository.find({ where: { siteId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, siteId: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id, siteId } });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto, tenantId: string, siteId: string): Promise<Product> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || await this.productRepository.count({ where: { tenantId } }) >= tenant.maxProducts) throw new ForbiddenException('商品数量已达到当前套餐上限');
    await this.ensureCategory(dto.category, siteId);
    await this.ensureUniqueCode(dto.sku, siteId);
    const variants = this.normalizeVariants(dto.variants);
    const basePrice = Math.max(0, Number(dto.basePrice) || 0);
    const product = this.productRepository.create({ ...dto, description: this.sanitizeDescription(dto.description), basePrice, levelPrices: this.normalizeLevelPrices(dto.levelPrices), variants, tags: this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants), tenantId, siteId });
    return this.productRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto, siteId: string): Promise<Product> {
    const product = await this.findById(id, siteId);
    if (dto.category !== undefined) await this.ensureCategory(dto.category, siteId);
    if (dto.sku !== undefined && dto.sku !== product.sku) await this.ensureUniqueCode(dto.sku, siteId, id);
    const variants = dto.variants === undefined ? product.variants || [] : this.normalizeVariants(dto.variants);
    const basePrice = dto.basePrice === undefined ? Number(product.basePrice) : Math.max(0, Number(dto.basePrice) || 0);
    Object.assign(product, dto, { description: dto.description === undefined ? product.description : this.sanitizeDescription(dto.description), basePrice, levelPrices: dto.levelPrices === undefined ? product.levelPrices : this.normalizeLevelPrices(dto.levelPrices), variants, tags: dto.tags === undefined ? product.tags : this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants) });
    return this.productRepository.save(product);
  }

  async remove(id: string, siteId: string): Promise<void> {
    const product = await this.findById(id, siteId);
    await this.productRepository.remove(product);
  }

  async getProductSeo(id: string, siteId: string): Promise<Product> {
    return this.findById(id, siteId);
  }

  async updateProductSeo(id: string, dto: UpdateProductSeoDto, siteId: string): Promise<Product> {
    const product = await this.findById(id, siteId);
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  private async ensureCategory(code: string, siteId: string): Promise<void> {
    const exists = await this.dictEntryRepository.exist({ where: { siteId, typeId: 'category', code, status: 'enabled' } });
    if (!exists) throw new BadRequestException('请选择有效的商品分类');
  }

  private async ensureUniqueCode(sku: string, siteId: string, excludedId?: string): Promise<void> {
    const existing = await this.productRepository.findOne({ where: { siteId, sku: sku.trim() } });
    if (existing && existing.id !== excludedId) throw new ConflictException('商品编码已存在，请更换后重试');
  }

  private normalizeVariants(variants: CreateProductDto['variants'] = []) {
    return variants.map(item => ({
      specification: String(item.specification || '').trim(),
      option: String(item.option || '').trim(),
      stock: Math.max(0, Number(item.stock) || 0),
      surcharge: Math.max(0, Number(item.surcharge) || 0),
    }));
  }

  private calculatePriceRange(basePrice: number, variants: NonNullable<Product['variants']>): string {
    if (!variants.length) return basePrice.toFixed(2);
    const prices = variants.map(item => basePrice + item.surcharge);
    const min = Math.min(...prices).toFixed(2);
    const max = Math.max(...prices).toFixed(2);
    return min === max ? min : `${min}–${max}`;
  }

  private normalizeTags(tags: string[] = []): string[] {
    return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))].slice(0, 20);
  }

  private normalizeLevelPrices(prices?: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(prices || {}).filter(([code, value]) => /^lvl_[a-z0-9]+$/i.test(code) && Number.isFinite(Number(value)) && Number(value) >= 0).map(([code, value]) => [code, Number(value)]));
  }

  private sanitizeDescription(description?: string): string {
    return new FilterXSS({
      whiteList: {
        p: [], br: [], strong: [], em: [], u: [], s: [], h1: [], h2: [], h3: [],
        ul: [], ol: [], li: [], blockquote: [], a: ['href', 'target', 'rel'], img: ['src', 'alt', 'title'],
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    }).process(description || '').trim();
  }
}
