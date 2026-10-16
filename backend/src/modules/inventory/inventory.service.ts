import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { AuthUser } from '../../common/types/auth-user';
import { CreateCountDto, CreateTransferDto, UpdateCountDto, WarehouseDto } from './inventory.dto';
import { InventoryBalance, InventoryLedgerEntry, StockCount, StockCountLine, StockTransfer, StockTransferLine, Warehouse } from './inventory.entity';
import { Tenant } from '../site/tenant.entity';
import { pageLimit, pageOffset, pageResult } from '../../common/dto/page-query.dto';
import { InventoryListQueryDto } from './inventory-query.dto';
import { AppConfig } from '../workspace/app-config.entity';
import { PurchaseReceipt } from '../purchase/purchase.entity';
import { SalesShipment } from '../sales/sales.entity';

const BASE_VARIANT = 'BASE';
const documentNo = (prefix: string) => `${prefix}${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${Math.random().toString().slice(2, 6)}`;
const warehouseCode = () => `WH${new Date().toISOString().replace(/\D/g, '').slice(2, 14)}${Math.random().toString().slice(2, 6)}`;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(InventoryBalance) private readonly balances: Repository<InventoryBalance>,
    @InjectRepository(InventoryLedgerEntry) private readonly ledger: Repository<InventoryLedgerEntry>,
    @InjectRepository(StockCount) private readonly counts: Repository<StockCount>,
    @InjectRepository(StockCountLine) private readonly countLines: Repository<StockCountLine>,
    @InjectRepository(StockTransfer) private readonly transfers: Repository<StockTransfer>,
    @InjectRepository(StockTransferLine) private readonly transferLines: Repository<StockTransferLine>,
    @InjectRepository(PurchaseReceipt) private readonly purchaseReceipts: Repository<PurchaseReceipt>,
    @InjectRepository(SalesShipment) private readonly salesShipments: Repository<SalesShipment>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AppConfig) private readonly configs: Repository<AppConfig>,
    private readonly dataSource: DataSource,
  ) {}

  async warehouseOptions(user: AuthUser) {
    const [warehouses, activeCounts] = await Promise.all([
      this.warehouses.find({ where: { siteId: user.siteId }, order: { isDefault: 'DESC', createdAt: 'ASC' } }),
      this.counts.find({ where: { siteId: user.siteId, status: 'counting' } }),
    ]);
    const locks = new Map(activeCounts.map(count => [count.warehouseId, count]));
    return warehouses.map(warehouse => {
      const count = locks.get(warehouse.id);
      return { ...this.publicWarehouse(warehouse), isLocked: Boolean(count), activeCountId: count?.id || null, activeCountDocumentNo: count?.documentNo || null };
    });
  }

  async listWarehouses(user: AuthUser, query: InventoryListQueryDto = new InventoryListQueryDto()) {
    const builder = this.warehouses.createQueryBuilder('warehouse').where('warehouse.site_id = :siteId', { siteId: user.siteId });
    if (query.keyword?.trim()) builder.andWhere('(warehouse.name LIKE :keyword OR warehouse.contact LIKE :keyword OR warehouse.phone LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    if (query.status) builder.andWhere('warehouse.status = :status', { status: query.status });
    const [items, total] = await builder.orderBy('warehouse.is_default', 'DESC').addOrderBy('warehouse.created_at', 'ASC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    const activeCounts = await this.counts.find({ where: { siteId: user.siteId, status: 'counting', warehouseId: In(items.map(item => item.id)) } });
    const locks = new Map(activeCounts.map(count => [count.warehouseId, count]));
    return pageResult(items.map(warehouse => { const count = locks.get(warehouse.id); return { ...this.publicWarehouse(warehouse), isLocked: Boolean(count), activeCountId: count?.id || null, activeCountDocumentNo: count?.documentNo || null }; }), total, query);
  }

  async stockOptions(user: AuthUser, warehouseId?: string) {
    const balances = await this.balances.find({ where: { siteId: user.siteId, ...(warehouseId ? { warehouseId } : {}) } });
    const [products, warehouses] = await Promise.all([this.products.find({ where: { siteId: user.siteId } }), this.warehouses.find({ where: { siteId: user.siteId } })]);
    const productMap = new Map(products.map(item => [item.id, item])); const warehouseMap = new Map(warehouses.map(item => [item.id, item.name]));
    return balances.map(balance => { const product = productMap.get(balance.productId); const variant = product?.variants?.find(item => item.id === balance.variantKey); const available = balance.onHand - balance.reserved; return { ...balance, available, productName: product?.nameZh || '', productSku: product?.sku || '', variantLabel: variant ? `${variant.specification}: ${variant.option}` : '默认规格', warehouseName: warehouseMap.get(balance.warehouseId) || '', status: available <= 0 ? 'out' : balance.warningStock > 0 && available <= balance.warningStock ? 'warning' : 'normal' }; });
  }

  async createWarehouse(dto: WarehouseDto, user: AuthUser) {
    const [tenant, warehouseCount] = await Promise.all([
      this.tenants.findOne({ where: { id: user.tenantId } }),
      this.warehouses.count({ where: { tenantId: user.tenantId } }),
    ]);
    if (!tenant || warehouseCount >= tenant.maxWarehouses) throw new BadRequestException(`当前套餐最多支持 ${tenant?.maxWarehouses || 0} 个仓库`);
    let code = warehouseCode();
    while (await this.warehouses.exist({ where: { siteId: user.siteId, code } })) code = warehouseCode();
    return this.publicWarehouse(await this.warehouses.save(this.warehouses.create({ ...dto, code, name: dto.name.trim(), tenantId: user.tenantId, siteId: user.siteId, status: dto.status || 'active', isDefault: false })));
  }

  async updateWarehouse(id: string, dto: WarehouseDto, user: AuthUser) {
    const warehouse = await this.requireWarehouse(id, user.siteId);
    if (warehouse.isDefault && dto.status === 'disabled') throw new BadRequestException('默认仓不可停用，请先设置其他默认仓');
    if (dto.status === 'disabled' && await this.counts.exist({ where: { warehouseId: id, siteId: user.siteId, status: 'counting' } })) throw new BadRequestException('仓库正在盘点，不可停用');
    Object.assign(warehouse, dto, { name: dto.name.trim() });
    return this.publicWarehouse(await this.warehouses.save(warehouse));
  }

  async setDefaultWarehouse(id: string, user: AuthUser) {
    const warehouse = await this.requireWarehouse(id, user.siteId);
    if (warehouse.status !== 'active') throw new BadRequestException('停用仓库不能设为默认仓');
    await this.dataSource.transaction(async manager => {
      await manager.update(Warehouse, { siteId: user.siteId }, { isDefault: false });
      await manager.update(Warehouse, { id, siteId: user.siteId }, { isDefault: true });
    });
    return this.publicWarehouse(await this.requireWarehouse(id, user.siteId));
  }

  async removeWarehouse(id: string, user: AuthUser) {
    const warehouse = await this.requireWarehouse(id, user.siteId);
    if (warehouse.isDefault) throw new BadRequestException('默认仓不可删除');
    const [balanceCount, countCount, transferCount] = await Promise.all([
      this.balances.count({ where: { warehouseId: id, siteId: user.siteId } }),
      this.counts.count({ where: { warehouseId: id, siteId: user.siteId } }),
      this.transfers.createQueryBuilder('t').where('t.site_id = :siteId AND (t.source_warehouse_id = :id OR t.destination_warehouse_id = :id)', { siteId: user.siteId, id }).getCount(),
    ]);
    if (balanceCount || countCount || transferCount) throw new BadRequestException('仓库已有库存或业务记录，请停用后保留历史');
    await this.warehouses.remove(warehouse);
  }

  async listStocks(user: AuthUser, query: InventoryListQueryDto) {
    const systemConfig = await this.configs.findOne({ where: { key: `${user.siteId}:system` } });
    const warningConfig = (systemConfig?.value as any)?.inventoryWarning || { enabled: true, threshold: 10 };
    const warningEnabled = warningConfig.enabled !== false;
    const warningThreshold = Math.max(0, Number(warningConfig.threshold) || 0);
    const builder = this.balances.createQueryBuilder('balance')
      .leftJoin(Product, 'product', 'product.id = balance.product_id')
      .where('balance.site_id = :siteId', { siteId: user.siteId });
    if (query.warehouseId) builder.andWhere('balance.warehouse_id = :warehouseId', { warehouseId: query.warehouseId });
    if (query.keyword?.trim()) builder.andWhere('(product.name_zh LIKE :keyword OR product.sku LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    const available = '(balance.on_hand - balance.reserved)';
    if (query.status === 'out') builder.andWhere(`${available} <= 0`);
    if (query.status === 'warning') builder.andWhere(warningEnabled ? `${available} > 0 AND ${available} <= :warningThreshold` : '1 = 0', { warningThreshold });
    if (query.status === 'normal') builder.andWhere(warningEnabled ? `${available} > :warningThreshold` : `${available} > 0`, { warningThreshold });
    const warningExpression = warningEnabled ? `${available} <= 0 OR (${available} > 0 AND ${available} <= :warningThreshold)` : `${available} <= 0`;
    const [[balances, total], aggregate, warehouseAggregates, warehouses] = await Promise.all([
      builder.clone().orderBy('balance.updatedAt', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount(),
      builder.clone().select('COALESCE(SUM(balance.on_hand), 0)', 'onHand').addSelect(`COALESCE(SUM(${available}), 0)`, 'available').addSelect('COALESCE(SUM(balance.in_transit), 0)', 'inTransit').addSelect(`SUM(CASE WHEN ${warningExpression} THEN 1 ELSE 0 END)`, 'warningItems').setParameter('warningThreshold', warningThreshold).getRawOne(),
      builder.clone().select('balance.warehouse_id', 'warehouseId').addSelect('COALESCE(SUM(balance.on_hand), 0)', 'onHand').addSelect(`COALESCE(SUM(${available}), 0)`, 'available').addSelect('COALESCE(SUM(balance.in_transit), 0)', 'inTransit').addSelect(`SUM(CASE WHEN ${warningExpression} THEN 1 ELSE 0 END)`, 'warningItems').setParameter('warningThreshold', warningThreshold).groupBy('balance.warehouse_id').getRawMany(),
      this.warehouseOptions(user),
    ]);
    const products = balances.length ? await this.products.find({ where: { siteId: user.siteId, id: In([...new Set(balances.map(item => item.productId))]) } }) : [];
    const productMap = new Map(products.map(item => [item.id, item]));
    const warehouseMap = new Map(warehouses.map(item => [item.id, item]));
    const rows = balances.map(balance => {
      const product = productMap.get(balance.productId);
      const variant = product?.variants?.find(item => item.id === balance.variantKey);
      const available = balance.onHand - balance.reserved;
      return { ...balance, available, warningStock: warningThreshold, productName: product?.nameZh || '', productSku: product?.sku || '', variantLabel: variant ? `${variant.specification}: ${variant.option}` : '默认规格', warehouseName: warehouseMap.get(balance.warehouseId)?.name || '', status: available <= 0 ? 'out' : warningEnabled && available <= warningThreshold ? 'warning' : 'normal' };
    });
    const aggregateMap = new Map(warehouseAggregates.map(item => [item.warehouseId, item]));
    const warehouseSummary = warehouses.filter(item => !query.warehouseId || item.id === query.warehouseId).map(warehouse => {
      const item = aggregateMap.get(warehouse.id);
      return { warehouseId: warehouse.id, warehouseName: warehouse.name, onHand: Number(item?.onHand || 0), available: Number(item?.available || 0), inTransit: Number(item?.inTransit || 0), warningItems: Number(item?.warningItems || 0) };
    });
    return { ...pageResult(rows, total, query), summary: { onHand: Number(aggregate?.onHand || 0), available: Number(aggregate?.available || 0), inTransit: Number(aggregate?.inTransit || 0), warningItems: Number(aggregate?.warningItems || 0), warehouses: warehouseSummary, warningEnabled, warningThreshold } };
  }

  async listLedger(user: AuthUser, query: InventoryListQueryDto) {
    const builder = this.ledger.createQueryBuilder('entry')
      .leftJoin(Product, 'product', 'product.id = entry.product_id')
      .leftJoin(Warehouse, 'warehouse', 'warehouse.id = entry.warehouse_id')
      .leftJoin(StockCount, 'stockCount', "stockCount.id = entry.reference_id AND entry.reference_type = 'stock_count'")
      .leftJoin(StockTransfer, 'stockTransfer', "stockTransfer.id = entry.reference_id AND entry.reference_type = 'stock_transfer'")
      .leftJoin(PurchaseReceipt, 'purchaseReceipt', "purchaseReceipt.id = entry.reference_id AND entry.reference_type = 'purchase_receipt'")
      .leftJoin(SalesShipment, 'salesShipment', "salesShipment.id = entry.reference_id AND entry.reference_type = 'sales_shipment'")
      .where('entry.site_id = :siteId', { siteId: user.siteId });
    if (query.warehouseId) builder.andWhere('entry.warehouse_id = :warehouseId', { warehouseId: query.warehouseId });
    if (query.productId) builder.andWhere('entry.product_id = :productId', { productId: query.productId });
    if (query.variantKey) builder.andWhere('entry.variant_key = :variantKey', { variantKey: query.variantKey });
    if (query.type) builder.andWhere('entry.type = :type', { type: query.type });
    if (query.startDate) builder.andWhere('entry.created_at >= :startDate', { startDate: `${query.startDate}T00:00:00` });
    if (query.endDate) builder.andWhere('entry.created_at <= :endDate', { endDate: `${query.endDate}T23:59:59.999` });
    if (query.keyword?.trim()) builder.andWhere('(product.name_zh LIKE :keyword OR product.sku LIKE :keyword OR warehouse.name LIKE :keyword OR stockCount.document_no LIKE :keyword OR stockTransfer.document_no LIKE :keyword OR purchaseReceipt.receipt_no LIKE :keyword OR salesShipment.shipment_no LIKE :keyword OR entry.remark LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    const [[entries, total], aggregate] = await Promise.all([
      builder.clone().orderBy('entry.createdAt', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount(),
      builder.clone().select('COALESCE(SUM(CASE WHEN entry.quantity_change > 0 THEN entry.quantity_change ELSE 0 END), 0)', 'inbound').addSelect('COALESCE(SUM(CASE WHEN entry.quantity_change < 0 THEN entry.quantity_change ELSE 0 END), 0)', 'outbound').getRawOne(),
    ]);
    const productIds = [...new Set(entries.map(item => item.productId))];
    const warehouseIds = [...new Set(entries.map(item => item.warehouseId))];
    const countIds = entries.filter(item => item.referenceType === 'stock_count').map(item => item.referenceId);
    const transferIds = entries.filter(item => item.referenceType === 'stock_transfer').map(item => item.referenceId);
    const purchaseReceiptIds = entries.filter(item => item.referenceType === 'purchase_receipt').map(item => item.referenceId);
    const salesShipmentIds = entries.filter(item => item.referenceType === 'sales_shipment').map(item => item.referenceId);
    const [products, warehouses, counts, transfers, purchaseReceipts, salesShipments] = await Promise.all([
      productIds.length ? this.products.find({ where: { siteId: user.siteId, id: In(productIds) } }) : [],
      warehouseIds.length ? this.warehouses.find({ where: { siteId: user.siteId, id: In(warehouseIds) } }) : [],
      countIds.length ? this.counts.find({ where: { siteId: user.siteId, id: In(countIds) } }) : [],
      transferIds.length ? this.transfers.find({ where: { siteId: user.siteId, id: In(transferIds) } }) : [],
      purchaseReceiptIds.length ? this.purchaseReceipts.find({ where: { siteId: user.siteId, id: In(purchaseReceiptIds) } }) : [],
      salesShipmentIds.length ? this.salesShipments.find({ where: { siteId: user.siteId, id: In(salesShipmentIds) } }) : [],
    ]);
    const productMap = new Map(products.map(item => [item.id, item]));
    const warehouseMap = new Map(warehouses.map(item => [item.id, item.name]));
    const referenceMap = new Map([
      ...counts.map(item => [item.id, item.documentNo] as const),
      ...transfers.map(item => [item.id, item.documentNo] as const),
      ...purchaseReceipts.map(item => [item.id, item.receiptNo] as const),
      ...salesShipments.map(item => [item.id, item.shipmentNo] as const),
    ]);
    const rows = entries.map(entry => {
      const product = productMap.get(entry.productId);
      const variant = product?.variants?.find(item => item.id === entry.variantKey);
      const openingReference = entry.type === 'opening' ? '期初库存' : null;
      return { ...entry, warehouseName: warehouseMap.get(entry.warehouseId) || '', productName: product?.nameZh || '', productSku: product?.sku || '', variantLabel: variant ? `${variant.specification}: ${variant.option}` : '默认规格', referenceNo: referenceMap.get(entry.referenceId) || openingReference || entry.referenceId };
    });
    return { ...pageResult(rows, total, query), summary: { inbound: Number(aggregate?.inbound || 0), outbound: Number(aggregate?.outbound || 0) } };
  }

  async listCounts(user: AuthUser, query: InventoryListQueryDto) {
    const builder = this.counts.createQueryBuilder('count').where('count.site_id = :siteId', { siteId: user.siteId });
    if (query.keyword?.trim()) builder.andWhere('count.document_no LIKE :keyword', { keyword: `%${query.keyword.trim()}%` });
    if (query.status) builder.andWhere('count.status = :status', { status: query.status });
    if (query.warehouseId) builder.andWhere('count.warehouse_id = :warehouseId', { warehouseId: query.warehouseId });
    const [items, total] = await builder.orderBy('count.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    return pageResult(await this.attachCountDetails(items, user.siteId), total, query);
  }

  async getCount(id: string, user: AuthUser) {
    const count = await this.requireCount(id, user.siteId);
    return (await this.attachCountDetails([count], user.siteId))[0];
  }

  async createCount(dto: CreateCountDto, user: AuthUser) {
    let countId = '';
    await this.dataSource.transaction(async manager => {
      const warehouse = await manager.findOne(Warehouse, { where: { id: dto.warehouseId, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (!warehouse) throw new NotFoundException('仓库不存在');
      if (warehouse.status !== 'active') throw new BadRequestException('仓库已停用');
      if (await manager.count(StockCount, { where: { warehouseId: warehouse.id, siteId: user.siteId, status: 'counting' } })) throw new ConflictException('该仓库正在盘点');
      const sourceBalances = await manager.find(InventoryBalance, { where: { warehouseId: warehouse.id, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      const requested = dto.lines?.length ? new Set(dto.lines.map(item => `${item.productId}:${item.variantKey || BASE_VARIANT}`)) : null;
      const selected = sourceBalances.filter(item => !requested || requested.has(`${item.productId}:${item.variantKey}`));
      if (!selected.length) throw new BadRequestException('该仓库暂无可盘点库存');
      const count = await manager.save(manager.create(StockCount, { tenantId: user.tenantId, siteId: user.siteId, documentNo: documentNo('PD'), warehouseId: warehouse.id, status: 'counting', remark: dto.remark || '', createdBy: user.userId, startedAt: new Date(), completedAt: null }));
      countId = count.id;
      const inputMap = new Map((dto.lines || []).map(item => [`${item.productId}:${item.variantKey || BASE_VARIANT}`, item.countedQuantity]));
      await manager.save(selected.map(item => manager.create(StockCountLine, { countId: count.id, productId: item.productId, variantKey: item.variantKey, systemQuantity: item.onHand, countedQuantity: inputMap.get(`${item.productId}:${item.variantKey}`) ?? null, difference: 0 })));
    });
    return this.getCount(countId, user);
  }

  async updateCount(id: string, dto: UpdateCountDto, user: AuthUser) {
    const count = await this.requireCount(id, user.siteId);
    if (!['draft', 'counting'].includes(count.status)) throw new BadRequestException('当前盘点单不可编辑');
    const existing = await this.countLines.find({ where: { countId: id } });
    const inputMap = new Map(dto.lines.map(line => [`${line.productId}:${line.variantKey || BASE_VARIANT}`, line.countedQuantity]));
    for (const line of existing) {
      const counted = inputMap.get(`${line.productId}:${line.variantKey}`);
      if (counted !== undefined) { line.countedQuantity = counted; line.difference = counted - line.systemQuantity; }
    }
    count.remark = dto.remark ?? count.remark;
    await Promise.all([this.counts.save(count), this.countLines.save(existing)]);
    return this.getCount(id, user);
  }

  async startCount(id: string, user: AuthUser) {
    await this.dataSource.transaction(async manager => {
      const count = await manager.findOne(StockCount, { where: { id, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (!count) throw new NotFoundException('盘点单不存在');
      if (count.status !== 'draft') throw new BadRequestException('仅草稿盘点单可以开始');
      await manager.findOne(Warehouse, { where: { id: count.warehouseId, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (await manager.count(StockCount, { where: { warehouseId: count.warehouseId, siteId: user.siteId, status: 'counting' } })) throw new ConflictException('该仓库已有进行中的盘点');
      const lines = await manager.find(StockCountLine, { where: { countId: id } });
      for (const line of lines) {
        const balance = await this.lockBalance(manager, count, line.productId, line.variantKey);
        line.systemQuantity = balance.onHand;
        line.difference = line.countedQuantity === null ? 0 : line.countedQuantity - balance.onHand;
      }
      await manager.save(lines);
      count.status = 'counting'; count.startedAt = new Date(); await manager.save(count);
    });
    return this.getCount(id, user);
  }

  async completeCount(id: string, user: AuthUser) {
    await this.dataSource.transaction(async manager => {
      const count = await manager.findOne(StockCount, { where: { id, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (!count) throw new NotFoundException('盘点单不存在');
      if (count.status !== 'counting') throw new BadRequestException('仅盘点中的单据可以完成');
      const lines = await manager.find(StockCountLine, { where: { countId: id } });
      if (lines.some(line => line.countedQuantity === null)) throw new BadRequestException('请录入全部实盘数量');
      for (const line of lines) {
        const balance = await this.lockBalance(manager, count, line.productId, line.variantKey);
        const counted = Number(line.countedQuantity);
        if (counted < balance.reserved) throw new BadRequestException('实盘数量不能低于已预占数量');
        const difference = counted - balance.onHand;
        balance.onHand = counted; line.systemQuantity = counted - difference; line.difference = difference;
        await manager.save(balance); await manager.save(line);
        if (difference) await manager.save(manager.create(InventoryLedgerEntry, { tenantId: user.tenantId, siteId: user.siteId, warehouseId: count.warehouseId, productId: line.productId, variantKey: line.variantKey, type: 'count_adjust', quantityChange: difference, balanceAfter: counted, referenceType: 'stock_count', referenceId: count.id, actorUserId: user.userId, remark: count.remark }));
      }
      count.status = 'completed'; count.completedAt = new Date(); await manager.save(count);
      await this.syncProducts(manager, [...new Set(lines.map(line => line.productId))], user.siteId);
    });
    return this.getCount(id, user);
  }

  async cancelCount(id: string, user: AuthUser) {
    const count = await this.requireCount(id, user.siteId);
    if (!['draft', 'counting'].includes(count.status)) throw new BadRequestException('当前盘点单不可取消');
    count.status = 'cancelled'; return this.counts.save(count);
  }

  async removeCount(id: string, user: AuthUser) {
    const count = await this.requireCount(id, user.siteId);
    if (count.status !== 'cancelled') throw new BadRequestException('仅已取消的盘点单可以删除');
    await this.dataSource.transaction(async manager => {
      await manager.delete(StockCountLine, { countId: id });
      await manager.delete(StockCount, { id, siteId: user.siteId });
    });
  }

  async listTransfers(user: AuthUser, query: InventoryListQueryDto) {
    const builder = this.transfers.createQueryBuilder('transfer').where('transfer.site_id = :siteId', { siteId: user.siteId });
    if (query.keyword?.trim()) builder.andWhere('transfer.document_no LIKE :keyword', { keyword: `%${query.keyword.trim()}%` });
    if (query.status) builder.andWhere('transfer.status = :status', { status: query.status });
    const [items, total] = await builder.orderBy('transfer.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    return pageResult(await this.attachTransferDetails(items, user.siteId), total, query);
  }

  async getTransfer(id: string, user: AuthUser) {
    const transfer = await this.requireTransfer(id, user.siteId);
    return (await this.attachTransferDetails([transfer], user.siteId))[0];
  }

  async createTransfer(dto: CreateTransferDto, user: AuthUser) {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) throw new BadRequestException('调出仓和调入仓不能相同');
    if (!dto.lines.length) throw new BadRequestException('请添加调拨商品');
    const dimensions = dto.lines.map(line => `${line.productId}:${line.variantKey || BASE_VARIANT}`);
    if (new Set(dimensions).size !== dimensions.length) throw new BadRequestException('同一商品规格不可重复添加');
    const productIds = [...new Set(dto.lines.map(line => line.productId))];
    let transferId = '';
    await this.dataSource.transaction(async manager => {
      if (await manager.count(Product, { where: { id: In(productIds), siteId: user.siteId } }) !== productIds.length) throw new BadRequestException('调拨商品不存在');
      const warehouseIds = [dto.sourceWarehouseId, dto.destinationWarehouseId].sort();
      const activeWarehouses = await manager.find(Warehouse, { where: { id: In(warehouseIds), siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (activeWarehouses.length !== 2 || activeWarehouses.some(item => item.status !== 'active')) throw new BadRequestException('停用仓库不可调拨');
      await this.assertWarehousesNotCounting(manager, warehouseIds, user.siteId);
      const transfer = await manager.save(manager.create(StockTransfer, { tenantId: user.tenantId, siteId: user.siteId, documentNo: documentNo('DB'), sourceWarehouseId: dto.sourceWarehouseId, destinationWarehouseId: dto.destinationWarehouseId, status: 'shipped', remark: dto.remark || '', createdBy: user.userId, shippedAt: new Date(), receivedAt: null }));
      transferId = transfer.id;
      const lines = dto.lines.map(line => manager.create(StockTransferLine, { transferId: transfer.id, productId: line.productId, variantKey: line.variantKey || BASE_VARIANT, quantity: line.quantity }));
      await manager.save(lines);
      for (const line of lines) {
        const source = await this.lockBalance(manager, transfer, line.productId, line.variantKey, transfer.sourceWarehouseId);
        if (source.onHand - source.reserved < line.quantity) throw new BadRequestException('可用库存不足，无法发出调拨');
        const destination = await this.getOrCreateBalance(manager, transfer, line.productId, line.variantKey, transfer.destinationWarehouseId);
        source.onHand -= line.quantity; destination.inTransit += line.quantity;
        await manager.save([source, destination]);
        await manager.save(manager.create(InventoryLedgerEntry, { tenantId: user.tenantId, siteId: user.siteId, warehouseId: source.warehouseId, productId: line.productId, variantKey: line.variantKey, type: 'transfer_out', quantityChange: -line.quantity, balanceAfter: source.onHand, referenceType: 'stock_transfer', referenceId: transfer.id, actorUserId: user.userId, remark: transfer.remark }));
      }
      await this.syncProducts(manager, productIds, user.siteId);
    });
    return this.getTransfer(transferId, user);
  }

  async receiveTransfer(id: string, user: AuthUser) {
    await this.dataSource.transaction(async manager => {
      const transfer = await manager.findOne(StockTransfer, { where: { id, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      if (!transfer) throw new NotFoundException('调拨单不存在');
      if (transfer.status !== 'shipped') throw new BadRequestException('仅已发出的调拨单可以收货');
      await manager.findOne(Warehouse, { where: { id: transfer.destinationWarehouseId, siteId: user.siteId }, lock: { mode: 'pessimistic_write' } });
      await this.assertWarehousesNotCounting(manager, [transfer.destinationWarehouseId], user.siteId);
      const lines = await manager.find(StockTransferLine, { where: { transferId: id } });
      for (const line of lines) {
        const destination = await this.lockBalance(manager, transfer, line.productId, line.variantKey, transfer.destinationWarehouseId);
        if (destination.inTransit < line.quantity) throw new ConflictException('在途库存异常，请刷新后重试');
        destination.inTransit -= line.quantity; destination.onHand += line.quantity; await manager.save(destination);
        await manager.save(manager.create(InventoryLedgerEntry, { tenantId: user.tenantId, siteId: user.siteId, warehouseId: destination.warehouseId, productId: line.productId, variantKey: line.variantKey, type: 'transfer_in', quantityChange: line.quantity, balanceAfter: destination.onHand, referenceType: 'stock_transfer', referenceId: id, actorUserId: user.userId, remark: transfer.remark }));
      }
      transfer.status = 'received'; transfer.receivedAt = new Date(); await manager.save(transfer);
      await this.syncProducts(manager, [...new Set(lines.map(line => line.productId))], user.siteId);
    });
    return this.getTransfer(id, user);
  }

  async removeTransfer(id: string, user: AuthUser) {
    const transfer = await this.requireTransfer(id, user.siteId);
    if (transfer.status !== 'cancelled') throw new BadRequestException('仅已取消的调拨单可以删除');
    await this.dataSource.transaction(async manager => {
      await manager.delete(StockTransferLine, { transferId: id });
      await manager.delete(StockTransfer, { id, siteId: user.siteId });
    });
  }

  private requireWarehouse(id: string, siteId: string) { return this.warehouses.findOne({ where: { id, siteId } }).then(item => { if (!item) throw new NotFoundException('仓库不存在'); return item; }); }
  private publicWarehouse(warehouse: Warehouse) {
    const { code: _code, tenantId: _tenantId, siteId: _siteId, updatedAt: _updatedAt, ...publicData } = warehouse;
    return publicData;
  }
  private async requireActiveWarehouse(id: string, siteId: string) { const item = await this.requireWarehouse(id, siteId); if (item.status !== 'active') throw new BadRequestException('仓库已停用'); return item; }
  private requireCount(id: string, siteId: string) { return this.counts.findOne({ where: { id, siteId } }).then(item => { if (!item) throw new NotFoundException('盘点单不存在'); return item; }); }
  private requireTransfer(id: string, siteId: string) { return this.transfers.findOne({ where: { id, siteId } }).then(item => { if (!item) throw new NotFoundException('调拨单不存在'); return item; }); }

  private async attachCountDetails(items: StockCount[], siteId: string) {
    const [warehouseRows, lineGroups] = await Promise.all([
      this.warehouses.find({ where: { siteId } }),
      Promise.all(items.map(item => this.countLines.find({ where: { countId: item.id } }))),
    ]);
    const productIds = [...new Set(lineGroups.flat().map(line => line.productId))];
    const productRows = productIds.length
      ? await this.products.find({ where: { siteId, id: In(productIds) } })
      : [];
    const warehouses = new Map(warehouseRows.map(item => [item.id, item]));
    const products = new Map(productRows.map(item => [item.id, item]));
    return items.map((item, index) => ({
      ...item,
      warehouseName: warehouses.get(item.warehouseId)?.name || '',
      lines: lineGroups[index].map(line => {
        const product = products.get(line.productId);
        const variant = product?.variants?.find(entry => entry.id === line.variantKey);
        return {
          ...line,
          productName: product?.nameZh || '',
          productSku: product?.sku || '',
          variantLabel: variant ? `${variant.specification}: ${variant.option}` : '默认规格',
        };
      }),
    }));
  }
  private async attachTransferDetails(items: StockTransfer[], siteId: string) {
    const warehouses = new Map((await this.warehouses.find({ where: { siteId } })).map(item => [item.id, item]));
    return Promise.all(items.map(async item => ({ ...item, sourceWarehouseName: warehouses.get(item.sourceWarehouseId)?.name || '', destinationWarehouseName: warehouses.get(item.destinationWarehouseId)?.name || '', lines: await this.transferLines.find({ where: { transferId: item.id } }) })));
  }

  private async assertWarehousesNotCounting(manager: EntityManager, warehouseIds: string[], siteId: string) {
    if (await manager.count(StockCount, { where: { warehouseId: In(warehouseIds), siteId, status: 'counting' } })) throw new ConflictException('相关仓库正在盘点，暂不可变动库存');
  }
  private async lockBalance(manager: EntityManager, reference: { siteId: string; tenantId: string; warehouseId?: string }, productId: string, variantKey: string, warehouseId?: string) {
    const id = warehouseId || reference.warehouseId!;
    const balance = await manager.findOne(InventoryBalance, { where: { siteId: reference.siteId, warehouseId: id, productId, variantKey }, lock: { mode: 'pessimistic_write' } });
    if (!balance) throw new NotFoundException('库存记录不存在');
    return balance;
  }
  private async getOrCreateBalance(manager: EntityManager, reference: { siteId: string; tenantId: string }, productId: string, variantKey: string, warehouseId: string) {
    return (await manager.findOne(InventoryBalance, { where: { siteId: reference.siteId, warehouseId, productId, variantKey }, lock: { mode: 'pessimistic_write' } })) || manager.save(manager.create(InventoryBalance, { tenantId: reference.tenantId, siteId: reference.siteId, warehouseId, productId, variantKey, onHand: 0, reserved: 0, inTransit: 0, warningStock: 0 }));
  }
  private async syncProducts(manager: EntityManager, productIds: string[], siteId: string) {
    for (const productId of productIds) {
      const product = await manager.findOne(Product, { where: { id: productId, siteId } });
      if (!product) continue;
      const balances = await manager.find(InventoryBalance, { where: { productId, siteId } });
      product.stock = balances.reduce((sum, item) => sum + item.onHand, 0);
      if (product.variants?.length) product.variants = product.variants.map(variant => ({ ...variant, stock: balances.filter(item => item.variantKey === variant.id).reduce((sum, item) => sum + item.onHand, 0) }));
      await manager.save(product);
    }
  }
}
