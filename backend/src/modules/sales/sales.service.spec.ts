import { Customer } from "../customer/customer.entity";
import { Warehouse } from "../inventory/inventory.entity";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
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
});
