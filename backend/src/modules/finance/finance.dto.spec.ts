import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CancelFinanceTransactionDto, CreateFinanceTransactionDto } from "./finance.dto";

describe("finance DTO validation", () => {
  it("accepts a valid order-linked transaction", async () => {
    const dto = plainToInstance(CreateFinanceTransactionDto, {
      orderId: "order-1",
      amount: 1288.5,
      paymentMethod: "bank_transfer",
      accountName: "基本户",
      referenceNo: "BANK-001",
      transactionDate: "2026-10-13",
      remark: "首款",
    });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([0, -1, 1.001])("rejects an invalid transaction amount: %s", async (amount) => {
    const dto = plainToInstance(CreateFinanceTransactionDto, {
      orderId: "order-1",
      amount,
      paymentMethod: "cash",
      transactionDate: "2026-10-13",
    });
    await expect(validate(dto)).resolves.not.toEqual([]);
  });

  it("rejects unsupported payment methods", async () => {
    const dto = plainToInstance(CreateFinanceTransactionDto, {
      orderId: "order-1",
      amount: 100,
      paymentMethod: "credit_card",
      transactionDate: "2026-10-13",
    });
    await expect(validate(dto)).resolves.not.toEqual([]);
  });

  it("requires a non-empty void reason", async () => {
    const dto = plainToInstance(CancelFinanceTransactionDto, { reason: "" });
    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
