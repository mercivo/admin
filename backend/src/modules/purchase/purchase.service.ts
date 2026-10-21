import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import {
  pageLimit,
  pageOffset,
  pageResult,
} from "../../common/dto/page-query.dto";
import { AuthUser } from "../../common/types/auth-user";
import {
  InventoryBalance,
  InventoryLedgerEntry,
  StockCount,
  Warehouse,
} from "../inventory/inventory.entity";
import { Product } from "../product/product.entity";
import { AppConfig } from "../workspace/app-config.entity";
import {
  CreatePurchaseReceiptDto,
  PurchaseOrderDto,
  SupplierDto,
} from "./purchase.dto";
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseReceipt,
  PurchaseReceiptLine,
  Supplier,
} from "./purchase.entity";
import { PurchaseQueryDto } from "./purchase-query.dto";
import { FinanceTransaction } from "../finance/finance.entity";

const BASE_VARIANT = "BASE";
const makeNo = (prefix: string) =>
  `${prefix}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${Math.random().toString().slice(2, 6)}`;
const money = (value: number) => Math.round(Number(value) * 100) / 100;

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliers: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly orders: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly orderLines: Repository<PurchaseOrderLine>,
    @InjectRepository(PurchaseReceipt)
    private readonly receipts: Repository<PurchaseReceipt>,
    @InjectRepository(PurchaseReceiptLine)
    private readonly receiptLines: Repository<PurchaseReceiptLine>,
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(AppConfig)
    private readonly configs: Repository<AppConfig>,
    private readonly dataSource: DataSource,
  ) {}

  async listSuppliers(user: AuthUser, query: PurchaseQueryDto) {
    const builder = this.suppliers
      .createQueryBuilder("supplier")
      .where("supplier.site_id = :siteId", { siteId: user.siteId });
    if (query.status)
      builder.andWhere("supplier.status = :status", { status: query.status });
    if (query.keyword?.trim())
      builder.andWhere(
        "(supplier.name LIKE :keyword OR supplier.contact LIKE :keyword OR supplier.phone LIKE :keyword)",
        { keyword: `%${query.keyword.trim()}%` },
      );
    const [items, total] = await builder
      .orderBy("supplier.createdAt", "DESC")
      .skip(pageOffset(query))
      .take(pageLimit(query))
      .getManyAndCount();
    return pageResult(items, total, query);
  }
  supplierOptions(user: AuthUser) {
    return this.suppliers.find({
      where: { siteId: user.siteId, status: "active" },
      order: { name: "ASC" },
    });
  }
  async createSupplier(dto: SupplierDto, user: AuthUser) {
    const code = await this.generateSupplierCode(user.siteId);
    return this.suppliers.save(
      this.suppliers.create({
        ...this.supplierValues(dto),
        code,
        tenantId: user.tenantId,
        siteId: user.siteId,
      }),
    );
  }
  async updateSupplier(id: string, dto: SupplierDto, user: AuthUser) {
    const supplier = await this.requireSupplier(id, user.siteId);
    Object.assign(supplier, this.supplierValues(dto));
    return this.suppliers.save(supplier);
  }
  async removeSupplier(id: string, user: AuthUser) {
    const supplier = await this.requireSupplier(id, user.siteId);
    if (
      await this.orders.exist({
        where: { supplierId: id, siteId: user.siteId },
      })
    )
      throw new BadRequestException("供应商已有采购订单，不可删除，可将其停用");
    await this.suppliers.remove(supplier);
  }

  async listOrders(user: AuthUser, query: PurchaseQueryDto) {
    const builder = this.orders
      .createQueryBuilder("orders")
      .leftJoin(Supplier, "supplier", "supplier.id = orders.supplier_id")
      .where("orders.site_id = :siteId", { siteId: user.siteId });
    if (query.status)
      builder.andWhere("orders.status = :status", { status: query.status });
    if (query.supplierId)
      builder.andWhere("orders.supplier_id = :supplierId", {
        supplierId: query.supplierId,
      });
    if (query.keyword?.trim())
      builder.andWhere(
        "(orders.order_no LIKE :keyword OR supplier.name LIKE :keyword)",
        { keyword: `%${query.keyword.trim()}%` },
      );
    const [items, total] = await builder
      .clone()
      .orderBy("orders.createdAt", "DESC")
      .skip(pageOffset(query))
      .take(pageLimit(query))
      .getManyAndCount();
    const aggregate = await builder
      .clone()
      .select("COALESCE(SUM(orders.total_amount), 0)", "amount")
      .addSelect(
        "SUM(CASE WHEN orders.status IN ('confirmed','partially_received') THEN 1 ELSE 0 END)",
        "pendingReceipt",
      )
      .getRawOne();
    return {
      ...pageResult(await this.attachOrders(items, user.siteId), total, query),
      summary: {
        amount: Number(aggregate?.amount || 0),
        pendingReceipt: Number(aggregate?.pendingReceipt || 0),
      },
    };
  }
  async createOrder(dto: PurchaseOrderDto, user: AuthUser) {
    let id = "";
    await this.dataSource.transaction(async (manager) => {
      id = await this.saveOrder(manager, dto, user);
    });
    return this.getOrder(id, user);
  }
  async updateOrder(id: string, dto: PurchaseOrderDto, user: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(PurchaseOrder, {
        where: { id, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("采购订单不存在");
      if (order.status !== "cancelled")
        throw new BadRequestException("仅已取消采购订单可以重新编辑");
      if (
        await manager.exists(PurchaseReceipt, {
          where: { orderId: id, siteId: user.siteId },
        })
      )
        throw new BadRequestException("订单已有入库记录，不可重新编辑");
      if (
        await manager.exists(FinanceTransaction, {
          where: { orderId: id, siteId: user.siteId },
        })
      )
        throw new BadRequestException("订单已有财务流水，不可重新编辑");
      await this.saveOrder(manager, dto, user, order);
    });
    return this.getOrder(id, user);
  }
  async confirmOrder(id: string, user: AuthUser) {
    await this.requireOrder(id, user.siteId);
    throw new BadRequestException("采购订单创建时已自动确认并计入在途库存");
  }
  async cancelOrder(id: string, user: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(PurchaseOrder, {
        where: { id, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("采购订单不存在");
      if (!["draft", "confirmed", "partially_received"].includes(order.status))
        throw new BadRequestException("当前采购订单不可取消");
      if (await manager.createQueryBuilder(FinanceTransaction, "transaction").where("transaction.site_id = :siteId", { siteId: user.siteId }).andWhere("transaction.order_id = :orderId", { orderId: id }).andWhere("transaction.type = 'payment'").andWhere("transaction.status IN ('pending', 'confirmed')").getExists())
        throw new BadRequestException("订单已有待确认或已确认付款，请先处理付款单");
      const lines = await manager.find(PurchaseOrderLine, {
        where: { orderId: id },
      });
      if (order.status !== "draft")
        for (const line of lines) {
          const balance = await manager.findOne(InventoryBalance, {
            where: {
              siteId: user.siteId,
              warehouseId: order.warehouseId,
              productId: line.productId,
              variantKey: line.variantKey,
            },
            lock: { mode: "pessimistic_write" },
          });
          if (balance) {
            balance.inTransit = Math.max(
              0,
              balance.inTransit - (line.quantity - line.receivedQuantity),
            );
            await manager.save(balance);
          }
        }
      order.status = "cancelled";
      await manager.save(order);
    });
    return this.getOrder(id, user);
  }
  async removeOrder(id: string, user: AuthUser) {
    const order = await this.requireOrder(id, user.siteId);
    if (order.status !== "cancelled")
      throw new BadRequestException("仅已取消采购订单可以删除");
    if (await this.dataSource.getRepository(FinanceTransaction).exist({ where: { siteId: user.siteId, orderId: id } }))
      throw new BadRequestException("订单已有财务流水，为保留审计记录不可删除");
    if (
      await this.receipts.exist({ where: { orderId: id, siteId: user.siteId } })
    )
      throw new BadRequestException("订单已有入库记录，不可删除");
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PurchaseOrderLine, { orderId: id });
      await manager.delete(PurchaseOrder, { id });
    });
  }

  async listReceipts(user: AuthUser, query: PurchaseQueryDto) {
    const builder = this.receipts
      .createQueryBuilder("receipt")
      .leftJoin(PurchaseOrder, "orders", "orders.id = receipt.order_id")
      .leftJoin(Supplier, "supplier", "supplier.id = orders.supplier_id")
      .where("receipt.site_id = :siteId", { siteId: user.siteId });
    if (query.warehouseId)
      builder.andWhere("receipt.warehouse_id = :warehouseId", {
        warehouseId: query.warehouseId,
      });
    if (query.keyword?.trim())
      builder.andWhere(
        "(receipt.receipt_no LIKE :keyword OR orders.order_no LIKE :keyword OR supplier.name LIKE :keyword)",
        { keyword: `%${query.keyword.trim()}%` },
      );
    const [items, total] = await builder
      .clone()
      .orderBy("receipt.createdAt", "DESC")
      .skip(pageOffset(query))
      .take(pageLimit(query))
      .getManyAndCount();
    return pageResult(
      await this.attachReceipts(items, user.siteId),
      total,
      query,
    );
  }
  async createReceipt(dto: CreatePurchaseReceiptDto, user: AuthUser) {
    let id = "";
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(PurchaseOrder, {
        where: { id: dto.orderId, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("采购订单不存在");
      if (!["confirmed", "partially_received"].includes(order.status))
        throw new BadRequestException("仅已确认或部分入库订单可以入库");
      const lines = await manager.find(PurchaseOrderLine, {
        where: { orderId: order.id },
        lock: { mode: "pessimistic_write" },
      });
      const lineMap = new Map(lines.map((line) => [line.id, line]));
      if (
        !dto.lines.length ||
        new Set(dto.lines.map((line) => line.orderLineId)).size !==
          dto.lines.length
      )
        throw new BadRequestException("入库明细无效或重复");
      const receipt = await manager.save(
        manager.create(PurchaseReceipt, {
          tenantId: user.tenantId,
          siteId: user.siteId,
          receiptNo: makeNo("RK"),
          orderId: order.id,
          warehouseId: order.warehouseId,
          status: "received",
          remark: dto.remark || "",
          createdBy: user.userId,
          receivedAt: new Date(),
        }),
      );
      id = receipt.id;
      for (const input of dto.lines) {
        const line = lineMap.get(input.orderLineId);
        if (!line || input.quantity > line.quantity - line.receivedQuantity)
          throw new BadRequestException("入库数量超过订单待入库数量");
        const balance = await this.findOrCreateBalance(
          manager,
          order,
          line,
          user,
        );
        balance.onHand += input.quantity;
        balance.inTransit = Math.max(0, balance.inTransit - input.quantity);
        line.receivedQuantity += input.quantity;
        await manager.save([balance, line]);
        await manager.save(
          manager.create(PurchaseReceiptLine, {
            receiptId: receipt.id,
            orderLineId: line.id,
            productId: line.productId,
            variantKey: line.variantKey,
            quantity: input.quantity,
          }),
        );
        await manager.save(
          manager.create(InventoryLedgerEntry, {
            tenantId: user.tenantId,
            siteId: user.siteId,
            warehouseId: order.warehouseId,
            productId: line.productId,
            variantKey: line.variantKey,
            type: "purchase_in" as InventoryLedgerEntry["type"],
            quantityChange: input.quantity,
            balanceAfter: balance.onHand,
            referenceType: "purchase_receipt",
            referenceId: receipt.id,
            actorUserId: user.userId,
            remark: `采购入库 ${receipt.receiptNo}`,
          }),
        );
      }
      order.status = lines.every(
        (line) => line.receivedQuantity >= line.quantity,
      )
        ? "completed"
        : "partially_received";
      await manager.save(order);
      await this.syncProducts(
        manager,
        [...new Set(lines.map((line) => line.productId))],
        user.siteId,
      );
    });
    return (
      await this.attachReceipts(
        [await this.receipts.findOneByOrFail({ id })],
        user.siteId,
      )
    )[0];
  }

  private supplierValues(dto: SupplierDto) {
    return {
      name: dto.name.trim(),
      contact: dto.contact?.trim() || "",
      phone: dto.phone?.trim() || "",
      email: dto.email?.trim() || "",
      address: dto.address?.trim() || "",
      status: dto.status || "active",
      remark: dto.remark?.trim() || "",
    };
  }
  private async generateSupplierCode(siteId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = makeNo("SUP");
      if (!(await this.suppliers.exist({ where: { siteId, code } }))) return code;
    }
    throw new BadRequestException("供应商编码生成失败，请重试");
  }
  private async requireSupplier(id: string, siteId: string) {
    const row = await this.suppliers.findOne({ where: { id, siteId } });
    if (!row) throw new NotFoundException("供应商不存在");
    return row;
  }
  private async requireOrder(id: string, siteId: string) {
    const row = await this.orders.findOne({ where: { id, siteId } });
    if (!row) throw new NotFoundException("采购订单不存在");
    return row;
  }
  private async getOrder(id: string, user: AuthUser) {
    return (
      await this.attachOrders(
        [await this.requireOrder(id, user.siteId)],
        user.siteId,
      )
    )[0];
  }

  private async saveOrder(
    manager: EntityManager,
    dto: PurchaseOrderDto,
    user: AuthUser,
    existing: PurchaseOrder | null = null,
  ) {
    const [supplier, warehouse, products] = await Promise.all([
      manager.findOne(Supplier, {
        where: { id: dto.supplierId, siteId: user.siteId },
      }),
      manager.findOne(Warehouse, {
        where: { id: dto.warehouseId, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      }),
      manager.find(Product, {
        where: {
          id: In(dto.lines.map((line) => line.productId)),
          siteId: user.siteId,
        },
      }),
    ]);
    if (!supplier || supplier.status !== "active")
      throw new BadRequestException("供应商不存在或已停用");
    if (!warehouse || warehouse.status !== "active")
      throw new BadRequestException("仓库不存在或已停用");
    if (
      await manager.count(StockCount, {
        where: {
          warehouseId: warehouse.id,
          siteId: user.siteId,
          status: "counting",
        },
      })
    )
      throw new BadRequestException("该仓库正在盘点，暂不可创建采购订单");
    if (!dto.lines.length)
      throw new BadRequestException("请至少添加一条商品明细");
    const config =
      (await this.configs.findOne({
        where: { key: `${user.siteId}:currency` },
      })) ||
      (await this.configs.findOne({ where: { key: `${user.siteId}:sales` } }));
    const configured = ((config?.value as Record<string, unknown> | undefined)
      ?.currencies as
      Array<{ code?: string; enabled?: boolean }> | undefined) || [
      { code: "CNY", enabled: true },
      { code: "USD", enabled: true },
      { code: "EUR", enabled: true },
    ];
    const currency = (dto.currency || "CNY").toUpperCase();
    if (!configured.some((item) => item.enabled && item.code === currency))
      throw new BadRequestException("所选币种未在系统设置中启用");
    const dimensions = new Set<string>();
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const prepared = dto.lines.map((input, sortOrder) => {
      const product = productMap.get(input.productId);
      const variantKey = input.variantKey || BASE_VARIANT;
      if (!product) throw new BadRequestException("订单包含无效商品");
      if (dimensions.has(`${product.id}:${variantKey}`))
        throw new BadRequestException("同一商品规格不可重复");
      dimensions.add(`${product.id}:${variantKey}`);
      const variant = product.variants?.find((item) => item.id === variantKey);
      if (variantKey !== BASE_VARIANT && !variant)
        throw new BadRequestException("商品规格不存在");
      return {
        sortOrder,
        productId: product.id,
        variantKey,
        productName: product.nameZh,
        productSku: product.sku,
        variantLabel: variant
          ? `${variant.specification}: ${variant.option}`
          : "默认规格",
        quantity: input.quantity,
        receivedQuantity: 0,
        unitPrice: money(input.unitPrice),
        amount: money(input.quantity * input.unitPrice),
      };
    });
    const amount = money(prepared.reduce((sum, line) => sum + line.amount, 0));
    const taxAmount = money(dto.taxAmount || 0);
    const shippingFee = money(dto.shippingFee || 0);
    const saved = await manager.save(
      manager.create(PurchaseOrder, {
        ...(existing || {}),
        tenantId: user.tenantId,
        siteId: user.siteId,
        orderNo: existing?.orderNo || makeNo("PO"),
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        currency,
        amount,
        taxAmount,
        shippingFee,
        totalAmount: money(amount + taxAmount + shippingFee),
        status: "confirmed",
        expectedDate: dto.expectedDate || null,
        remark: dto.remark || "",
        createdBy: existing?.createdBy || user.userId,
        confirmedAt: new Date(),
      }),
    );
    if (existing) await manager.delete(PurchaseOrderLine, { orderId: saved.id });
    const savedLines = await manager.save(
      prepared.map((line) =>
        manager.create(PurchaseOrderLine, { ...line, orderId: saved.id }),
      ),
    );
    for (const line of savedLines) {
      const balance = await this.findOrCreateBalance(manager, saved, line, user);
      balance.inTransit += line.quantity;
      await manager.save(balance);
    }
    return saved.id;
  }
  private async findOrCreateBalance(
    manager: EntityManager,
    order: PurchaseOrder,
    line: PurchaseOrderLine,
    user: AuthUser,
  ) {
    let balance = await manager.findOne(InventoryBalance, {
      where: {
        siteId: user.siteId,
        warehouseId: order.warehouseId,
        productId: line.productId,
        variantKey: line.variantKey,
      },
      lock: { mode: "pessimistic_write" },
    });
    if (!balance)
      balance = manager.create(InventoryBalance, {
        tenantId: user.tenantId,
        siteId: user.siteId,
        warehouseId: order.warehouseId,
        productId: line.productId,
        variantKey: line.variantKey,
        onHand: 0,
        reserved: 0,
        inTransit: 0,
        warningStock: 0,
      });
    return balance;
  }
  private async syncProducts(
    manager: EntityManager,
    productIds: string[],
    siteId: string,
  ) {
    for (const productId of productIds) {
      const product = await manager.findOne(Product, {
        where: { id: productId, siteId },
      });
      if (!product) continue;
      const balances = await manager.find(InventoryBalance, {
        where: { productId, siteId },
      });
      product.stock = balances.reduce(
        (sum, balance) => sum + balance.onHand,
        0,
      );
      if (product.variants?.length)
        product.variants = product.variants.map((variant) => ({
          ...variant,
          stock: balances
            .filter((balance) => balance.variantKey === variant.id)
            .reduce((sum, balance) => sum + balance.onHand, 0),
        }));
      await manager.save(product);
    }
  }
  private async attachOrders(rows: PurchaseOrder[], siteId: string) {
    if (!rows.length) return [];
    const [lines, suppliers, warehouses] = await Promise.all([
      this.orderLines.find({
        where: { orderId: In(rows.map((row) => row.id)) },
        order: { sortOrder: "ASC", id: "ASC" },
      }),
      this.suppliers.find({ where: { siteId } }),
      this.warehouses.find({ where: { siteId } }),
    ]);
    const supplierMap = new Map(suppliers.map((row) => [row.id, row]));
    const warehouseMap = new Map(warehouses.map((row) => [row.id, row]));
    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      taxAmount: Number(row.taxAmount),
      shippingFee: Number(row.shippingFee),
      totalAmount: Number(row.totalAmount),
      supplierName: supplierMap.get(row.supplierId)?.name || "-",
      warehouseName: warehouseMap.get(row.warehouseId)?.name || "-",
      lines: lines
        .filter((line) => line.orderId === row.id)
        .map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
          amount: Number(line.amount),
        })),
    }));
  }
  private async attachReceipts(rows: PurchaseReceipt[], siteId: string) {
    if (!rows.length) return [];
    const receiptLines = await this.receiptLines.find({
      where: { receiptId: In(rows.map((row) => row.id)) },
    });
    const orders = await this.orders.find({
      where: { id: In(rows.map((row) => row.orderId)), siteId },
    });
    const orderLines = orders.length
      ? await this.orderLines.find({
          where: { orderId: In(orders.map((row) => row.id)) },
          order: { sortOrder: "ASC", id: "ASC" },
        })
      : [];
    const suppliers = await this.suppliers.find({ where: { siteId } });
    const warehouses = await this.warehouses.find({ where: { siteId } });
    const orderMap = new Map(orders.map((row) => [row.id, row]));
    const orderLineMap = new Map(orderLines.map((row) => [row.id, row]));
    const supplierMap = new Map(suppliers.map((row) => [row.id, row]));
    const warehouseMap = new Map(warehouses.map((row) => [row.id, row]));
    return rows.map((row) => {
      const order = orderMap.get(row.orderId);
      return {
        ...row,
        orderNo: order?.orderNo || "-",
        supplierName: order
          ? supplierMap.get(order.supplierId)?.name || "-"
          : "-",
        warehouseName: warehouseMap.get(row.warehouseId)?.name || "-",
        lines: receiptLines
          .filter((line) => line.receiptId === row.id)
          .sort(
            (left, right) =>
              (orderLineMap.get(left.orderLineId)?.sortOrder ?? 0) -
                (orderLineMap.get(right.orderLineId)?.sortOrder ?? 0) ||
              left.id.localeCompare(right.id),
          )
          .map((line) => ({
            ...line,
            productName: orderLineMap.get(line.orderLineId)?.productName || "-",
            variantLabel:
              orderLineMap.get(line.orderLineId)?.variantLabel || "-",
          })),
      };
    });
  }
}
