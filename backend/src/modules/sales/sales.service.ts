import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { AuthUser } from "../../common/types/auth-user";
import { Customer } from "../customer/customer.entity";
import {
  InventoryBalance,
  InventoryLedgerEntry,
  StockCount,
  Warehouse,
} from "../inventory/inventory.entity";
import { Product } from "../product/product.entity";
import { CreateShipmentDto, SalesOrderDto } from "./sales.dto";
import {
  SalesOrder,
  SalesOrderLine,
  SalesShipment,
  SalesShipmentLine,
} from "./sales.entity";
import { AppConfig } from "../workspace/app-config.entity";
import {
  pageLimit,
  pageOffset,
  pageResult,
} from "../../common/dto/page-query.dto";
import { SalesQueryDto } from "./sales-query.dto";
import { FinanceTransaction } from "../finance/finance.entity";

const BASE_VARIANT = "BASE";
const makeNo = (prefix: string) =>
  `${prefix}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${Math.random().toString().slice(2, 6)}`;
const money = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly orders: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly orderLines: Repository<SalesOrderLine>,
    @InjectRepository(SalesShipment)
    private readonly shipments: Repository<SalesShipment>,
    @InjectRepository(SalesShipmentLine)
    private readonly shipmentLines: Repository<SalesShipmentLine>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(AppConfig)
    private readonly configs: Repository<AppConfig>,
    private readonly dataSource: DataSource,
  ) {}

  async listOrders(user: AuthUser, query: SalesQueryDto) {
    const builder = this.orders
      .createQueryBuilder("orders")
      .leftJoin(Customer, "customer", "customer.id = orders.customer_id")
      .where("orders.site_id = :siteId", { siteId: user.siteId });
    if (query.status)
      builder.andWhere("orders.status = :status", { status: query.status });
    if (query.customerId)
      builder.andWhere("orders.customer_id = :customerId", {
        customerId: query.customerId,
      });
    if (query.keyword?.trim())
      builder.andWhere(
        "(orders.order_no LIKE :keyword OR customer.name LIKE :keyword OR customer.company LIKE :keyword)",
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
        "SUM(CASE WHEN orders.status IN ('confirmed','partially_shipped') THEN 1 ELSE 0 END)",
        "pendingShipment",
      )
      .getRawOne();
    return {
      ...pageResult(await this.attachOrders(items, user.siteId), total, query),
      summary: {
        amount: Number(aggregate?.amount || 0),
        pendingShipment: Number(aggregate?.pendingShipment || 0),
      },
    };
  }

  async getOrder(id: string, user: AuthUser) {
    const order = await this.requireOrder(id, user.siteId);
    return (await this.attachOrders([order], user.siteId))[0];
  }

  async createOrder(dto: SalesOrderDto, user: AuthUser) {
    let id = "";
    await this.dataSource.transaction(async (manager) => {
      id = await this.saveOrder(manager, null, dto, user);
    });
    return this.getOrder(id, user);
  }

  async updateOrder(id: string, dto: SalesOrderDto, user: AuthUser) {
    await this.requireOrder(id, user.siteId);
    throw new BadRequestException("销售订单创建后已预占库存，不支持编辑");
  }

  async confirmOrder(id: string, user: AuthUser) {
    await this.requireOrder(id, user.siteId);
    throw new BadRequestException("销售订单创建时已自动确认并预占库存");
  }

  async cancelOrder(id: string, user: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(SalesOrder, {
        where: { id, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("销售订单不存在");
      if (!["confirmed", "partially_shipped"].includes(order.status))
        throw new BadRequestException("当前订单不可取消");
      if (await manager.createQueryBuilder(FinanceTransaction, "transaction").where("transaction.site_id = :siteId", { siteId: user.siteId }).andWhere("transaction.order_id = :orderId", { orderId: id }).andWhere("transaction.type = 'receipt'").andWhere("transaction.status IN ('pending', 'confirmed')").getExists())
        throw new BadRequestException("订单已有待确认或已确认收款，请先处理收款单");
      const lines = await manager.find(SalesOrderLine, {
        where: { orderId: id },
      });
      for (const line of lines) {
        const remaining = line.quantity - line.shippedQuantity;
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
          balance.reserved = Math.max(0, balance.reserved - remaining);
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
      throw new BadRequestException("仅已取消订单可以删除");
    if (await this.dataSource.getRepository(FinanceTransaction).exist({ where: { siteId: user.siteId, orderId: id } }))
      throw new BadRequestException("订单已有财务流水，为保留审计记录不可删除");
    if (
      await this.shipments.exist({
        where: { orderId: id, siteId: user.siteId },
      })
    )
      throw new BadRequestException("订单已有出库记录，不可删除");
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SalesOrderLine, { orderId: id });
      await manager.delete(SalesOrder, { id });
    });
  }

  async listShipments(user: AuthUser, query: SalesQueryDto) {
    const builder = this.shipments
      .createQueryBuilder("shipment")
      .leftJoin(SalesOrder, "orders", "orders.id = shipment.order_id")
      .leftJoin(Customer, "customer", "customer.id = orders.customer_id")
      .where("shipment.site_id = :siteId", { siteId: user.siteId });
    if (query.status)
      builder.andWhere("shipment.status = :status", { status: query.status });
    if (query.warehouseId)
      builder.andWhere("shipment.warehouse_id = :warehouseId", {
        warehouseId: query.warehouseId,
      });
    if (query.keyword?.trim())
      builder.andWhere(
        "(shipment.shipment_no LIKE :keyword OR shipment.tracking_no LIKE :keyword OR orders.order_no LIKE :keyword OR customer.name LIKE :keyword)",
        { keyword: `%${query.keyword.trim()}%` },
      );
    const [items, total] = await builder
      .clone()
      .orderBy("shipment.createdAt", "DESC")
      .skip(pageOffset(query))
      .take(pageLimit(query))
      .getManyAndCount();
    const aggregate = await builder
      .clone()
      .leftJoin(
        SalesShipmentLine,
        "shipmentLine",
        "shipmentLine.shipment_id = shipment.id",
      )
      .select("COALESCE(SUM(shipmentLine.quantity), 0)", "quantity")
      .getRawOne();
    const rows = await this.attachShipments(items, user.siteId);
    return {
      ...pageResult(rows, total, query),
      summary: { quantity: Number(aggregate?.quantity || 0) },
    };
  }

  async createShipment(dto: CreateShipmentDto, user: AuthUser) {
    let id = "";
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(SalesOrder, {
        where: { id: dto.orderId, siteId: user.siteId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order) throw new NotFoundException("销售订单不存在");
      if (!["confirmed", "partially_shipped"].includes(order.status))
        throw new BadRequestException("仅已确认或部分出库订单可以出库");
      const warehouse = await manager.findOne(Warehouse, {
        where: { id: order.warehouseId, siteId: user.siteId },
      });
      if (!warehouse || warehouse.status !== "active")
        throw new BadRequestException("订单仓库不可用");
      if (
        dto.deliveryMethod === "logistics" &&
        (!dto.logisticsCompany?.trim() || !dto.trackingNo?.trim())
      )
        throw new BadRequestException("物流发货必须填写物流公司和物流单号");
      const lines = await manager.find(SalesOrderLine, {
        where: { orderId: order.id },
        lock: { mode: "pessimistic_write" },
      });
      const lineMap = new Map(lines.map((line) => [line.id, line]));
      if (
        !dto.lines.length ||
        new Set(dto.lines.map((line) => line.orderLineId)).size !==
          dto.lines.length
      )
        throw new BadRequestException("出库明细无效或重复");
      const shipment = await manager.save(
        manager.create(SalesShipment, {
          tenantId: user.tenantId,
          siteId: user.siteId,
          shipmentNo: makeNo("CK"),
          orderId: order.id,
          warehouseId: order.warehouseId,
          status: "shipped",
          deliveryMethod: dto.deliveryMethod,
          logisticsCompany:
            dto.deliveryMethod === "logistics"
              ? dto.logisticsCompany!.trim()
              : "",
          trackingNo:
            dto.deliveryMethod === "logistics" ? dto.trackingNo!.trim() : "",
          remark: dto.remark || "",
          createdBy: user.userId,
          shippedAt: new Date(),
        }),
      );
      id = shipment.id;
      for (const input of dto.lines) {
        const line = lineMap.get(input.orderLineId);
        if (!line || input.quantity > line.quantity - line.shippedQuantity)
          throw new BadRequestException("出库数量超过订单待出库数量");
        const balance = await manager.findOne(InventoryBalance, {
          where: {
            siteId: user.siteId,
            warehouseId: order.warehouseId,
            productId: line.productId,
            variantKey: line.variantKey,
          },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !balance ||
          balance.onHand < input.quantity ||
          balance.reserved < input.quantity
        )
          throw new BadRequestException(
            `${line.productName}库存或预占数量不足`,
          );
        balance.onHand -= input.quantity;
        balance.reserved -= input.quantity;
        line.shippedQuantity += input.quantity;
        await manager.save([balance, line]);
        await manager.save(
          manager.create(SalesShipmentLine, {
            shipmentId: shipment.id,
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
            type: "sales_out" as InventoryLedgerEntry["type"],
            quantityChange: -input.quantity,
            balanceAfter: balance.onHand,
            referenceType: "sales_shipment",
            referenceId: shipment.id,
            actorUserId: user.userId,
            remark: `销售出库 ${shipment.shipmentNo}`,
          }),
        );
      }
      order.status = lines.every(
        (line) => line.shippedQuantity >= line.quantity,
      )
        ? "completed"
        : "partially_shipped";
      await manager.save(order);
      if (order.status === "completed") {
        const customer = await manager.findOne(Customer, {
          where: { id: order.customerId, siteId: user.siteId },
          lock: { mode: "pessimistic_write" },
        });
        if (customer) {
          customer.orders += 1;
          customer.totalAmount = money(
            Number(customer.totalAmount) + Number(order.totalAmount),
          );
          customer.lastOrderAt = new Date().toISOString().slice(0, 10);
          await manager.save(customer);
        }
      }
      await this.syncProducts(
        manager,
        [...new Set(lines.map((line) => line.productId))],
        user.siteId,
      );
    });
    return (
      await this.attachShipments(
        [await this.shipments.findOneByOrFail({ id })],
        user.siteId,
      )
    )[0];
  }

  private async saveOrder(
    manager: EntityManager,
    existing: SalesOrder | null,
    dto: SalesOrderDto,
    user: AuthUser,
  ) {
    const [customer, warehouse, products] = await Promise.all([
      manager.findOne(Customer, {
        where: { id: dto.customerId, siteId: user.siteId },
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
    if (!customer || customer.status !== "active")
      throw new BadRequestException("客户不存在或已停用");
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
      throw new BadRequestException("该仓库正在盘点，暂不可创建销售订单");
    if (!dto.lines.length)
      throw new BadRequestException("请至少添加一条商品明细");
    const salesConfig =
      (await this.configs.findOne({
        where: { key: `${user.siteId}:currency` },
      })) ||
      (await this.configs.findOne({ where: { key: `${user.siteId}:sales` } }));
    const configuredCurrencies = ((
      salesConfig?.value as Record<string, unknown> | undefined
    )?.currencies as
      Array<{ code?: string; enabled?: boolean }> | undefined) || [
      { code: "CNY", enabled: true },
      { code: "USD", enabled: true },
      { code: "EUR", enabled: true },
    ];
    const currency = (dto.currency || "CNY").toUpperCase();
    if (
      !configuredCurrencies.some(
        (item) => item.enabled && item.code === currency,
      )
    )
      throw new BadRequestException("所选币种未在系统设置中启用");
    const dimensions = new Set<string>();
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const prepared = dto.lines.map((input) => {
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
        productId: product.id,
        variantKey,
        productName: product.nameZh,
        productSku: product.sku,
        variantLabel: variant
          ? `${variant.specification}: ${variant.option}`
          : "默认规格",
        quantity: input.quantity,
        shippedQuantity: 0,
        unitPrice: money(input.unitPrice),
        amount: money(input.quantity * input.unitPrice),
      };
    });
    const amount = money(prepared.reduce((sum, line) => sum + line.amount, 0));
    const discount = money(dto.discount || 0);
    const shippingFee = money(dto.shippingFee || 0);
    if (discount > amount)
      throw new BadRequestException("优惠金额不能超过商品金额");
    for (const line of prepared) {
      const balance = await manager.findOne(InventoryBalance, {
        where: {
          siteId: user.siteId,
          warehouseId: warehouse.id,
          productId: line.productId,
          variantKey: line.variantKey,
        },
        lock: { mode: "pessimistic_write" },
      });
      if (!balance || balance.onHand - balance.reserved < line.quantity)
        throw new BadRequestException(
          `${line.productName}（${line.variantLabel}）可用库存不足`,
        );
      balance.reserved += line.quantity;
      await manager.save(balance);
    }
    const order = manager.create(SalesOrder, {
      ...(existing || {}),
      tenantId: user.tenantId,
      siteId: user.siteId,
      orderNo: existing?.orderNo || makeNo("SO"),
      customerId: customer.id,
      warehouseId: warehouse.id,
      currency,
      amount,
      discount,
      shippingFee,
      totalAmount: money(amount - discount + shippingFee),
      status: "confirmed",
      deliveryDate: dto.deliveryDate || null,
      shippingAddress: dto.shippingAddress || "",
      contactName: dto.contactName || customer.name,
      contactPhone: dto.contactPhone || customer.phone || "",
      remark: dto.remark || "",
      createdBy: existing?.createdBy || user.userId,
      confirmedAt: new Date(),
    });
    const saved = await manager.save(order);
    if (existing) await manager.delete(SalesOrderLine, { orderId: saved.id });
    await manager.save(
      prepared.map((line) =>
        manager.create(SalesOrderLine, { ...line, orderId: saved.id }),
      ),
    );
    return saved.id;
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
      if (product.variants?.length) {
        product.variants = product.variants.map((variant) => ({
          ...variant,
          stock: balances
            .filter((balance) => balance.variantKey === variant.id)
            .reduce((sum, balance) => sum + balance.onHand, 0),
        }));
      }
      await manager.save(product);
    }
  }

  private async attachOrders(orders: SalesOrder[], siteId: string) {
    if (!orders.length) return [];
    const [lines, customers, warehouses] = await Promise.all([
      this.orderLines.find({ where: { orderId: In(orders.map((x) => x.id)) } }),
      this.customers.find({ where: { siteId } }),
      this.warehouses.find({ where: { siteId } }),
    ]);
    const customerMap = new Map(customers.map((x) => [x.id, x]));
    const warehouseMap = new Map(warehouses.map((x) => [x.id, x.name]));
    return orders.map((order) => ({
      ...order,
      amount: Number(order.amount),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      customerName: customerMap.get(order.customerId)?.name || "",
      customerCompany: customerMap.get(order.customerId)?.company || "",
      warehouseName: warehouseMap.get(order.warehouseId) || "",
      lines: lines
        .filter((line) => line.orderId === order.id)
        .map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
          amount: Number(line.amount),
        })),
    }));
  }

  private async attachShipments(shipments: SalesShipment[], siteId: string) {
    if (!shipments.length) return [];
    const [lines, orders, customers, warehouses, orderLines] =
      await Promise.all([
        this.shipmentLines.find({
          where: { shipmentId: In(shipments.map((x) => x.id)) },
        }),
        this.orders.find({
          where: { id: In(shipments.map((x) => x.orderId)), siteId },
        }),
        this.customers.find({ where: { siteId } }),
        this.warehouses.find({ where: { siteId } }),
        this.orderLines.find({
          where: { orderId: In(shipments.map((x) => x.orderId)) },
        }),
      ]);
    const orderMap = new Map(orders.map((x) => [x.id, x]));
    const customerMap = new Map(customers.map((x) => [x.id, x.name]));
    const warehouseMap = new Map(warehouses.map((x) => [x.id, x.name]));
    const orderLineMap = new Map(orderLines.map((x) => [x.id, x]));
    return shipments.map((item) => {
      const order = orderMap.get(item.orderId);
      return {
        ...item,
        orderNo: order?.orderNo || "",
        customerName: customerMap.get(order?.customerId || "") || "",
        warehouseName: warehouseMap.get(item.warehouseId) || "",
        lines: lines
          .filter((line) => line.shipmentId === item.id)
          .map((line) => ({
            ...line,
            productName: orderLineMap.get(line.orderLineId)?.productName || "",
            variantLabel:
              orderLineMap.get(line.orderLineId)?.variantLabel || "",
          })),
      };
    });
  }

  private async requireOrder(id: string, siteId: string) {
    const order = await this.orders.findOne({ where: { id, siteId } });
    if (!order) throw new NotFoundException("销售订单不存在");
    return order;
  }
}
