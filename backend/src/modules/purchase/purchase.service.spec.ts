import { PurchaseService } from './purchase.service';
import { InventoryBalance, Warehouse } from '../inventory/inventory.entity';
import { Product } from '../product/product.entity';
import { PurchaseOrder, PurchaseOrderLine, Supplier } from './purchase.entity';

describe('PurchaseService', () => {
  const authUser = { tenantId: 'tenant-1', siteId: 'site-1', userId: 'user-1' } as never;

  it('generates an internal supplier code on create', async () => {
    const suppliers = {
      exist: jest.fn().mockResolvedValue(false),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const service = new PurchaseService(
      suppliers as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const created = await service.createSupplier(
      {
        name: '测试供应商',
        contact: '张三',
        phone: '13800000000',
        email: 'supplier@example.com',
        address: '上海市',
        status: 'active',
        remark: '',
      },
      { tenantId: 'tenant-1', siteId: 'site-1', userId: 'user-1' } as never,
    );

    expect(created.code).toMatch(/^SUP\d{18}$/);
    expect(suppliers.exist).toHaveBeenCalledWith({
      where: { siteId: 'site-1', code: created.code },
    });
    expect(created).toMatchObject({
      tenantId: 'tenant-1',
      siteId: 'site-1',
      name: '测试供应商',
    });
  });

  it('creates purchase orders as confirmed and immediately adds in-transit stock', async () => {
    const balance = { inTransit: 2 };
    const createdOrders: Array<Record<string, unknown>> = [];
    const manager = {
      findOne: jest.fn(async (entity) => {
        if (entity === Supplier) return { id: 'supplier-1', status: 'active' };
        if (entity === Warehouse) return { id: 'warehouse-1', status: 'active' };
        if (entity === InventoryBalance) return balance;
        return null;
      }),
      find: jest.fn(async (entity) => entity === Product ? [{ id: 'product-1', nameZh: '商品', sku: 'SKU-1', variants: [] }] : []),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((entity, value) => {
        if (entity === PurchaseOrder) {
          const order = { ...value, id: 'order-1' };
          createdOrders.push(order);
          return order;
        }
        if (entity === PurchaseOrderLine) return { ...value, id: 'line-1' };
        return value;
      }),
      save: jest.fn(async (value) => value),
    };
    const service = new PurchaseService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );

    const id = await (service as any).saveOrder(
      manager,
      {
        supplierId: 'supplier-1',
        warehouseId: 'warehouse-1',
        currency: 'CNY',
        lines: [{ productId: 'product-1', variantKey: 'BASE', quantity: 5, unitPrice: 10 }],
      },
      { tenantId: 'tenant-1', siteId: 'site-1', userId: 'user-1' },
    );

    expect(id).toBe('order-1');
    expect(createdOrders[0]).toMatchObject({ status: 'confirmed', confirmedAt: expect.any(Date) });
    expect(balance.inTransit).toBe(7);
  });

  it('returns purchase order decimal fields as numbers for editable forms', async () => {
    const service = new PurchaseService(
      { find: jest.fn().mockResolvedValue([{ id: 'supplier-1', name: '供应商' }]) } as never,
      {} as never,
      { find: jest.fn().mockResolvedValue([{
        id: 'line-1', orderId: 'order-1', unitPrice: '50.00', amount: '100.00',
      }]) } as never,
      {} as never,
      {} as never,
      { find: jest.fn().mockResolvedValue([{ id: 'warehouse-1', name: '仓库' }]) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const [result] = await (service as any).attachOrders([{
      id: 'order-1', supplierId: 'supplier-1', warehouseId: 'warehouse-1',
      amount: '100.00', taxAmount: '1.00', shippingFee: '2.00', totalAmount: '103.00',
    }], 'site-1');

    expect(result).toMatchObject({ amount: 100, taxAmount: 1, shippingFee: 2, totalAmount: 103 });
    expect(result.lines[0]).toMatchObject({ unitPrice: 50, amount: 100 });
  });

  it('rejects purchase orders for a warehouse locked by stock counting', async () => {
    const manager = {
      findOne: jest.fn(async (entity) => {
        if (entity === Supplier) return { id: 'supplier-1', status: 'active' };
        if (entity === Warehouse) return { id: 'warehouse-1', status: 'active' };
        return null;
      }),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    };
    const service = new PurchaseService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      (service as any).saveOrder(
        manager,
        {
          supplierId: 'supplier-1',
          warehouseId: 'warehouse-1',
          currency: 'CNY',
          lines: [{ productId: 'product-1', variantKey: 'BASE', quantity: 1, unitPrice: 10 }],
        },
        { tenantId: 'tenant-1', siteId: 'site-1', userId: 'user-1' },
      ),
    ).rejects.toThrow('该仓库正在盘点，暂不可创建采购订单');
  });

  it('reopens a cancelled purchase order when it has no receipt or finance history', async () => {
    const order = { id: 'order-1', orderNo: 'PO001', status: 'cancelled' };
    const manager = {
      findOne: jest.fn().mockResolvedValue(order),
      exists: jest.fn().mockResolvedValue(false),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new PurchaseService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, dataSource as never,
    );
    const saveOrder = jest.spyOn(service as any, 'saveOrder').mockResolvedValue('order-1');
    jest.spyOn(service as any, 'getOrder').mockResolvedValue({ ...order, status: 'confirmed' });
    const dto = { supplierId: 'supplier-1', warehouseId: 'warehouse-1', lines: [] } as never;

    await expect(service.updateOrder('order-1', dto, authUser)).resolves.toMatchObject({ status: 'confirmed' });
    expect(saveOrder).toHaveBeenCalledWith(manager, dto, authUser, order);
  });

  it.each([
    ['入库', [true]],
    ['财务', [false, true]],
  ])('rejects reopening a purchase order with %s history', async (_label, existsResults) => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 'order-1', status: 'cancelled' }),
      exists: jest.fn().mockImplementation(() => Promise.resolve(existsResults.shift() ?? false)),
    };
    const service = new PurchaseService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
    );

    await expect(service.updateOrder('order-1', {} as never, authUser)).rejects.toThrow('不可重新编辑');
  });
});
