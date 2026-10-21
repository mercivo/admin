import { Customer } from "../customer/customer.entity";
import { InventoryBalance, Warehouse } from "../inventory/inventory.entity";
import { Product } from "../product/product.entity";
import { SalesOrder, SalesOrderLine } from "./sales.entity";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
  const authUser = { tenantId: "tenant-1", siteId: "site-1", userId: "user-1" } as never;

  it("persists sales order lines in the user's input order", async () => {
    const balances = new Map([
      ["product-1", { onHand: 10, reserved: 0 }],
      ["product-2", { onHand: 10, reserved: 0 }],
    ]);
    const createdLines: Array<Record<string, unknown>> = [];
    const manager = {
      findOne: jest.fn(async (entity, options) => {
        if (entity === Customer) return { id: "customer-1", name: "客户", status: "active" };
        if (entity === Warehouse) return { id: "warehouse-1", status: "active" };
        if (entity === InventoryBalance) return balances.get(options.where.productId);
        return null;
      }),
      find: jest.fn(async (entity) => entity === Product ? [
        { id: "product-1", nameZh: "商品一", sku: "SKU-1", variants: [] },
        { id: "product-2", nameZh: "商品二", sku: "SKU-2", variants: [] },
      ] : []),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((entity, value) => {
        if (entity === SalesOrder) return { ...value, id: "order-1" };
        if (entity === SalesOrderLine) {
          const line = { ...value, id: `line-${createdLines.length + 1}` };
          createdLines.push(line);
          return line;
        }
        return value;
      }),
      save: jest.fn(async (value) => value),
    };
    const service = new SalesService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );

    await (service as any).saveOrder(manager, null, {
      customerId: "customer-1",
      warehouseId: "warehouse-1",
      currency: "CNY",
      lines: [
        { productId: "product-2", variantKey: "BASE", quantity: 1, unitPrice: 20 },
        { productId: "product-1", variantKey: "BASE", quantity: 2, unitPrice: 10 },
      ],
    }, authUser);

    expect(createdLines).toMatchObject([
      { productId: "product-2", sortOrder: 0 },
      { productId: "product-1", sortOrder: 1 },
    ]);
  });

  it("rejects sales orders for a warehouse locked by stock counting", async () => {
    const manager = {
      findOne: jest.fn(async (entity) => {
        if (entity === Customer) return { id: "customer-1", status: "active" };
        if (entity === Warehouse)
          return { id: "warehouse-1", status: "active" };
        return null;
      }),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    };
    const service = new SalesService(
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
        null,
        {
          customerId: "customer-1",
          warehouseId: "warehouse-1",
          currency: "CNY",
          lines: [
            {
              productId: "product-1",
              variantKey: "BASE",
              quantity: 1,
              unitPrice: 10,
            },
          ],
        },
        { tenantId: "tenant-1", siteId: "site-1", userId: "user-1" },
      ),
    ).rejects.toThrow("该仓库正在盘点，暂不可创建销售订单");
  });

  it("reopens a cancelled sales order when it has no shipment or finance history", async () => {
    const order = { id: "order-1", orderNo: "SO001", status: "cancelled" };
    const manager = {
      findOne: jest.fn().mockResolvedValue(order),
      exists: jest.fn().mockResolvedValue(false),
    };
    const service = new SalesService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
    );
    const saveOrder = jest.spyOn(service as any, "saveOrder").mockResolvedValue("order-1");
    jest.spyOn(service as any, "getOrder").mockResolvedValue({ ...order, status: "confirmed" });
    const dto = { customerId: "customer-1", warehouseId: "warehouse-1", lines: [] } as never;

    await expect(service.updateOrder("order-1", dto, authUser)).resolves.toMatchObject({ status: "confirmed" });
    expect(saveOrder).toHaveBeenCalledWith(manager, order, dto, authUser);
  });

  it.each([
    ["出库", [true]],
    ["财务", [false, true]],
  ])("rejects reopening a sales order with %s history", async (_label, existsResults) => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: "order-1", status: "cancelled" }),
      exists: jest.fn().mockImplementation(() => Promise.resolve(existsResults.shift() ?? false)),
    };
    const service = new SalesService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
    );

    await expect(service.updateOrder("order-1", {} as never, authUser)).rejects.toThrow("不可重新编辑");
  });
});
