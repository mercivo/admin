import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const user = { userId: 'user-1', account: 'admin', role: 'admin' as const, tenantId: 'tenant-1', siteId: 'site-1' };
  let warehouses: Record<string, jest.Mock>;
  let balances: Record<string, jest.Mock>;
  let ledger: Record<string, jest.Mock>;
  let counts: Record<string, jest.Mock>;
  let countLines: Record<string, jest.Mock>;
  let transfers: Record<string, jest.Mock>;
  let transferLines: Record<string, jest.Mock>;
  let products: Record<string, jest.Mock>;
  let tenants: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let service: InventoryService;

  beforeEach(() => {
    warehouses = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue({ id: 'wh-1', siteId: 'site-1', status: 'active', isDefault: false }), exist: jest.fn().mockResolvedValue(false), count: jest.fn().mockResolvedValue(0), save: jest.fn(value => Promise.resolve(value)), create: jest.fn(value => value) };
    balances = { find: jest.fn().mockResolvedValue([]) };
    ledger = { find: jest.fn().mockResolvedValue([]) };
    counts = { exist: jest.fn().mockResolvedValue(false), find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    countLines = { find: jest.fn().mockResolvedValue([]) };
    transfers = { find: jest.fn().mockResolvedValue([]), save: jest.fn(value => Promise.resolve({ id: 'transfer-1', ...value })), create: jest.fn(value => value) };
    transferLines = { save: jest.fn(value => Promise.resolve(value)), create: jest.fn(value => value) };
    products = { find: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(1) };
    tenants = { findOne: jest.fn().mockResolvedValue({ id: 'tenant-1', maxWarehouses: 2 }) };
    dataSource = { transaction: jest.fn(async callback => callback({})) };
    service = new InventoryService(warehouses as never, balances as never, ledger as never, counts as never, countLines as never, transfers as never, transferLines as never, products as never, tenants as never, dataSource as never);
  });

  it('generates an internal warehouse code when creating a warehouse', async () => {
    await service.createWarehouse({ name: '上海仓', contact: '张三' }, user);
    expect(warehouses.create).toHaveBeenCalledWith(expect.objectContaining({ name: '上海仓', code: expect.stringMatching(/^WH\d{16}$/), siteId: 'site-1' }));
  });

  it('rejects warehouse creation when the plan quota is exhausted', async () => {
    tenants.findOne.mockResolvedValue({ id: 'tenant-1', maxWarehouses: 1 });
    warehouses.count.mockResolvedValue(1);
    await expect(service.createWarehouse({ name: '超额仓' }, user)).rejects.toThrow('当前套餐最多支持 1 个仓库');
  });

  it('enriches ledger details and strictly filters the requested variant', async () => {
    const createdAt = new Date('2026-10-12T08:00:00Z');
    ledger.find.mockResolvedValue([
      { id: 'l-1', warehouseId: 'wh-1', productId: 'product-1', variantKey: 'v-red', type: 'transfer_in', quantityChange: 3, balanceAfter: 8, referenceId: 't-1', referenceType: 'stock_transfer', remark: '到货', createdAt },
      { id: 'l-2', warehouseId: 'wh-1', productId: 'product-1', variantKey: 'v-blue', type: 'transfer_in', quantityChange: 2, balanceAfter: 4, referenceId: 't-1', referenceType: 'stock_transfer', remark: '', createdAt },
    ]);
    warehouses.find.mockResolvedValue([{ id: 'wh-1', name: '上海仓' }]);
    products.find.mockResolvedValue([{ id: 'product-1', nameZh: '测试商品', sku: 'SKU-1', variants: [{ id: 'v-red', specification: '颜色', option: '红' }, { id: 'v-blue', specification: '颜色', option: '蓝' }] }]);
    transfers.find.mockResolvedValue([{ id: 't-1', documentNo: 'DB001' }]);
    const result = await service.listLedger(user, { warehouseId: 'wh-1', productId: 'product-1', variantKey: 'v-red' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ warehouseName: '上海仓', productName: '测试商品', variantLabel: '颜色: 红', referenceNo: 'DB001' });
    expect(result.summary).toEqual({ inbound: 3, outbound: 0 });
  });

  it('derives available inventory and warning status for stock queries', async () => {
    balances.find.mockResolvedValue([{ id: 'balance-1', warehouseId: 'wh-1', productId: 'product-1', variantKey: 'BASE', onHand: 8, reserved: 3, inTransit: 2, warningStock: 6 }]);
    products.find.mockResolvedValue([{ id: 'product-1', nameZh: '测试商品', nameEn: '', sku: 'SKU-1', variants: [] }]);
    warehouses.find.mockResolvedValue([{ id: 'wh-1', name: '默认仓', isDefault: true, createdAt: new Date() }]);
    const result = await service.listStocks(user, {});
    expect(result.items[0]).toMatchObject({ available: 5, status: 'warning', productName: '测试商品', warehouseName: '默认仓' });
    expect(result.summary).toMatchObject({ onHand: 8, available: 5, inTransit: 2, warningItems: 1 });
  });

  it('marks a warehouse as locked while a stock count is in progress', async () => {
    warehouses.find.mockResolvedValue([{ id: 'wh-1', name: '默认仓', status: 'active', isDefault: true }]);
    counts.find.mockResolvedValue([{ id: 'count-1', warehouseId: 'wh-1', documentNo: 'PD001', status: 'counting' }]);

    await expect(service.listWarehouses(user)).resolves.toEqual([
      expect.objectContaining({ id: 'wh-1', isLocked: true, activeCountId: 'count-1', activeCountDocumentNo: 'PD001' }),
    ]);
  });

  it('starts and locks a stock count immediately when it is created', async () => {
    const balance = { warehouseId: 'wh-1', productId: 'product-1', variantKey: 'BASE', onHand: 8 };
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 'wh-1', siteId: 'site-1', status: 'active' }),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([balance]),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async value => Array.isArray(value) ? value : ({ id: 'count-1', ...value })),
    };
    dataSource.transaction.mockImplementation(async callback => callback(manager));
    const created = { id: 'count-1', warehouseId: 'wh-1', documentNo: 'PD001', status: 'counting' };
    counts.findOne.mockResolvedValue(created);
    warehouses.find.mockResolvedValue([{ id: 'wh-1', name: '默认仓' }]);

    await expect(service.createCount({ warehouseId: 'wh-1' }, user)).resolves.toMatchObject({ id: 'count-1', status: 'counting' });
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'counting', startedAt: expect.any(Date) }));
  });

  it('rejects a transfer whose source and destination are the same', async () => {
    await expect(service.createTransfer({ sourceWarehouseId: 'wh-1', destinationWarehouseId: 'wh-1', lines: [{ productId: 'product-1', quantity: 1 }] }, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate product dimensions on one transfer', async () => {
    await expect(service.createTransfer({ sourceWarehouseId: 'wh-1', destinationWarehouseId: 'wh-2', lines: [{ productId: 'product-1', variantKey: 'BASE', quantity: 1 }, { productId: 'product-1', variantKey: 'BASE', quantity: 2 }] }, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates and ships a transfer in one transaction and rolls back on insufficient stock', async () => {
    const manager = {
      count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
      find: jest.fn().mockResolvedValue([{ id: 'wh-1', status: 'active' }, { id: 'wh-2', status: 'active' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'balance-1', warehouseId: 'wh-1', productId: 'product-1', variantKey: 'BASE', onHand: 0, reserved: 0, inTransit: 0 }),
      create: jest.fn((_entity, value) => value.transferId ? value : ({ id: 'transfer-1', ...value })),
      save: jest.fn(value => Promise.resolve(value)),
    };
    dataSource.transaction.mockImplementation(async callback => callback(manager));
    await expect(service.createTransfer({ sourceWarehouseId: 'wh-1', destinationWarehouseId: 'wh-2', lines: [{ productId: 'product-1', variantKey: 'BASE', quantity: 1 }] }, user)).rejects.toThrow('可用库存不足');
    expect(manager.create).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ status: 'shipped', shippedAt: expect.any(Date) }));
  });

  it('only deletes cancelled inventory documents with their lines', async () => {
    counts.findOne.mockResolvedValue({ id: 'count-1', siteId: 'site-1', status: 'cancelled' });
    transfers.findOne = jest.fn().mockResolvedValue({ id: 'transfer-1', siteId: 'site-1', status: 'cancelled' });
    const manager = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    dataSource.transaction.mockImplementation(async callback => callback(manager));
    await service.removeCount('count-1', user);
    await service.removeTransfer('transfer-1', user);
    expect(manager.delete).toHaveBeenCalledTimes(4);
  });

});
