import { Customer } from "../customer/customer.entity";
import { Warehouse } from "../inventory/inventory.entity";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
  const authUser = { tenantId: "tenant-1", siteId: "site-1", userId: "user-1" } as never;

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
