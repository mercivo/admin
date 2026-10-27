import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { Tenant } from '../site/tenant.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { FilterXSS } from 'xss';
import { randomUUID } from 'crypto';
import { InventoryBalance, InventoryLedgerEntry, Warehouse } from '../inventory/inventory.entity';
import { pageLimit, pageOffset, pageResult } from '../../common/dto/page-query.dto';
import { ProductExportQueryDto, ProductQueryDto } from './product-query.dto';
import { AppConfig } from '../workspace/app-config.entity';
import { CustomerLevelRule } from '../customer/customer.entity';
import { ProductStorageService } from './product-storage.service';
import { ExportImageAsset } from '../../common/storage/cloud-storage.service';

const PRODUCT_EXPORT_BASE_COLUMNS = ['商品编码', '商品名称', '分类', '商品图片', '商品描述', '标签', '商品标记', '最小起订量', '点赞数量', '同步状态'];
const PRODUCT_EXPORT_VARIANT_COLUMNS = ['规格名称', '规格选项'];
const PRODUCT_BADGE_LABELS: Record<string, string> = { new: '新品', hot: '爆品', bestseller: '热销', recommended: '推荐' };
const EXPORT_IMAGE_PADDING = 12;
const EXPORT_IMAGE_SCALE = 0.5;
const EXPORT_IMAGE_MIN_COLUMN_WIDTH = 34;
const EXCEL_MAX_COLUMN_WIDTH = 255;
const EXCEL_MAX_ROW_HEIGHT = 409;
const EXPORT_BASE_ROW_HEIGHT = 30;
const EXPORT_TEXT_LINE_HEIGHT = 16;
const EXPORT_TEXT_VERTICAL_PADDING = 10;
const PRODUCT_EXPORT_COLUMN_WIDTHS: Record<string, number> = {
  '商品编码': 18,
  '商品名称': 26,
  '分类': 18,
  '商品描述': 42,
  '标签': 24,
  '商品标记': 18,
  '最小起订量': 18,
  '点赞数量': 18,
  '同步状态': 18,
  '规格名称': 18,
  '规格选项': 18,
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(ProductCategory) private readonly productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(InventoryBalance) private readonly balanceRepository: Repository<InventoryBalance>,
    @InjectRepository(InventoryLedgerEntry) private readonly ledgerRepository: Repository<InventoryLedgerEntry>,
    @InjectRepository(AppConfig) private readonly configRepository: Repository<AppConfig>,
    @InjectRepository(CustomerLevelRule) private readonly customerLevelRepository: Repository<CustomerLevelRule>,
    private readonly storageService: ProductStorageService,
  ) { }

  async findAll(siteId: string, query: ProductQueryDto = new ProductQueryDto()) {
    const builder = this.productRepository.createQueryBuilder('product').where('product.site_id = :siteId', { siteId });
    this.applyFilters(builder, query);
    const [items, total] = await builder.orderBy('product.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    const [balances, categoryRows] = await Promise.all([
      items.length ? this.balanceRepository.find({ where: { siteId, productId: In(items.map(item => item.id)) } }) : [] as InventoryBalance[],
      this.productRepository.createQueryBuilder('categoryProduct')
        .select('categoryProduct.category', 'category')
        .addSelect('COUNT(categoryProduct.id)', 'count')
        .where('categoryProduct.site_id = :siteId', { siteId })
        .groupBy('categoryProduct.category')
        .getRawMany<{ category: string; count: string }>(),
    ]);
    const liveItems = items.map(product => {
      const productBalances = balances.filter(balance => balance.productId === product.id);
      return {
        ...product,
        stock: productBalances.reduce((sum, balance) => sum + balance.onHand, 0),
        variants: product.variants?.map(variant => ({
          ...variant,
          stock: productBalances.filter(balance => balance.variantKey === variant.id).reduce((sum, balance) => sum + balance.onHand, 0),
        })) || product.variants,
      };
    });
    const categoryCounts = Object.fromEntries(categoryRows.map(row => [row.category || '', Number(row.count)]));
    return {
      ...pageResult(liveItems, total, query),
      summary: { categoryCounts, totalProducts: Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) },
    };
  }

  catalog(siteId: string): Promise<Product[]> { return this.productRepository.find({ where: { siteId }, order: { createdAt: 'DESC' } }); }

  async batchStatus(ids: string[], status: 'published' | 'pending', siteId: string) {
    const uniqueIds = [...new Set(ids)];
    const expectedStatus: Product['status'] = status === 'published' ? 'pending' : 'published';
    const invalidMessage = status === 'published' ? '请选择还未同步的商品数据' : '请选择已同步的商品数据';

    return this.productRepository.manager.transaction(async manager => {
      const repository = manager.getRepository(Product);
      const products = await repository.find({
        where: { siteId, id: In(uniqueIds) },
        select: { id: true, status: true },
      });
      if (products.length !== uniqueIds.length || products.some(product => product.status !== expectedStatus)) {
        throw new BadRequestException(invalidMessage);
      }
      const result = await repository.update(
        { siteId, id: In(uniqueIds), status: expectedStatus },
        { status },
      );
      if (result.affected !== uniqueIds.length) throw new BadRequestException(invalidMessage);
      return { updated: uniqueIds.length, status };
    });
  }

  async exportWorkbook(siteId: string, query: ProductExportQueryDto) {
    const builder = this.productRepository.createQueryBuilder('product').where('product.site_id = :siteId', { siteId });
    this.applyFilters(builder, query);
    const products = await builder.orderBy('product.created_at', 'DESC').getMany();
    const { currencies, levels, categories } = await this.exportReferences(siteId);
    const productImages: Array<ExportImageAsset | null> = [];
    for (const product of products) {
      const firstImageUrl = String(product.images?.[0] || product.img || '').trim();
      productImages.push(firstImageUrl ? await this.storageService.readExportImage(firstImageUrl) : null);
    }
    const widestImage = productImages.reduce((width, image) => Math.max(width, image ? this.exportImageSize(image.width) : 0), 0);
    const imageColumnWidth = Math.min(EXCEL_MAX_COLUMN_WIDTH, Math.max(EXPORT_IMAGE_MIN_COLUMN_WIDTH, (widestImage + EXPORT_IMAGE_PADDING - 5) / 7));
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mercivo';
    workbook.created = new Date();
    const baseColumns = PRODUCT_EXPORT_BASE_COLUMNS.map(header => ({ key: header, header, section: 'base' as const }));
    const variantColumns = PRODUCT_EXPORT_VARIANT_COLUMNS.map(header => ({ key: header, header, section: 'variant' as const }));
    const priceColumns = currencies.flatMap(currency => [
      { key: `price:${currency}:base`, header: '商品单价', section: 'price' as const, currency },
      ...levels.map(level => ({ key: `price:${currency}:${level.code}`, header: `${level.name}价`, section: 'price' as const, currency, levelCode: level.code })),
    ]);
    const columns = [...baseColumns, ...variantColumns, ...priceColumns];
    const sheet = workbook.addWorksheet('商品数据', { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] });
    sheet.properties.defaultRowHeight = 30;
    sheet.addRow(columns.map(column => column.section === 'price' ? '' : column.header));
    sheet.addRow(columns.map(column => column.section === 'price' ? column.header : ''));
    columns.forEach((column, index) => {
      sheet.getColumn(index + 1).width = this.exportColumnWidth(column.header, imageColumnWidth);
    });
    sheet.getRow(1).height = 32;
    sheet.getRow(2).height = 32;
    const staticColumnCount = baseColumns.length + variantColumns.length;
    for (let column = 1; column <= staticColumnCount; column += 1) sheet.mergeCells(1, column, 2, column);
    let currencyStart = staticColumnCount + 1;
    currencies.forEach(currency => {
      const currencyWidth = 1 + levels.length;
      const currencyEnd = currencyStart + currencyWidth - 1;
      if (currencyEnd > currencyStart) sheet.mergeCells(1, currencyStart, 1, currencyEnd);
      sheet.getCell(1, currencyStart).value = `币种：${currency}`;
      currencyStart = currencyEnd + 1;
    });
    for (let row = 1; row <= 2; row += 1) {
      for (let column = 1; column <= columns.length; column += 1) {
        const descriptor = columns[column - 1];
        const color = descriptor.section === 'base' ? 'FF1E6FFF' : descriptor.section === 'variant' ? 'FF0891B2' : 'FFD97706';
        const cell = sheet.getCell(row, column);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        };
      }
    }
    const categoryLabels = this.categoryLabels(categories);
    const imageColumn = columns.findIndex(column => column.key === '商品图片') + 1;
    priceColumns.forEach(column => { sheet.getColumn(columns.findIndex(item => item.key === column.key) + 1).numFmt = '0.00'; });
    for (const [productIndex, product] of products.entries()) {
      const variants = product.variants?.length ? product.variants : [null];
      const startRow = sheet.rowCount + 1;
      const image = productImages[productIndex];
      const description = this.descriptionText(product.description);
      const displayImageWidth = image ? this.exportImageSize(image.width) : 0;
      const displayImageHeight = image ? this.exportImageSize(image.height) : 0;
      const base: Record<string, string | number> = {
        '商品编码': product.sku || '-', '商品名称': product.nameZh || '-', '分类': categoryLabels.get(product.category) || '-', '商品图片': '-',
        '商品描述': description, '标签': (product.tags || []).join('、') || '-',
        '商品标记': PRODUCT_BADGE_LABELS[product.badge || ''] || (product.hot ? PRODUCT_BADGE_LABELS.hot : '-'), '最小起订量': product.moq,
        '点赞数量': product.likeCount, '同步状态': product.status === 'published' ? '已同步' : '未同步',
      };
      const baseTextHeight = PRODUCT_EXPORT_BASE_COLUMNS
        .filter(header => header !== '商品图片')
        .reduce((height, header) => Math.max(height, this.exportTextHeight(base[header], this.exportColumnWidth(header, imageColumnWidth))), EXPORT_BASE_ROW_HEIGHT);
      const variantMinimumHeights = variants.map(variant => Math.max(
        this.exportTextHeight(variant?.specification || '-', this.exportColumnWidth('规格名称', imageColumnWidth)),
        this.exportTextHeight(variant?.option || '-', this.exportColumnWidth('规格选项', imageColumnWidth)),
      ));
      const imageHeight = image ? (displayImageHeight + EXPORT_IMAGE_PADDING) * 0.75 : EXPORT_BASE_ROW_HEIGHT;
      const requiredBlockHeight = Math.max(
        variantMinimumHeights.reduce((total, height) => total + height, 0),
        baseTextHeight,
        imageHeight,
      );
      const blockRowCount = Math.max(variants.length, Math.ceil(requiredBlockHeight / EXCEL_MAX_ROW_HEIGHT));
      const rowMinimumHeights = [
        ...variantMinimumHeights,
        ...Array.from({ length: blockRowCount - variants.length }, () => EXPORT_BASE_ROW_HEIGHT),
      ];
      const blockHeight = Math.max(requiredBlockHeight, rowMinimumHeights.reduce((total, height) => total + height, 0));
      const rowHeights = this.distributeExportRowHeights(rowMinimumHeights, blockHeight);
      for (let rowIndex = 0; rowIndex < blockRowCount; rowIndex += 1) {
        const hasVariant = rowIndex < variants.length;
        const variant = hasVariant ? variants[rowIndex] : null;
        const rowValues: Record<string, string | number> = {
          ...(rowIndex === 0 ? base : {}),
          '规格名称': hasVariant ? variant?.specification || '-' : '',
          '规格选项': hasVariant ? variant?.option || '-' : '',
        };
        if (hasVariant) currencies.forEach(currency => {
          const pricing = product.currencyPrices?.[currency];
          if (!pricing) {
            rowValues[`price:${currency}:base`] = '-';
            levels.forEach(level => { rowValues[`price:${currency}:${level.code}`] = '-'; });
            return;
          }
          const surcharge = Number(variant?.surcharges?.[currency] ?? (currency === currencies[0] ? variant?.surcharge : 0)) || 0;
          rowValues[`price:${currency}:base`] = Number(pricing.basePrice) + surcharge;
          levels.forEach(level => {
            const levelBase = pricing.levelPrices?.[level.code];
            rowValues[`price:${currency}:${level.code}`] = Number(levelBase === undefined ? pricing.basePrice : levelBase) + surcharge;
          });
        });
        const row = sheet.addRow(columns.map(column => rowValues[column.key] ?? ''));
        row.height = rowHeights[rowIndex];
      }
      const endRow = sheet.rowCount;
      if (endRow > startRow) PRODUCT_EXPORT_BASE_COLUMNS.forEach((_, index) => sheet.mergeCells(startRow, index + 1, endRow, index + 1));
      const fills = productIndex % 2 === 0
        ? { base: 'FFF4F7FB', variant: 'FFF0FDFA', price: 'FFFFFBEB' }
        : { base: 'FFEAF1F8', variant: 'FFE6F7F4', price: 'FFFFF4D6' };
      for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
        for (let column = 1; column <= columns.length; column += 1) {
          const cell = sheet.getCell(rowNumber, column);
          const fillColor = column <= PRODUCT_EXPORT_BASE_COLUMNS.length ? fills.base
            : column <= PRODUCT_EXPORT_BASE_COLUMNS.length + PRODUCT_EXPORT_VARIANT_COLUMNS.length ? fills.variant : fills.price;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          const topAligned = column === imageColumn || column === columns.findIndex(item => item.key === '商品描述') + 1;
          const leftAligned = column === columns.findIndex(item => item.key === '商品描述') + 1 || column === columns.findIndex(item => item.key === '标签') + 1;
          const priceAligned = column > PRODUCT_EXPORT_BASE_COLUMNS.length + PRODUCT_EXPORT_VARIANT_COLUMNS.length;
          cell.alignment = { vertical: topAligned ? 'top' : 'middle', horizontal: priceAligned ? 'right' : leftAligned ? 'left' : 'center', wrapText: true };
          cell.border = {
            left: { style: 'hair', color: { argb: 'FFD7E0EA' } },
            right: { style: 'hair', color: { argb: 'FFD7E0EA' } },
            bottom: { style: rowNumber === endRow ? 'medium' : 'hair', color: { argb: rowNumber === endRow ? 'FF7C8FA3' : 'FFD7E0EA' } },
          };
        }
      }
      sheet.getCell(startRow, columns.findIndex(column => column.key === '商品名称') + 1).font = { bold: true, color: { argb: 'FF16324F' } };
      if (image) {
        sheet.getCell(startRow, imageColumn).value = '';
        const rowHeightPixels = rowHeights[0] / 0.75;
        const imageColumnPixels = Math.floor(imageColumnWidth * 7 + 5);
        const imageId = workbook.addImage({ buffer: image.buffer as any, extension: image.extension });
        const horizontalInset = Math.max(EXPORT_IMAGE_PADDING / 2, (imageColumnPixels - displayImageWidth) / 2);
        sheet.addImage(imageId, {
          tl: {
            col: imageColumn - 1 + horizontalInset / imageColumnPixels,
            row: startRow - 1 + (EXPORT_IMAGE_PADDING / 2) / rowHeightPixels,
          },
          ext: { width: displayImageWidth, height: displayImageHeight },
          editAs: 'oneCell',
        });
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `mercivo-products-${stamp}.xlsx`, data: Buffer.from(await workbook.xlsx.writeBuffer()) };
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
    const defaultCurrency = await this.defaultCurrency(siteId);
    const currencyPrices = this.normalizeCurrencyPrices(dto.currencyPrices, defaultCurrency, dto.basePrice, dto.levelPrices);
    const variants = this.normalizeVariants(dto.variants, [], defaultCurrency);
    const defaultPrice = currencyPrices[defaultCurrency];
    const basePrice = defaultPrice.basePrice;
    const images = this.normalizeImages(dto.images, dto.img);
    const product = await this.productRepository.save(this.productRepository.create({ ...dto, img: images[0] || '', images, status: dto.status || 'pending', stock: 0, description: this.sanitizeDescription(dto.description), currencyPrices, basePrice, levelPrices: defaultPrice.levelPrices, variants, tags: this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants, defaultCurrency), tenantId, siteId }));
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
    const defaultCurrency = await this.defaultCurrency(siteId);
    const variants = dto.variants === undefined ? currentVariants : this.normalizeVariants(dto.variants, currentVariants, defaultCurrency);
    if (!currentVariants.length && variants.length) {
      const baseHasInventory = await this.balanceRepository.createQueryBuilder('balance').where("balance.product_id = :id AND balance.variant_key = 'BASE' AND (balance.on_hand <> 0 OR balance.reserved <> 0 OR balance.in_transit <> 0)", { id }).getCount();
      const baseHasHistory = await this.ledgerRepository.createQueryBuilder('ledger').where("ledger.product_id = :id AND ledger.variant_key = 'BASE'", { id }).getCount();
      if (baseHasInventory || baseHasHistory) throw new BadRequestException('商品已有默认规格库存或流水，清零后才能新增规格');
    }
    const removedVariantIds = currentVariants.filter(item => !variants.some(next => next.id === item.id)).map(item => item.id);
    if (removedVariantIds.length && (await this.balanceRepository.createQueryBuilder('balance').where('balance.product_id = :id AND balance.variant_key IN (:...keys) AND (balance.on_hand <> 0 OR balance.reserved <> 0 OR balance.in_transit <> 0)', { id, keys: removedVariantIds }).getCount() || await this.ledgerRepository.createQueryBuilder('ledger').where('ledger.product_id = :id AND ledger.variant_key IN (:...keys)', { id, keys: removedVariantIds }).getCount())) throw new BadRequestException('存在库存或流水的规格不可删除');
    const currencyPrices = dto.currencyPrices === undefined
      ? this.normalizeCurrencyPrices(product.currencyPrices || undefined, defaultCurrency, product.basePrice, product.levelPrices || undefined)
      : this.normalizeCurrencyPrices(dto.currencyPrices, defaultCurrency, dto.basePrice, dto.levelPrices);
    if (dto.currencyPrices === undefined && dto.basePrice !== undefined) currencyPrices[defaultCurrency] = { basePrice: Math.max(0, Number(dto.basePrice) || 0), levelPrices: dto.levelPrices === undefined ? currencyPrices[defaultCurrency].levelPrices : this.normalizeLevelPrices(dto.levelPrices) };
    const defaultPrice = currencyPrices[defaultCurrency];
    const basePrice = defaultPrice.basePrice;
    const images = dto.images === undefined && dto.img === undefined ? this.normalizeImages(product.images || undefined, product.img) : this.normalizeImages(dto.images, dto.img);
    Object.assign(product, dto, { img: images[0] || '', images, stock: product.stock, description: dto.description === undefined ? product.description : this.sanitizeDescription(dto.description), currencyPrices, basePrice, levelPrices: defaultPrice.levelPrices, variants, tags: dto.tags === undefined ? product.tags : this.normalizeTags(dto.tags), price: this.calculatePriceRange(basePrice, variants, defaultCurrency) });
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

  private async ensureCategory(code: string, siteId: string): Promise<void> {
    const exists = await this.productCategoryRepository.exist({ where: { siteId, code, status: 'enabled' } });
    if (!exists) throw new BadRequestException('请选择有效的商品分类');
  }

  private async exportReferences(siteId: string) {
    const [config, levels, categories] = await Promise.all([
      this.configRepository.findOne({ where: { key: `${siteId}:currency` } }),
      this.customerLevelRepository.find({ where: { siteId }, order: { sort: 'ASC', updatedAt: 'ASC' } }),
      this.productCategoryRepository.find({ where: { siteId }, order: { sort: 'ASC', createdAt: 'ASC' } }),
    ]);
    const value = (config?.value || {}) as any; const defaultCurrency = String(value.defaultCurrency || 'CNY').toUpperCase();
    const enabled = (value.currencies || []).filter((item: any) => item.enabled !== false).map((item: any) => String(item.code || '').toUpperCase()).filter((code: string) => /^[A-Z]{3}$/.test(code));
    const currencies = [defaultCurrency, ...enabled.filter((code: string) => code !== defaultCurrency)];
    return { currencies: [...new Set(currencies)], levels, categories };
  }

  private categoryLabels(categories: ProductCategory[]): Map<string, string> {
    const entries = new Map(categories.map(category => [category.code, category]));
    return new Map(categories.map(category => {
      const parent = category.parentCode ? entries.get(category.parentCode) : undefined;
      return [category.code, parent ? `${parent.label} / ${category.label}` : category.label];
    }));
  }

  private descriptionText(description?: string): string {
    if (!description?.trim()) return '-';
    const withLayout = description
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<\/(?:p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n');
    const text = new FilterXSS({ whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] }).process(withLayout);
    const decoded = text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(nbsp|amp|lt|gt|quot|apos));/gi, (_, decimal: string, hex: string, named: string) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[named.toLowerCase()] || '';
    });
    return decoded.split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n') || '-';
  }

  private exportColumnWidth(header: string, imageColumnWidth: number): number {
    if (header === '商品图片') return imageColumnWidth;
    return PRODUCT_EXPORT_COLUMN_WIDTHS[header] || 18;
  }

  private exportTextHeight(value: string | number | undefined, columnWidth: number): number {
    const text = value === undefined || value === null || value === '' ? '-' : String(value);
    const usableWidth = Math.max(4, Math.floor(columnWidth - 2));
    const displayLines = text.split('\n').reduce((total, line) => {
      const width = Array.from(line).reduce((lineWidth, character) => lineWidth + this.exportCharacterWidth(character), 0);
      return total + Math.max(1, Math.ceil(width / usableWidth));
    }, 0);
    return Math.max(EXPORT_BASE_ROW_HEIGHT, displayLines * EXPORT_TEXT_LINE_HEIGHT + EXPORT_TEXT_VERTICAL_PADDING);
  }

  private exportCharacterWidth(character: string): number {
    const codePoint = character.codePointAt(0) || 0;
    if ((codePoint >= 0x0300 && codePoint <= 0x036f) || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)) return 0;
    if (codePoint > 0xffff
      || (codePoint >= 0x1100 && codePoint <= 0x115f)
      || (codePoint >= 0x2e80 && codePoint <= 0xa4cf)
      || (codePoint >= 0xac00 && codePoint <= 0xd7a3)
      || (codePoint >= 0xf900 && codePoint <= 0xfaff)
      || (codePoint >= 0xfe10 && codePoint <= 0xfe6f)
      || (codePoint >= 0xff01 && codePoint <= 0xff60)
      || (codePoint >= 0xffe0 && codePoint <= 0xffe6)) return 2;
    return 1;
  }

  private distributeExportRowHeights(minimumHeights: number[], totalHeight: number): number[] {
    const result = new Array<number>(minimumHeights.length).fill(0);
    let remainingHeight = totalHeight;
    let remainingIndexes = minimumHeights.map((_, index) => index);
    while (remainingIndexes.length) {
      const evenHeight = remainingHeight / remainingIndexes.length;
      const fixedIndexes = remainingIndexes.filter(index => minimumHeights[index] > evenHeight);
      if (!fixedIndexes.length) {
        remainingIndexes.forEach(index => { result[index] = Math.min(EXCEL_MAX_ROW_HEIGHT, evenHeight); });
        break;
      }
      fixedIndexes.forEach(index => {
        result[index] = Math.min(EXCEL_MAX_ROW_HEIGHT, minimumHeights[index]);
        remainingHeight -= result[index];
      });
      const fixed = new Set(fixedIndexes);
      remainingIndexes = remainingIndexes.filter(index => !fixed.has(index));
    }
    return result.map(height => Math.max(EXPORT_BASE_ROW_HEIGHT, height));
  }

  private exportImageSize(sourceSize: number): number {
    return Math.max(1, sourceSize * EXPORT_IMAGE_SCALE);
  }

  private applyFilters(builder: SelectQueryBuilder<Product>, query: ProductQueryDto): void {
    if (query.keyword?.trim()) builder.andWhere('(product.name_zh LIKE :keyword OR product.sku LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    if (query.category) {
      const categories = query.category.split(',').map(item => item.trim()).filter(Boolean);
      if (categories.length) builder.andWhere('product.category IN (:...categories)', { categories });
    }
    if (query.status) builder.andWhere('product.status = :status', { status: query.status });
  }

  private async ensureUniqueCode(sku: string, siteId: string, excludedId?: string): Promise<void> {
    const existing = await this.productRepository.findOne({ where: { siteId, sku: sku.trim() } });
    if (existing && existing.id !== excludedId) throw new ConflictException('商品编码已存在，请更换后重试');
  }

  private normalizeVariants(variants: CreateProductDto['variants'] = [], existing: NonNullable<Product['variants']>, defaultCurrency: string) {
    return variants.map(item => ({
      id: String(item.id || randomUUID()),
      specification: String(item.specification || '').trim(),
      option: String(item.option || '').trim(),
      stock: existing.find(current => current.id === item.id)?.stock || 0,
      surcharge: Math.max(0, Number(item.surcharge) || 0),
      surcharges: this.normalizeSurcharges(item.surcharges, defaultCurrency, item.surcharge),
    }));
  }

  private normalizeImages(images: string[] | undefined, legacyImage?: string): string[] {
    const values = images === undefined ? [legacyImage || ''] : images;
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].slice(0, 10);
  }

  private calculatePriceRange(basePrice: number, variants: NonNullable<Product['variants']>, currency: string): string {
    if (!variants.length) return basePrice.toFixed(2);
    const prices = variants.map(item => basePrice + Number(item.surcharges?.[currency] ?? item.surcharge ?? 0));
    const min = Math.min(...prices).toFixed(2);
    const max = Math.max(...prices).toFixed(2);
    return min === max ? min : `${min}～${max}`;
  }

  private normalizeTags(tags: string[] = []): string[] {
    return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))].slice(0, 20);
  }

  private normalizeLevelPrices(prices?: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(prices || {}).filter(([code, value]) => /^lvl_[a-z0-9]+$/i.test(code) && Number.isFinite(Number(value)) && Number(value) >= 0).map(([code, value]) => [code, Number(value)]));
  }

  private normalizeCurrencyPrices(prices: CreateProductDto['currencyPrices'], defaultCurrency: string, legacyBase?: number, legacyLevels?: Record<string, number>) {
    const normalized: Record<string, { basePrice: number; levelPrices: Record<string, number> }> = {};
    for (const [rawCode, value] of Object.entries(prices || {})) {
      const code = rawCode.trim().toUpperCase();
      if (/^[A-Z]{3}$/.test(code) && value && Number.isFinite(Number(value.basePrice)) && Number(value.basePrice) >= 0) normalized[code] = { basePrice: Number(value.basePrice), levelPrices: this.normalizeLevelPrices(value.levelPrices) };
    }
    if (!normalized[defaultCurrency]) normalized[defaultCurrency] = { basePrice: Math.max(0, Number(legacyBase) || 0), levelPrices: this.normalizeLevelPrices(legacyLevels) };
    return normalized;
  }

  private normalizeSurcharges(values: Record<string, number> | undefined, defaultCurrency: string, legacy?: number) {
    const normalized = Object.fromEntries(Object.entries(values || {}).filter(([code, value]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(Number(value)) && Number(value) >= 0).map(([code, value]) => [code, Number(value)]));
    if (normalized[defaultCurrency] === undefined) normalized[defaultCurrency] = Math.max(0, Number(legacy) || 0);
    return normalized;
  }

  private async defaultCurrency(siteId: string): Promise<string> {
    const config = await this.configRepository.findOne({ where: { key: `${siteId}:currency` } });
    return String((config?.value as any)?.defaultCurrency || 'CNY').toUpperCase();
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
