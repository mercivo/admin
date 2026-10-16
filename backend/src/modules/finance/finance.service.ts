import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { pageLimit, pageOffset, pageResult } from "../../common/dto/page-query.dto";
import { AuthUser } from "../../common/types/auth-user";
import { Customer } from "../customer/customer.entity";
import { PurchaseOrder, PurchaseOrderLine, Supplier } from "../purchase/purchase.entity";
import { SalesOrder, SalesOrderLine } from "../sales/sales.entity";
import { Warehouse } from "../inventory/inventory.entity";
import { CreateFinanceTransactionDto } from "./finance.dto";
import { FinanceQueryDto, FinanceStatisticsQueryDto } from "./finance-query.dto";
import { FinanceTransaction, FinanceTransactionType } from "./finance.entity";

const money = (value: number) => Math.round(Number(value) * 100) / 100;
const makeNo = (type: FinanceTransactionType) =>
  `${type === "receipt" ? "SK" : "FK"}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${Math.random().toString().slice(2, 6)}`;

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly transactions: Repository<FinanceTransaction>,
    @InjectRepository(SalesOrder) private readonly salesOrders: Repository<SalesOrder>,
    @InjectRepository(PurchaseOrder) private readonly purchaseOrders: Repository<PurchaseOrder>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    private readonly dataSource: DataSource,
  ) {}

  async list(type: FinanceTransactionType, user: AuthUser, query: FinanceQueryDto) {
    const builder = this.transactions
      .createQueryBuilder("transaction")
      .where("transaction.site_id = :siteId", { siteId: user.siteId })
      .andWhere("transaction.type = :type", { type });
    if (query.status) builder.andWhere("transaction.status = :status", { status: query.status });
    if (query.partnerId) builder.andWhere("transaction.partner_id = :partnerId", { partnerId: query.partnerId });
    if (query.startDate) builder.andWhere("transaction.transaction_date >= :startDate", { startDate: query.startDate });
    if (query.endDate) builder.andWhere("transaction.transaction_date <= :endDate", { endDate: query.endDate });
    if (query.keyword?.trim()) {
      builder.andWhere(
        "(transaction.transaction_no LIKE :keyword OR transaction.partner_name LIKE :keyword OR transaction.reference_no LIKE :keyword)",
        { keyword: `%${query.keyword.trim()}%` },
      );
    }
    const [items, total] = await builder
      .clone()
      .orderBy("transaction.transactionDate", "DESC")
      .addOrderBy("transaction.createdAt", "DESC")
      .skip(pageOffset(query))
      .take(pageLimit(query))
      .getManyAndCount();
    const aggregate = await builder
      .clone()
      .select("COALESCE(SUM(CASE WHEN transaction.status = 'confirmed' THEN transaction.amount ELSE 0 END), 0)", "confirmedAmount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.status = 'pending' THEN transaction.amount ELSE 0 END), 0)", "pendingAmount")
      .addSelect("COUNT(transaction.id)", "totalCount")
      .getRawOne();
    return {
      ...pageResult(await this.attachOrderNos(items, type), total, query),
      summary: {
        confirmedAmount: Number(aggregate?.confirmedAmount || 0),
        pendingAmount: Number(aggregate?.pendingAmount || 0),
        totalCount: Number(aggregate?.totalCount || 0),
      },
    };
  }

  async create(type: FinanceTransactionType, dto: CreateFinanceTransactionDto, user: AuthUser) {
    let id = "";
    await this.dataSource.transaction(async (manager) => {
      const orderEntity = type === "receipt" ? SalesOrder : PurchaseOrder;
      const order = await manager.findOne(orderEntity, {
        where: { id: dto.orderId, siteId: user.siteId } as never,
        lock: { mode: "pessimistic_write" },
      }) as SalesOrder | PurchaseOrder | null;
      if (!order) throw new NotFoundException(type === "receipt" ? "销售订单不存在" : "采购订单不存在");
      if (order.status === "cancelled") throw new BadRequestException("已取消订单不可登记资金流水");
      if (type === "payment" && order.status === "draft") throw new BadRequestException("草稿采购订单不可付款");
      const paidRaw = await manager
        .createQueryBuilder(FinanceTransaction, "transaction")
        .select("COALESCE(SUM(transaction.amount), 0)", "amount")
        .where("transaction.site_id = :siteId", { siteId: user.siteId })
        .andWhere("transaction.type = :type", { type })
        .andWhere("transaction.order_id = :orderId", { orderId: order.id })
        .andWhere("transaction.status IN ('pending', 'confirmed')")
        .getRawOne();
      const remaining = money(Number(order.totalAmount) - Number(paidRaw?.amount || 0));
      if (remaining <= 0) throw new BadRequestException(type === "receipt" ? "该订单已全部收款" : "该订单已全部付款");
      if (money(dto.amount) > remaining) throw new BadRequestException(`本次金额不能超过待${type === "receipt" ? "收" : "付"}金额 ${remaining.toFixed(2)}`);
      const partner = type === "receipt"
        ? await manager.findOne(Customer, { where: { id: (order as SalesOrder).customerId, siteId: user.siteId } })
        : await manager.findOne(Supplier, { where: { id: (order as PurchaseOrder).supplierId, siteId: user.siteId } });
      if (!partner) throw new BadRequestException(type === "receipt" ? "订单客户不存在" : "订单供应商不存在");
      const saved = await manager.save(manager.create(FinanceTransaction, {
        tenantId: user.tenantId,
        siteId: user.siteId,
        transactionNo: makeNo(type),
        type,
        orderId: order.id,
        partnerId: partner.id,
        partnerName: partner.name,
        currency: order.currency,
        amount: money(dto.amount),
        paymentMethod: dto.paymentMethod,
        accountName: dto.accountName?.trim() || "",
        referenceNo: dto.referenceNo?.trim() || "",
        transactionDate: dto.transactionDate,
        status: "pending",
        remark: dto.remark?.trim() || "",
        cancelReason: "",
        createdBy: user.userId,
        cancelledBy: null,
        cancelledAt: null,
      }));
      id = saved.id;
    });
    const item = await this.transactions.findOne({ where: { id, siteId: user.siteId, type } });
    return (await this.attachOrderNos(item ? [item] : [], type))[0];
  }

  async confirm(type: FinanceTransactionType, id: string, user: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(FinanceTransaction, {
        where: { id, siteId: user.siteId, type },
        lock: { mode: "pessimistic_write" },
      });
      if (!transaction) throw new NotFoundException(type === "receipt" ? "收款单不存在" : "付款单不存在");
      if (transaction.status !== "pending") throw new BadRequestException("仅待确认资金流水可以确认");
      const orderEntity = type === "receipt" ? SalesOrder : PurchaseOrder;
      const order = await manager.findOne(orderEntity, {
        where: { id: transaction.orderId, siteId: user.siteId } as never,
        lock: { mode: "pessimistic_write" },
      }) as SalesOrder | PurchaseOrder | null;
      if (!order || order.status === "cancelled" || (type === "payment" && order.status === "draft"))
        throw new BadRequestException("关联订单当前不可确认资金流水");
      const confirmed = await manager.createQueryBuilder(FinanceTransaction, "transaction")
        .select("COALESCE(SUM(transaction.amount), 0)", "amount")
        .where("transaction.site_id = :siteId", { siteId: user.siteId })
        .andWhere("transaction.type = :type", { type })
        .andWhere("transaction.order_id = :orderId", { orderId: transaction.orderId })
        .andWhere("transaction.status = 'confirmed'")
        .getRawOne();
      if (money(Number(confirmed?.amount || 0) + Number(transaction.amount)) > money(Number(order.totalAmount)))
        throw new BadRequestException(`确认金额超过订单待${type === "receipt" ? "收" : "付"}金额`);
      transaction.status = "confirmed";
      await manager.save(transaction);
    });
    const item = await this.transactions.findOne({ where: { id, siteId: user.siteId, type } });
    return (await this.attachOrderNos(item ? [item] : [], type))[0];
  }

  async cancel(type: FinanceTransactionType, id: string, reason: string, user: AuthUser) {
    const transaction = await this.transactions.findOne({ where: { id, siteId: user.siteId, type } });
    if (!transaction) throw new NotFoundException(type === "receipt" ? "收款单不存在" : "付款单不存在");
    if (transaction.status !== "pending") throw new BadRequestException("仅待确认资金流水可以取消");
    transaction.status = "cancelled";
    transaction.cancelReason = reason.trim();
    transaction.cancelledBy = user.userId;
    transaction.cancelledAt = new Date();
    await this.transactions.save(transaction);
    return (await this.attachOrderNos([transaction], type))[0];
  }

  async orderOptions(type: FinanceTransactionType, user: AuthUser) {
    const orderRepo = type === "receipt" ? this.salesOrders : this.purchaseOrders;
    const alias = "orders";
    const partnerEntity = type === "receipt" ? Customer : Supplier;
    const partnerIdColumn = type === "receipt" ? "customer_id" : "supplier_id";
    const optionsBuilder = orderRepo
      .createQueryBuilder(alias)
      .leftJoin(partnerEntity, "partner", `partner.id = ${alias}.${partnerIdColumn}`)
      .leftJoin(Warehouse, "warehouse", `warehouse.id = ${alias}.warehouse_id`)
      .leftJoin(
        FinanceTransaction,
        "transaction",
        `transaction.order_id = ${alias}.id AND transaction.type = :type AND transaction.status IN ('pending', 'confirmed')`,
        { type },
      )
      .where(`${alias}.site_id = :siteId`, { siteId: user.siteId })
      .andWhere(`${alias}.status <> 'cancelled'`)
      .andWhere(type === "receipt" ? "1 = 1" : `${alias}.status <> 'draft'`)
      .select(`${alias}.id`, "id")
      .addSelect(`${alias}.order_no`, "orderNo")
      .addSelect("partner.name", "partnerName")
      .addSelect(`${alias}.currency`, "currency")
      .addSelect(`${alias}.status`, "status")
      .addSelect(`${alias}.created_at`, "orderDate")
      .addSelect(type === "receipt" ? `${alias}.delivery_date` : `${alias}.expected_date`, "fulfillmentDate")
      .addSelect("warehouse.name", "warehouseName")
      .addSelect(type === "receipt" ? `${alias}.discount` : "0", "discountAmount")
      .addSelect(type === "payment" ? `${alias}.tax_amount` : "0", "taxAmount")
      .addSelect(`${alias}.amount`, "orderAmount")
      .addSelect(`${alias}.total_amount`, "totalAmount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.status = 'confirmed' THEN transaction.amount ELSE 0 END), 0)", "settledAmount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.status = 'pending' THEN transaction.amount ELSE 0 END), 0)", "pendingAmount")
      .groupBy(`${alias}.id`)
      .addGroupBy(`${alias}.order_no`)
      .addGroupBy("partner.name")
      .addGroupBy(`${alias}.currency`)
      .addGroupBy(`${alias}.status`)
      .addGroupBy(`${alias}.created_at`)
      .addGroupBy(type === "receipt" ? `${alias}.delivery_date` : `${alias}.expected_date`)
      .addGroupBy("warehouse.name")
      .addGroupBy(`${alias}.amount`)
      .addGroupBy(`${alias}.total_amount`)
      .having(`${alias}.total_amount > COALESCE(SUM(transaction.amount), 0)`)
      .orderBy(`${alias}.created_at`, "DESC");
    if (type === "receipt") optionsBuilder.addGroupBy(`${alias}.discount`);
    if (type === "payment") optionsBuilder.addGroupBy(`${alias}.tax_amount`);
    const rows = await optionsBuilder.getRawMany();
    const orderIds = rows.map((row) => String(row.id));
    const lineEntity = type === "receipt" ? SalesOrderLine : PurchaseOrderLine;
    const lines = orderIds.length
      ? await this.dataSource.getRepository(lineEntity).find({
          where: { orderId: In(orderIds) },
          order: { id: "ASC" },
        } as never)
      : [];
    const linesByOrder = new Map<string, Array<SalesOrderLine | PurchaseOrderLine>>();
    for (const line of lines as Array<SalesOrderLine | PurchaseOrderLine>) {
      const items = linesByOrder.get(line.orderId) || [];
      items.push(line);
      linesByOrder.set(line.orderId, items);
    }
    return rows.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      partnerName: row.partnerName,
      currency: row.currency,
      status: row.status,
      orderDate: row.orderDate,
      fulfillmentDate: row.fulfillmentDate,
      warehouseName: row.warehouseName || "",
      discountAmount: Number(row.discountAmount || 0),
      taxAmount: Number(row.taxAmount || 0),
      orderAmount: Number(row.orderAmount || 0),
      totalAmount: Number(row.totalAmount),
      settledAmount: Number(row.settledAmount),
      pendingAmount: Number(row.pendingAmount),
      remainingAmount: money(Number(row.totalAmount) - Number(row.settledAmount) - Number(row.pendingAmount)),
      items: (linesByOrder.get(String(row.id)) || []).map((line) => ({
        id: line.id,
        productName: line.productName,
        productSku: line.productSku,
        variantLabel: line.variantLabel,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        amount: Number(line.amount),
      })),
    }));
  }

  async statistics(user: AuthUser, query: FinanceStatisticsQueryDto) {
    const year = query.year || new Date().getFullYear();
    const currency = (query.currency || 'CNY').toUpperCase();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const [salesRows, purchaseRows, receiptRows, paymentRows] = await Promise.all([
      this.monthlyOrderTotals("sales", user.siteId, startDate, endDate, currency),
      this.monthlyOrderTotals("purchase", user.siteId, startDate, endDate, currency),
      this.monthlyTransactionTotals("receipt", user.siteId, startDate, endDate, currency),
      this.monthlyTransactionTotals("payment", user.siteId, startDate, endDate, currency),
    ]);
    const salesMap = new Map(salesRows.map(row => [Number(row.month), Number(row.amount)]));
    const purchaseMap = new Map(purchaseRows.map(row => [Number(row.month), Number(row.amount)]));
    const receiptMap = new Map(receiptRows.map(row => [Number(row.month), Number(row.amount)]));
    const paymentMap = new Map(paymentRows.map(row => [Number(row.month), Number(row.amount)]));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const salesAmount = money(salesMap.get(month) || 0);
      const purchaseAmount = money(purchaseMap.get(month) || 0);
      return {
        month,
        monthLabel: `${month}月`,
        salesAmount,
        purchaseAmount,
        receiptAmount: money(receiptMap.get(month) || 0),
        paymentAmount: money(paymentMap.get(month) || 0),
      };
    });
    const salesAmount = money(monthly.reduce((sum, row) => sum + row.salesAmount, 0));
    const purchaseAmount = money(monthly.reduce((sum, row) => sum + row.purchaseAmount, 0));
    const receiptAmount = money(monthly.reduce((sum, row) => sum + row.receiptAmount, 0));
    const paymentAmount = money(monthly.reduce((sum, row) => sum + row.paymentAmount, 0));
    return {
      year,
      currency,
      summary: {
        salesAmount,
        purchaseAmount,
        receiptAmount,
        paymentAmount,
      },
      monthly,
    };
  }

  private async monthlyOrderTotals(type: "sales" | "purchase", siteId: string, startDate: string, endDate: string, currency: string) {
    const repo = type === "sales" ? this.salesOrders : this.purchaseOrders;
    const builder = repo.createQueryBuilder("orders")
      .select("MONTH(orders.created_at)", "month")
      .addSelect("COALESCE(SUM(orders.total_amount), 0)", "amount")
      .where("orders.site_id = :siteId", { siteId })
      .andWhere("orders.currency = :currency", { currency })
      .andWhere("orders.status <> 'cancelled'")
      .andWhere("orders.created_at BETWEEN :startDate AND :endDate", { startDate: `${startDate} 00:00:00`, endDate: `${endDate} 23:59:59` })
      .groupBy("MONTH(orders.created_at)")
      .orderBy("MONTH(orders.created_at)", "ASC");
    if (type === "purchase") builder.andWhere("orders.status <> 'draft'");
    return builder.getRawMany();
  }

  private monthlyTransactionTotals(type: FinanceTransactionType, siteId: string, startDate: string, endDate: string, currency: string) {
    return this.transactions.createQueryBuilder('transaction')
      .select('MONTH(transaction.transaction_date)', 'month')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'amount')
      .where('transaction.site_id = :siteId', { siteId })
      .andWhere('transaction.type = :type', { type })
      .andWhere("transaction.status = 'confirmed'")
      .andWhere('transaction.currency = :currency', { currency })
      .andWhere('transaction.transaction_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('MONTH(transaction.transaction_date)')
      .getRawMany();
  }

  private async attachOrderNos(items: FinanceTransaction[], type: FinanceTransactionType) {
    if (!items.length) return [];
    const repo = type === "receipt" ? this.salesOrders : this.purchaseOrders;
    const orderIds = [...new Set(items.map((item) => item.orderId))];
    const orders = await repo.createQueryBuilder("orders")
      .where("orders.id IN (:...ids)", { ids: orderIds })
      .getMany();
    const lineEntity = type === "receipt" ? SalesOrderLine : PurchaseOrderLine;
    const [lines, warehouses] = await Promise.all([
      this.dataSource.getRepository(lineEntity).find({ where: { orderId: In(orderIds) }, order: { id: "ASC" } } as never),
      this.dataSource.getRepository(Warehouse).find({
        where: { id: In([...new Set(orders.map((order) => order.warehouseId))]) },
      }),
    ]);
    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
    const linesByOrder = new Map<string, Array<SalesOrderLine | PurchaseOrderLine>>();
    for (const line of lines as Array<SalesOrderLine | PurchaseOrderLine>) {
      const orderLines = linesByOrder.get(line.orderId) || [];
      orderLines.push(line);
      linesByOrder.set(line.orderId, orderLines);
    }
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    return items.map((item) => ({
      ...item,
      status: String(item.status) === "voided" ? "cancelled" : item.status,
      amount: Number(item.amount),
      orderNo: orderMap.get(item.orderId)?.orderNo || "",
      orderDetail: orderMap.has(item.orderId) ? (() => {
        const order = orderMap.get(item.orderId)!;
        return {
          id: order.id,
          orderNo: order.orderNo,
          partnerName: item.partnerName,
          currency: order.currency,
          status: order.status,
          orderDate: order.createdAt,
          fulfillmentDate: type === "receipt" ? (order as SalesOrder).deliveryDate : (order as PurchaseOrder).expectedDate,
          warehouseName: warehouseMap.get(order.warehouseId) || "",
          discountAmount: type === "receipt" ? Number((order as SalesOrder).discount || 0) : 0,
          taxAmount: type === "payment" ? Number((order as PurchaseOrder).taxAmount || 0) : 0,
          orderAmount: Number(order.amount),
          totalAmount: Number(order.totalAmount),
          items: (linesByOrder.get(order.id) || []).map((line) => ({
            id: line.id,
            productName: line.productName,
            productSku: line.productSku,
            variantLabel: line.variantLabel,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            amount: Number(line.amount),
          })),
        };
      })() : null,
    }));
  }
}
