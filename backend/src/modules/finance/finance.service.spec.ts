import { BadRequestException } from "@nestjs/common";
import { FinanceService } from "./finance.service";

const user = { userId: "user-1", tenantId: "tenant-1", siteId: "site-1", role: "admin" as const, account: "admin", permissions: [] };

const orderBuilder = (rawRows: Array<Record<string, unknown>> = []) => {
  const builder: Record<string, jest.Mock> = {};
  ["select", "addSelect", "where", "andWhere", "groupBy", "addGroupBy", "orderBy", "addOrderBy", "leftJoin", "having", "skip", "take", "limit"].forEach(
    method => builder[method] = jest.fn().mockReturnValue(builder),
  );
  builder.getRawMany = jest.fn().mockResolvedValue(rawRows);
  builder.getMany = jest.fn().mockResolvedValue([{ id: "order-1", orderNo: "SO001" }]);
  builder.clone = jest.fn().mockReturnValue(builder);
  return builder;
};

describe("FinanceService workflow", () => {
  it("returns confirmed amount, pending amount, and total document count", async () => {
    const builder = orderBuilder();
    builder.getManyAndCount = jest.fn().mockResolvedValue([[], 3]);
    builder.getRawOne = jest.fn().mockResolvedValue({ confirmedAmount: 800, pendingAmount: 200, totalCount: 3 });
    const service = new FinanceService(
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.list("receipt", user, { page: 1, pageSize: 10 });

    expect(result.summary).toEqual({ confirmedAmount: 800, pendingAmount: 200, totalCount: 3 });
  });

  it("creates a pending receipt instead of posting it immediately", async () => {
    const savedValues: Record<string, unknown>[] = [];
    const amountBuilder = orderBuilder();
    amountBuilder.getRawOne = jest.fn().mockResolvedValue({ amount: 100 });
    const manager = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ id: "order-1", customerId: "customer-1", currency: "CNY", totalAmount: 1000, status: "confirmed" })
        .mockResolvedValueOnce({ id: "customer-1", name: "测试客户" }),
      createQueryBuilder: jest.fn().mockReturnValue(amountBuilder),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async value => {
        savedValues.push(value);
        return { id: "receipt-1", ...value };
      }),
    };
    const transactions = { findOne: jest.fn().mockResolvedValue({ id: "receipt-1", orderId: "order-1", amount: 200, status: "pending" }) };
    const salesBuilder = orderBuilder();
    salesBuilder.getMany.mockResolvedValue([{
      id: "order-1",
      orderNo: "SO001",
      customerId: "customer-1",
      warehouseId: "warehouse-1",
      currency: "CNY",
      amount: 950,
      totalAmount: 1000,
      discount: 50,
      status: "confirmed",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      deliveryDate: "2026-10-20",
    }]);
    const salesOrders = { createQueryBuilder: jest.fn().mockReturnValue(salesBuilder) };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
      getRepository: jest.fn((entity) => ({
        find: jest.fn().mockResolvedValue(entity.name === "Warehouse"
          ? [{ id: "warehouse-1", name: "成品仓" }]
          : [{ id: "line-1", orderId: "order-1", productName: "测试商品", productSku: "SKU-1", variantLabel: "默认规格", quantity: 2, unitPrice: 500, amount: 1000 }]),
      })),
    };
    const service = new FinanceService(transactions as never, salesOrders as never, {} as never, {} as never, {} as never, dataSource as never);

    const result = await service.create("receipt", { orderId: "order-1", amount: 200, paymentMethod: "bank_transfer", transactionDate: "2026-10-13" }, user);

    expect(savedValues[0]).toEqual(expect.objectContaining({ status: "pending" }));
    expect(result.orderDetail).toEqual(expect.objectContaining({
      orderNo: "SO001",
      warehouseName: "成品仓",
      discountAmount: 50,
      orderAmount: 950,
      items: [expect.objectContaining({ productName: "测试商品", quantity: 2 })],
    }));
  });

  it("only allows a pending transaction to be cancelled", async () => {
    const transactions = {
      findOne: jest.fn().mockResolvedValue({ id: "receipt-1", orderId: "order-1", amount: 200, status: "confirmed" }),
      save: jest.fn(),
    };
    const service = new FinanceService(transactions as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    await expect(service.cancel("receipt", "receipt-1", "录入错误", user)).rejects.toBeInstanceOf(BadRequestException);
    expect(transactions.save).not.toHaveBeenCalled();
  });

  it("returns order and product summaries for transaction selection", async () => {
    const builder = orderBuilder([{
      id: "order-1",
      orderNo: "SO001",
      partnerName: "测试客户",
      currency: "CNY",
      status: "confirmed",
      orderDate: "2026-10-01T08:00:00.000Z",
      fulfillmentDate: "2026-10-20",
      warehouseName: "成品仓",
      discountAmount: "50",
      taxAmount: "0",
      orderAmount: "1250",
      totalAmount: "1200",
      settledAmount: "200",
      pendingAmount: "100",
    }]);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([{
          id: "line-1",
          orderId: "order-1",
          productName: "测试商品",
          productSku: "SKU-001",
          variantLabel: "红色 / L",
          quantity: 2,
          unitPrice: "600",
          amount: "1200",
        }]),
      }),
    };
    const transactionBuilder = orderBuilder([]);
    const service = new FinanceService(
      { createQueryBuilder: jest.fn().mockReturnValue(transactionBuilder) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
    );

    const result = await service.orderOptions("receipt", user);

    expect(result[0]).toEqual(expect.objectContaining({
      orderNo: "SO001",
      partnerName: "测试客户",
      status: "confirmed",
      warehouseName: "成品仓",
      discountAmount: 50,
      taxAmount: 0,
      orderAmount: 1250,
      remainingAmount: 900,
      items: [expect.objectContaining({ productName: "测试商品", productSku: "SKU-001", quantity: 2, amount: 1200 })],
    }));
  });

  it("returns tax and payable amounts for payment order selection", async () => {
    const builder = orderBuilder([{
      id: "purchase-1",
      orderNo: "PO001",
      partnerName: "测试供应商",
      currency: "CNY",
      status: "confirmed",
      orderDate: "2026-10-01T08:00:00.000Z",
      fulfillmentDate: "2026-10-20",
      warehouseName: "原料仓",
      discountAmount: "0",
      taxAmount: "130",
      orderAmount: "1000",
      totalAmount: "1180",
      settledAmount: "0",
      pendingAmount: "0",
    }]);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
    };
    const service = new FinanceService(
      {} as never,
      {} as never,
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as never,
      {} as never,
      {} as never,
      dataSource as never,
    );

    const result = await service.orderOptions("payment", user);

    expect(result[0]).toEqual(expect.objectContaining({
      orderAmount: 1000,
      taxAmount: 130,
      totalAmount: 1180,
      remainingAmount: 1180,
      warehouseName: "原料仓",
    }));
  });

  it("returns twelve monthly profit rows and annual totals", async () => {
    const salesBuilder = orderBuilder([{ month: 1, amount: 1000 }, { month: 2, amount: 500 }]);
    const purchaseBuilder = orderBuilder([{ month: 1, amount: 600 }, { month: 2, amount: 100 }]);
    const financeBuilder = orderBuilder([]);
    const service = new FinanceService(
      { createQueryBuilder: jest.fn().mockReturnValue(financeBuilder) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(salesBuilder) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(purchaseBuilder) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.statistics(user, { year: 2025 });

    expect(result.year).toBe(2025);
    expect(result.summary).toEqual({ salesAmount: 1500, purchaseAmount: 700, receiptAmount: 0, paymentAmount: 0 });
    expect(result.monthly).toHaveLength(12);
    expect(result.monthly[0]).toEqual(expect.objectContaining({ monthLabel: "1月", receiptAmount: 0, paymentAmount: 0 }));
    expect(result.monthly[11]).toEqual(expect.objectContaining({ salesAmount: 0, purchaseAmount: 0, receiptAmount: 0, paymentAmount: 0 }));
  });
});
