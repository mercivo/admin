import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto, UpdateProductSeoDto } from './product.dto';
import { Tenant } from '../site/tenant.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { FilterXSS } from 'xss';
import { randomUUID } from 'crypto';
import { InventoryBalance, InventoryLedgerEntry, Warehouse } from '../inventory/inventory.entity';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(ProductCategory) private readonly productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(InventoryBalance) private readonly balanceRepository: Repository<InventoryBalance>,
    @InjectRepository(InventoryLedgerEntry) private readonly ledgerRepository: Repository<InventoryLedgerEntry>,
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
    const variants = this.normalizeVariants(dto.variants, []);
    const basePrice = Math.max(0, Number(dto.basePrice) || 0);
    const product = await this.productRepository.save(this.productRepository.create({ ...dto, stock: 0, description: this.sanitizeDescription(dto.description), basePrice, levelPrices: this.normalizeLevelPrices(dto.levelPrices), variants, tags: this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants), tenantId, siteId }));
    const warehouse = await this.warehouseRepository.findOne({ where: { siteId, isDefault: true, status: 'active' } });
    if (warehouse) {
      const keys = variants.length ? variants.map(item => item.id) : ['BASE'];
      await this.balanceRepository.save(keys.map(variantKey => this.balanceRepository.create({ tenantId, siteId, warehouseId: warehouse.id, productId: product.id, variantKey, onHand: 0, reserved: 0, inTransit: 0, warningStock: 0 })));
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, siteId: string): Promise<Product> {
    const product = await this.findById(id, siteId);
    if (dto.category !== undefined) await this.ensureCategory(dto.category, siteId);
    if (dto.sku !== undefined && dto.sku !== product.sku) await this.ensureUniqueCode(dto.sku, siteId, id);
    const currentVariants = product.variants || [];
    const variants = dto.variants === undefined ? currentVariants : this.normalizeVariants(dto.variants, currentVariants);
    if (!currentVariants.length && variants.length) {
      const baseHasInventory = await this.balanceRepository.createQueryBuilder('balance').where("balance.product_id = :id AND balance.variant_key = 'BASE' AND (balance.on_hand <> 0 OR balance.reserved <> 0 OR balance.in_transit <> 0)", { id }).getCount();
      const baseHasHistory = await this.ledgerRepository.createQueryBuilder('ledger').where("ledger.product_id = :id AND ledger.variant_key = 'BASE'", { id }).getCount();
      if (baseHasInventory || baseHasHistory) throw new BadRequestException('商品已有默认规格库存或流水，清零后才能新增规格');
    }
    const removedVariantIds = currentVariants.filter(item => !variants.some(next => next.id === item.id)).map(item => item.id);
    if (removedVariantIds.length && (await this.balanceRepository.createQueryBuilder('balance').where('balance.product_id = :id AND balance.variant_key IN (:...keys) AND (balance.on_hand <> 0 OR balance.reserved <> 0 OR balance.in_transit <> 0)', { id, keys: removedVariantIds }).getCount() || await this.ledgerRepository.createQueryBuilder('ledger').where('ledger.product_id = :id AND ledger.variant_key IN (:...keys)', { id, keys: removedVariantIds }).getCount())) throw new BadRequestException('存在库存或流水的规格不可删除');
    const basePrice = dto.basePrice === undefined ? Number(product.basePrice) : Math.max(0, Number(dto.basePrice) || 0);
    Object.assign(product, dto, { stock: product.stock, description: dto.description === undefined ? product.description : this.sanitizeDescription(dto.description), basePrice, levelPrices: dto.levelPrices === undefined ? product.levelPrices : this.normalizeLevelPrices(dto.levelPrices), variants, tags: dto.tags === undefined ? product.tags : this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants) });
    const saved = await this.productRepository.save(product);
    const warehouse = await this.warehouseRepository.findOne({ where: { siteId, isDefault: true } });
    if (warehouse) {
      const existing = new Set((await this.balanceRepository.find({ where: { productId: id, siteId } })).map(item => item.variantKey));
      if (!currentVariants.length && variants.length) await this.balanceRepository.delete({ productId: id, siteId, variantKey: 'BASE' });
      const additions = variants.filter(item => !existing.has(item.id));
      if (additions.length) await this.balanceRepository.save(additions.map(item => this.balanceRepository.create({ tenantId: product.tenantId, siteId, warehouseId: warehouse.id, productId: id, variantKey: item.id, onHand: 0, reserved: 0, inTransit: 0, warningStock: 0 })));
      if (removedVariantIds.length) await this.balanceRepository.delete({ productId: id, siteId, variantKey: In(removedVariantIds) });
      if (currentVariants.length && !variants.length && !existing.has('BASE')) await this.balanceRepository.save(this.balanceRepository.create({ tenantId: product.tenantId, siteId, warehouseId: warehouse.id, productId: id, variantKey: 'BASE', onHand: 0, reserved: 0, inTransit: 0, warningStock: 0 }));
    }
    return saved;
  }

  async remove(id: string, siteId: string): Promise<void> {
    const product = await this.findById(id, siteId);
    if (await this.ledgerRepository.exist({ where: { productId: id, siteId } }) || await this.balanceRepository.createQueryBuilder('balance').where('balance.product_id = :id AND (balance.on_hand <> 0 OR balance.reserved <> 0 OR balance.in_transit <> 0)', { id }).getCount()) throw new BadRequestException('商品已有库存或流水，不可删除');
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
    const exists = await this.productCategoryRepository.exist({ where: { siteId, code, status: 'enabled' } });
    if (!exists) throw new BadRequestException('请选择有效的商品分类');
  }

  private async ensureUniqueCode(sku: string, siteId: string, excludedId?: string): Promise<void> {
    const existing = await this.productRepository.findOne({ where: { siteId, sku: sku.trim() } });
    if (existing && existing.id !== excludedId) throw new ConflictException('商品编码已存在，请更换后重试');
  }

  private normalizeVariants(variants: CreateProductDto['variants'] = [], existing: NonNullable<Product['variants']>) {
    return variants.map(item => ({
      id: String(item.id || randomUUID()),
      specification: String(item.specification || '').trim(),
      option: String(item.option || '').trim(),
      stock: existing.find(current => current.id === item.id)?.stock || 0,
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
