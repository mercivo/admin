import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DatePicker,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import {
  AlertCircle,
  Edit3,
  Eye,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import type { Product } from "../../types";
import {
  customerApi,
  inventoryApi,
  productApi,
  salesApi,
  workspaceApi,
  type Customer,
  type InventoryStock,
  type SalesOrder,
  type SalesOrderInput,
  type SalesOrderLine,
  type SalesShipment,
  type SalesShipmentLine,
  type Warehouse,
} from "../../services/api/index";
import {
  DEFAULT_SALES_CONFIG,
  type CurrencyOption,
  type SalesConfig,
} from "../../config/sales";
import {
  AppEditableTable,
  AdminPageSkeleton,
  AppModal,
  AppTable,
  ModalForm,
  ModalFormField,
  ModalFormGrid,
  PageContent,
  PageHeader,
  SalesOrderStatusTag,
  salesOrderStatusMap,
  TableActionButton,
  TableAddRowButton,
  TableActions,
  WarehouseSelectOption,
  createActionColumn,
} from "../../components/shared";
import { can } from "../../utils/permissions";
import { useTablePagination } from "../../hooks/useTablePagination";
import {
  availableProductVariantValues,
  productVariantValue,
} from "../../utils/productVariant";

type OrderDraftLine = SalesOrderInput["lines"][number] & { clientId: string };
type OrderDraft = Omit<SalesOrderInput, "lines"> & {
  id?: string;
  orderNo?: string;
  lines: OrderDraftLine[];
};
type ShipmentDraft = {
  order: SalesOrder;
  deliveryMethod: "offline" | "logistics";
  logisticsCompany: string;
  trackingNo: string;
  remark: string;
  lines: Array<{ orderLineId: string; quantity: number; max: number }>;
};
type PendingOrderAction = {
  type: "cancel" | "delete";
  order: SalesOrder;
};
let draftLineSequence = 0;
const draftLine = (value: SalesOrderInput["lines"][number]): OrderDraftLine => ({
  ...value,
  clientId: `sales-line-${++draftLineSequence}`,
});
const emptyOrder = (currency: string): OrderDraft => ({
  customerId: "",
  warehouseId: "",
  currency,
  discount: 0,
  shippingFee: 0,
  shippingAddress: "",
  contactName: "",
  contactPhone: "",
  remark: "",
  lines: [draftLine({ productId: "", variantKey: "BASE", quantity: 1, unitPrice: 0 })],
});
const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50";
const displayValue = (value?: React.ReactNode) =>
  value === null || value === undefined || value === "" ? "-" : value;
const money = (
  value: number,
  currency = "CNY",
  currencies: CurrencyOption[] = DEFAULT_SALES_CONFIG.currencies,
) =>
  `${currencies.find((item) => item.code === currency)?.symbol || currency} ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const SalesPage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [shipments, setShipments] = useState<SalesShipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedModule, setLoadedModule] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const previousKeyword = useRef(keyword);
  const [status, setStatus] = useState<string>();
  const [salesConfig, setSalesConfig] =
    useState<SalesConfig>(DEFAULT_SALES_CONFIG);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft | null>(
    null,
  );
  const [detail, setDetail] = useState<SalesOrder | SalesShipment | null>(null);
  const [pendingOrderAction, setPendingOrderAction] =
    useState<PendingOrderAction | null>(null);
  const pagination = useTablePagination(module);
  const listRequestRef = useRef(0);

  const loadList = async (
    requestId = ++listRequestRef.current,
    requestedModule = module,
  ) => {
    setLoading(true);
    try {
      if (requestedModule === "shipments") {
        const result = await salesApi.shipments({
          page: pagination.current,
          pageSize: pagination.pageSize,
          keyword,
          status,
        });
        if (requestId !== listRequestRef.current) return;
        setShipments(result.items);
        pagination.reconcile(result.total);
      } else {
        const result = await salesApi.orders({
          page: pagination.current,
          pageSize: pagination.pageSize,
          keyword,
          status,
        });
        if (requestId !== listRequestRef.current) return;
        setOrders(result.items);
        pagination.reconcile(result.total);
      }
    } catch {
      if (requestId === listRequestRef.current) message.error("销售数据加载失败");
    } finally {
      if (requestId === listRequestRef.current) {
        setLoadedModule(requestedModule);
        setLoading(false);
      }
    }
  };
  const loadOrderOptions = async () => {
    const [customerRes, warehouseRes, productRes, stockRes] = await Promise.all(
      [
        customerApi.options(),
        inventoryApi.warehouseOptions(),
        productApi.options(),
        inventoryApi.stockOptions(),
      ],
    );
    setCustomers(customerRes);
    setWarehouses(warehouseRes);
    setProducts(productRes);
    setStocks(stockRes);
    return productRes;
  };
  const loadSalesConfig = async () => {
    const configured = await workspaceApi
      .getConfig<Partial<SalesConfig>>("currency")
      .catch(() => DEFAULT_SALES_CONFIG);
    setSalesConfig({
      ...DEFAULT_SALES_CONFIG,
      ...configured,
      currencies: configured.currencies?.length
        ? configured.currencies
        : DEFAULT_SALES_CONFIG.currencies,
    });
  };
  const refreshStockOptions = async () =>
    setStocks(await inventoryApi.stockOptions());
  useEffect(() => {
    void loadSalesConfig();
  }, []);
  useEffect(() => {
    const requestId = ++listRequestRef.current;
    const delay = previousKeyword.current === keyword ? 0 : 250;
    previousKeyword.current = keyword;
    if (!delay) { void loadList(requestId, module); return () => { listRequestRef.current += 1; }; }
    const timer = window.setTimeout(() => void loadList(requestId, module), delay);
    return () => { window.clearTimeout(timer); listRequestRef.current += 1; };
  }, [module, pagination.current, pagination.pageSize, keyword, status]);
  useEffect(() => {
    pagination.reset();
  }, [keyword, status]);
  const productOptions = useMemo(
    () =>
      products.flatMap((product) =>
        product.variants?.length
          ? product.variants.map((variant) => ({
              value: `${product.id}:${variant.id}`,
              label: `${product.nameZh} · ${variant.specification}: ${variant.option} (${product.sku})`,
              product,
              variantKey: variant.id || "BASE",
              price:
                Number(product.basePrice || 0) + Number(variant.surcharge || 0),
            }))
          : [
              {
                value: `${product.id}:BASE`,
                label: `${product.nameZh} (${product.sku})`,
                product,
                variantKey: "BASE",
                price: Number(product.basePrice || 0),
              },
            ],
      ),
    [products],
  );
  const draftAmount =
    orderDraft?.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    ) || 0;
  const draftTotal = Math.max(
    0,
    draftAmount -
      Number(orderDraft?.discount || 0) +
      Number(orderDraft?.shippingFee || 0),
  );
  const openOrderEditor = async () => {
    try {
      await loadOrderOptions();
      setOrderDraft(emptyOrder(salesConfig.salesDefaultCurrency || salesConfig.defaultCurrency));
    } catch {
      message.error("销售选项加载失败");
    }
  };
  const editOrder = async (order: SalesOrder) => {
    try {
      const productRows = await loadOrderOptions();
      const availableValues = availableProductVariantValues(productRows);
      setOrderDraft({
        id: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId,
        warehouseId: order.warehouseId,
        currency: order.currency,
        discount: order.discount,
        shippingFee: order.shippingFee,
        deliveryDate: order.deliveryDate || undefined,
        shippingAddress: order.shippingAddress,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        remark: order.remark,
        lines: order.lines.map((line) => draftLine({
          productId: availableValues.has(
            productVariantValue(line.productId, line.variantKey),
          )
            ? line.productId
            : "",
          variantKey: availableValues.has(
            productVariantValue(line.productId, line.variantKey),
          )
            ? line.variantKey
            : "BASE",
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });
    } catch {
      message.error("销售选项加载失败");
    }
  };

  const saveOrder = async () => {
    if (
      !orderDraft?.customerId ||
      !orderDraft.warehouseId ||
      !orderDraft.lines.length ||
      orderDraft.lines.some((line) => !line.productId || line.quantity < 1)
    )
      return void message.warning("请完整填写客户、仓库和商品明细");
    setSaving(true);
    try {
      const payload: SalesOrderInput = {
        customerId: orderDraft.customerId,
        warehouseId: orderDraft.warehouseId,
        currency: orderDraft.currency,
        discount: orderDraft.discount,
        shippingFee: orderDraft.shippingFee,
        deliveryDate: orderDraft.deliveryDate,
        shippingAddress: orderDraft.shippingAddress,
        contactName: orderDraft.contactName,
        contactPhone: orderDraft.contactPhone,
        remark: orderDraft.remark,
        lines: orderDraft.lines.map(({ clientId: _clientId, ...line }) => line),
      };
      orderDraft.id
        ? await salesApi.updateOrder(orderDraft.id, payload)
        : await salesApi.createOrder(payload);
      message.success(
        orderDraft.id
          ? "销售订单已更新并重新预占库存"
          : "订单已创建并预占库存",
      );
      setOrderDraft(null);
      await Promise.all([loadList(), refreshStockOptions()]);
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  };
  const submitOrderAction = async () => {
    if (!pendingOrderAction) return;
    setSaving(true);
    try {
      if (pendingOrderAction.type === "cancel") {
        await salesApi.cancelOrder(pendingOrderAction.order.id);
        message.success("销售订单已取消");
      } else {
        await salesApi.removeOrder(pendingOrderAction.order.id);
        message.success("销售订单已删除");
      }
      setPendingOrderAction(null);
      await Promise.all([loadList(), refreshStockOptions()]);
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  };
  const startShipment = (order: SalesOrder) =>
    setShipmentDraft({
      order,
      deliveryMethod: "offline",
      logisticsCompany: "",
      trackingNo: "",
      remark: "",
      lines: order.lines
        .filter((line) => line.shippedQuantity < line.quantity)
        .map((line) => ({
          orderLineId: line.id,
          quantity: line.quantity - line.shippedQuantity,
          max: line.quantity - line.shippedQuantity,
        })),
    });
  const saveShipment = async () => {
    if (
      !shipmentDraft ||
      !shipmentDraft.lines.some((line) => line.quantity > 0)
    )
      return void message.warning("请填写本次出库数量");
    if (
      shipmentDraft.deliveryMethod === "logistics" &&
      (!shipmentDraft.logisticsCompany.trim() ||
        !shipmentDraft.trackingNo.trim())
    )
      return void message.warning("物流发货请填写物流公司和物流单号");
    setSaving(true);
    try {
      await salesApi.createShipment({
        orderId: shipmentDraft.order.id,
        deliveryMethod: shipmentDraft.deliveryMethod,
        logisticsCompany: shipmentDraft.logisticsCompany,
        trackingNo: shipmentDraft.trackingNo,
        remark: shipmentDraft.remark,
        lines: shipmentDraft.lines
          .filter((line) => line.quantity > 0)
          .map(({ orderLineId, quantity }) => ({ orderLineId, quantity })),
      });
      message.success("销售出库完成，库存已扣减");
      setShipmentDraft(null);
      await Promise.all([loadList(), refreshStockOptions()]);
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  };
  const selectProduct = (index: number, value: string) => {
    if (!orderDraft) return;
    const option = productOptions.find((item) => item.value === value)!;
    const lines = orderDraft.lines.map((line, i) =>
      i === index
        ? {
            ...line,
            productId: String(option.product.id),
            variantKey: option.variantKey,
            unitPrice: option.price,
          }
        : line,
    );
    setOrderDraft({ ...orderDraft, lines });
  };
  const stockFor = (productId: string, variantKey: string) =>
    stocks.find(
      (item) =>
        item.warehouseId === orderDraft?.warehouseId &&
        item.productId === productId &&
        item.variantKey === variantKey,
    )?.available ?? 0;

  const filters = (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      <div className="max-w-xs flex-1">
        <Input
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={
            module === "orders"
              ? "搜索订单号或客户..."
              : "搜索出库单、订单或物流单号..."
          }
          prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          variant="filled"
          size="middle"
        />
      </div>
      <Select
        value={status || "all"}
        onChange={(value) => setStatus(value === "all" ? undefined : value)}
        style={{ width: 140 }}
        variant="filled"
        size="middle"
        options={[
          { value: "all", label: "全部状态" },
          ...(module === "orders"
            ? ["confirmed", "partially_shipped", "completed", "cancelled"]
            : ["shipped", "cancelled"]
          ).map((value) => ({ value, label: salesOrderStatusMap[value].label })),
        ]}
      />
    </div>
  );
  return (
    <PageContent>
      <PageHeader
        title={module === "orders" ? "销售订单" : "销售出库"}
        description={
          module === "orders"
            ? "订单创建即预占库存，支持分批出库和收款状态跟踪"
            : "支持线下自取与物流发货，出库后自动释放预占并扣减现存库存"
        }
        action={
          module === "orders" && can("sales.order.create") ? (
            <button
              className={primaryButton}
              onClick={() => void openOrderEditor()}
            >
              <Plus size={16} />
              新建销售订单
            </button>
          ) : undefined
        }
      />
      {loadedModule !== module ? <AdminPageSkeleton variant="table" /> : <section className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm">
        {filters}
        {module === "orders" ? (
          <AppTable
            rowKey="id"
            loading={loading}
            dataSource={orders}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无相关数据"
                />
              ),
            }}
            pagination={pagination.config}
            columns={[
              {
                title: "订单号",
                dataIndex: "orderNo",
                width: 185,
                render: (value) => (
                  <span className="font-mono text-xs">{value}</span>
                ),
              },
              {
                title: "客户",
                dataIndex: "customerName",
                width: 150,
              },
              { title: "仓库", dataIndex: "warehouseName", width: 130 },
              {
                title: "商品/数量",
                width: 120,
                render: (_, row) =>
                  `${row.lines.length} 种 / ${row.lines.reduce((n, line) => n + line.quantity, 0)} 件`,
              },
              {
                title: "订单金额",
                dataIndex: "totalAmount",
                width: 125,
                render: (value, row) =>
                  money(value, row.currency, salesConfig.currencies),
              },
              {
                title: "交付日期",
                dataIndex: "deliveryDate",
                width: 115,
                render: (value) => value || "-",
              },
              {
                title: "状态",
                width: 105,
                render: (_, row) => <SalesOrderStatusTag status={row.status} />,
              },
              {
                title: "创建时间",
                dataIndex: "createdAt",
                width: 170,
                render: (value) => new Date(value).toLocaleString("zh-CN"),
              },
              createActionColumn<SalesOrder>({
                actions: 4,
                render: (_, row) => (
                  <TableActions>
                    <TableActionButton
                      title="查看"
                      onClick={() => setDetail(row)}
                    >
                      <Eye size={15} />
                    </TableActionButton>
                    {["confirmed", "partially_shipped"].includes(row.status) &&
                      can("sales.shipment.create") && (
                        <TableActionButton
                          title="销售出库"
                          tone="success"
                          onClick={() => startShipment(row)}
                        >
                          <PackageCheck size={15} />
                        </TableActionButton>
                      )}
                    {["confirmed", "partially_shipped"].includes(row.status) &&
                      can("sales.order.cancel") && (
                        <TableActionButton
                          title="取消订单"
                          tone="danger"
                          onClick={() =>
                            setPendingOrderAction({
                              type: "cancel",
                              order: row,
                            })
                          }
                        >
                          <XCircle size={15} />
                        </TableActionButton>
                      )}
                    {row.status === "cancelled" &&
                      can("sales.order.create") && (
                        <TableActionButton
                          title="重新编辑"
                          onClick={() => void editOrder(row)}
                        >
                          <Edit3 size={15} />
                        </TableActionButton>
                      )}
                    {row.status === "cancelled" &&
                      can("sales.order.cancel") && (
                        <TableActionButton
                          title="删除订单"
                          tone="danger"
                          onClick={() =>
                            setPendingOrderAction({
                              type: "delete",
                              order: row,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </TableActionButton>
                      )}
                  </TableActions>
                ),
              }),
            ]}
          />
        ) : (
          <AppTable
            rowKey="id"
            loading={loading}
            dataSource={shipments}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无相关数据"
                />
              ),
            }}
            pagination={pagination.config}
            columns={[
              {
                title: "出库单号",
                dataIndex: "shipmentNo",
                width: 185,
                render: (value) => (
                  <span className="font-mono text-xs">{value}</span>
                ),
              },
              {
                title: "销售订单",
                dataIndex: "orderNo",
                width: 185,
                render: (value) => (
                  <span className="font-mono text-xs">{value}</span>
                ),
              },
              { title: "客户", dataIndex: "customerName", width: 150 },
              { title: "出库仓库", dataIndex: "warehouseName", width: 130 },
              {
                title: "出库数量",
                width: 120,
                render: (_, row) =>
                  row.lines.reduce((n, line) => n + line.quantity, 0),
              },
              {
                title: "出库方式",
                width: 100,
                render: (_, row) =>
                  row.deliveryMethod === "logistics" ? "物流发货" : "线下自取",
              },
              {
                title: "物流信息",
                width: 190,
                render: (_, row) => (
                  <div>
                    {row.deliveryMethod === "logistics" ? (
                      <>
                        {row.logisticsCompany}
                        <div className="text-xs text-muted-foreground">
                          {row.trackingNo}
                        </div>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                ),
              },
              {
                title: "状态",
                width: 105,
                render: (_, row) => <SalesOrderStatusTag status={row.status} />,
              },
              {
                title: "出库时间",
                dataIndex: "shippedAt",
                width: 170,
                render: (value) => new Date(value).toLocaleString("zh-CN"),
              },
              createActionColumn<SalesShipment>({
                render: (_, row) => (
                  <TableActions>
                    <TableActionButton
                      title="查看出库明细"
                      onClick={() => setDetail(row)}
                    >
                      <Eye size={15} />
                    </TableActionButton>
                  </TableActions>
                ),
              }),
            ]}
          />
        )}
      </section>}

      <AppModal
        open={!!orderDraft}
        width={980}
        className="sales-workflow-modal"
        title={orderDraft?.id ? `重新编辑销售订单 · ${orderDraft.orderNo}` : "新建销售订单"}
        description={orderDraft?.id ? "保存后订单将恢复为待出库，并重新预占对应仓库库存" : "填写订单与交付信息，提交后将自动预占对应仓库库存"}
        okText={orderDraft?.id ? "保存并恢复待出库" : "创建并预占库存"}
        confirmLoading={saving}
        footerLeft={
          orderDraft ? (
            <div className="flex h-full items-center gap-5 text-sm leading-none">
              <span className="text-muted-foreground">
                商品金额{" "}
                <b className="ml-1 font-semibold text-foreground">
                  {money(
                    draftAmount,
                    orderDraft.currency,
                    salesConfig.currencies,
                  )}
                </b>
              </span>
              <span className="text-muted-foreground">
                应收合计{" "}
                <b className="ml-1 text-base font-bold text-primary">
                  {money(
                    draftTotal,
                    orderDraft.currency,
                    salesConfig.currencies,
                  )}
                </b>
              </span>
            </div>
          ) : null
        }
        onCancel={() => setOrderDraft(null)}
        onOk={() => void saveOrder()}
      >
        {orderDraft && (
          <ModalForm>
            <ModalFormGrid>
              <ModalFormField label="客户" required>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择客户"
                  value={orderDraft.customerId || undefined}
                  onChange={(customerId) => {
                    const customer = customers.find((x) => x.id === customerId);
                    setOrderDraft({
                      ...orderDraft,
                      customerId,
                      contactName: customer?.name || "",
                      contactPhone: customer?.phone || "",
                    });
                  }}
                  options={customers
                    .filter((x) => x.status === "active")
                    .map((x) => ({
                      value: x.id,
                      label: x.name,
                    }))}
                />
              </ModalFormField>
              <ModalFormField label="出库仓库" required>
                <Select
                  placeholder="请选择出库仓库"
                  value={orderDraft.warehouseId || undefined}
                  onChange={(warehouseId) =>
                    setOrderDraft({ ...orderDraft, warehouseId })
                  }
                  options={warehouses
                    .filter((warehouse) => warehouse.status === "active")
                    .map((warehouse) => ({
                      value: warehouse.id,
                      label: (
                        <WarehouseSelectOption
                          name={warehouse.name}
                          isLocked={warehouse.isLocked}
                          activeCountDocumentNo={
                            warehouse.activeCountDocumentNo
                          }
                        />
                      ),
                      disabled: warehouse.isLocked,
                    }))}
                />
              </ModalFormField>
              <ModalFormField label="预计交付">
                <DatePicker
                  className="w-full"
                  placeholder="请选择预计交付日期"
                  value={
                    orderDraft.deliveryDate
                      ? dayjs(orderDraft.deliveryDate)
                      : null
                  }
                  onChange={(value) =>
                    setOrderDraft({
                      ...orderDraft,
                      deliveryDate: value?.format("YYYY-MM-DD"),
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="币种">
                <Select
                  className="w-full"
                  placeholder="请选择币种"
                  value={orderDraft.currency}
                  onChange={(currency) =>
                    setOrderDraft({ ...orderDraft, currency })
                  }
                  options={salesConfig.currencies
                    .filter((item) => item.enabled)
                    .map((item) => ({
                      value: item.code,
                      label: `${item.name}（${item.code} · ${item.symbol}）`,
                    }))}
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="商品明细" required>
              <AppEditableTable
                className="sales-order-lines-table"
                rowKey="clientId"
                dataSource={orderDraft.lines}
                emptyText="暂无商品明细，请添加商品"
                columns={[
                  { title: "商品/规格" },
                  { title: "可用库存", width: 90 },
                  { title: "数量", width: 110 },
                  { title: `单价（${orderDraft.currency}）`, width: 150 },
                  { title: "金额", width: 120 },
                  { title: "", width: 56, className: "text-center" },
                ]}
                renderRow={(line, index) => [
                  <Select
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                    popupMatchSelectWidth={520}
                    classNames={{ popup: { root: "product-spec-dropdown" } }}
                    listHeight={320}
                    optionRender={(option) => <span title={String(option.label)}>{option.label}</span>}
                    placeholder="请选择商品规格"
                    variant="borderless"
                    size="small"
                    value={
                      line.productId && productOptions.some(
                        (option) => option.value === productVariantValue(
                          line.productId,
                          line.variantKey,
                        ),
                      )
                        ? productVariantValue(line.productId, line.variantKey)
                        : undefined
                    }
                    onChange={(value) => selectProduct(index, value)}
                    options={productOptions}
                  />,
                  line.productId
                    ? stockFor(line.productId, line.variantKey)
                    : "-",
                  <InputNumber
                    className="w-full"
                    variant="borderless"
                    size="small"
                    placeholder="数量"
                    min={1}
                    precision={0}
                    value={line.quantity}
                    onChange={(quantity) =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.map((x, i) =>
                          i === index
                            ? { ...x, quantity: Number(quantity) || 1 }
                            : x,
                        ),
                      })
                    }
                  />,
                  <InputNumber
                    className="w-full"
                    variant="borderless"
                    size="small"
                    placeholder="请输入单价"
                    min={0}
                    precision={2}
                    value={line.unitPrice}
                    onChange={(unitPrice) =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.map((x, i) =>
                          i === index
                            ? { ...x, unitPrice: Number(unitPrice) || 0 }
                            : x,
                        ),
                      })
                    }
                  />,
                  money(
                    line.quantity * line.unitPrice,
                    orderDraft.currency,
                    salesConfig.currencies,
                  ),
                  <TableActionButton
                    title="删除"
                    tone="danger"
                    onClick={() =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </TableActionButton>,
                ]}
              />
              <TableAddRowButton
                onClick={() =>
                  setOrderDraft({
                    ...orderDraft,
                    lines: [
                      ...orderDraft.lines,
                      draftLine({
                        productId: "",
                        variantKey: "BASE",
                        quantity: 1,
                        unitPrice: 0,
                      }),
                    ],
                  })
                }
              >
                添加商品
              </TableAddRowButton>
            </ModalFormField>
            <ModalFormGrid>
              <ModalFormField label="优惠金额">
                <InputNumber
                  className="w-full"
                  style={{ width: "100%" }}
                  placeholder="请输入优惠金额"
                  min={0}
                  precision={2}
                  value={orderDraft.discount}
                  onChange={(discount) =>
                    setOrderDraft({
                      ...orderDraft,
                      discount: Number(discount) || 0,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="运费">
                <InputNumber
                  className="w-full"
                  style={{ width: "100%" }}
                  placeholder="请输入运费"
                  min={0}
                  precision={2}
                  value={orderDraft.shippingFee}
                  onChange={(shippingFee) =>
                    setOrderDraft({
                      ...orderDraft,
                      shippingFee: Number(shippingFee) || 0,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="联系人">
                <Input
                  placeholder="请输入收货联系人"
                  value={orderDraft.contactName}
                  onChange={(e) =>
                    setOrderDraft({
                      ...orderDraft,
                      contactName: e.target.value,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="联系电话">
                <Input
                  placeholder="请输入联系人电话"
                  value={orderDraft.contactPhone}
                  onChange={(e) =>
                    setOrderDraft({
                      ...orderDraft,
                      contactPhone: e.target.value,
                    })
                  }
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="收货地址">
              <Input
                placeholder="请输入详细收货地址"
                value={orderDraft.shippingAddress}
                onChange={(e) =>
                  setOrderDraft({
                    ...orderDraft,
                    shippingAddress: e.target.value,
                  })
                }
              />
            </ModalFormField>
            <ModalFormField label="备注">
              <Input.TextArea
                rows={2}
                placeholder="可填写客户要求、交付说明等备注"
                value={orderDraft.remark}
                onChange={(e) =>
                  setOrderDraft({ ...orderDraft, remark: e.target.value })
                }
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!shipmentDraft}
        width={860}
        className="sales-workflow-modal sales-shipment-modal"
        title={`销售出库 · ${shipmentDraft?.order.orderNo || ""}`}
        description="核对待出库商品与交付方式，提交后将扣减库存"
        okText="确认出库"
        confirmLoading={saving}
        onCancel={() => setShipmentDraft(null)}
        onOk={() => void saveShipment()}
      >
        {shipmentDraft && (
          <ModalForm>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 3 }}
              items={[
                {
                  key: "customer",
                  label: "客户",
                  children: shipmentDraft.order.customerName,
                },
                {
                  key: "warehouse",
                  label: "出库仓库",
                  children: shipmentDraft.order.warehouseName,
                },
                {
                  key: "quantity",
                  label: "本次出库",
                  children: (
                    <b className="text-primary">
                      {shipmentDraft.lines.reduce(
                        (sum, line) => sum + line.quantity,
                        0,
                      )}{" "}
                      件
                    </b>
                  ),
                },
              ]}
            />
            <div className="sales-content-block">
              <div className="sales-content-title">本次出库明细</div>
              <AppEditableTable
                rowKey="orderLineId"
                dataSource={shipmentDraft.lines}
                emptyText="暂无待出库商品"
                columns={[
                  { title: "商品/规格" },
                  { title: "订购", width: 80 },
                  { title: "已出库", width: 90 },
                  { title: "本次出库", width: 130 },
                ]}
                renderRow={(line, index) => {
                  const source = shipmentDraft.order.lines.find(
                    (x) => x.id === line.orderLineId,
                  )!;
                  return [
                    <div>
                      <div>{source.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {source.variantLabel}
                      </div>
                    </div>,
                    source.quantity,
                    source.shippedQuantity,
                    <InputNumber
                      className="w-full"
                      style={{ width: "100%" }}
                      variant="borderless"
                      size="small"
                      min={0}
                      max={line.max}
                      precision={0}
                      value={line.quantity}
                      onChange={(quantity) =>
                        setShipmentDraft({
                          ...shipmentDraft,
                          lines: shipmentDraft.lines.map((x, i) =>
                            i === index
                              ? { ...x, quantity: Number(quantity) || 0 }
                              : x,
                          ),
                        })
                      }
                    />,
                  ];
                }}
              />
            </div>
            <ModalFormField label="出库方式" required>
              <Select
                className="w-full"
                value={shipmentDraft.deliveryMethod}
                onChange={(deliveryMethod: "offline" | "logistics") => {
                  setShipmentDraft({
                    ...shipmentDraft,
                    deliveryMethod,
                    logisticsCompany:
                      deliveryMethod === "offline"
                        ? ""
                        : shipmentDraft.logisticsCompany,
                    trackingNo:
                      deliveryMethod === "offline"
                        ? ""
                        : shipmentDraft.trackingNo,
                  });
                }}
                options={[
                  { value: "offline", label: "线下自取" },
                  { value: "logistics", label: "物流发货" },
                ]}
              />
            </ModalFormField>
            {shipmentDraft.deliveryMethod === "logistics" && (
              <ModalFormGrid>
                <ModalFormField label="物流公司" required>
                  <Input
                    placeholder="请输入物流公司"
                    value={shipmentDraft.logisticsCompany}
                    onChange={(e) =>
                      setShipmentDraft({
                        ...shipmentDraft,
                        logisticsCompany: e.target.value,
                      })
                    }
                  />
                </ModalFormField>
                <ModalFormField label="物流单号" required>
                  <Input
                    placeholder="请输入物流单号"
                    value={shipmentDraft.trackingNo}
                    onChange={(e) =>
                      setShipmentDraft({
                        ...shipmentDraft,
                        trackingNo: e.target.value,
                      })
                    }
                  />
                </ModalFormField>
              </ModalFormGrid>
            )}
            <ModalFormField label="出库备注">
              <Input.TextArea
                rows={2}
                value={shipmentDraft.remark}
                onChange={(e) =>
                  setShipmentDraft({ ...shipmentDraft, remark: e.target.value })
                }
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!detail}
        width={900}
        className="sales-detail-modal"
        title={
          "totalAmount" in (detail || {})
            ? `销售订单 · ${(detail as SalesOrder).orderNo}`
            : `销售出库 · ${(detail as SalesShipment | null)?.shipmentNo || ""}`
        }
        description={
          detail && "totalAmount" in detail
            ? "查看订单信息、交付信息及商品明细"
            : "查看出库信息、物流信息及商品明细"
        }
        footer={null}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <div>
            {"totalAmount" in detail ? (
              <Descriptions
                bordered
                size="small"
                column={2}
                title={<span className="sales-content-title">订单信息</span>}
                items={[
                  {
                    key: "status",
                    label: "订单状态",
                    children: <SalesOrderStatusTag status={detail.status} />,
                  },
                  {
                    key: "customer",
                    label: "客户",
                    children: displayValue(detail.customerName),
                  },
                  {
                    key: "warehouse",
                    label: "出库仓库",
                    children: displayValue(detail.warehouseName),
                  },
                  {
                    key: "delivery",
                    label: "预计交付",
                    children: displayValue(detail.deliveryDate),
                  },
                  {
                    key: "total",
                    label: "订单金额",
                    children: (
                      <b className="text-primary">
                        {money(
                          detail.totalAmount,
                          detail.currency,
                          salesConfig.currencies,
                        )}
                      </b>
                    ),
                  },
                  {
                    key: "contact",
                    label: "联系人",
                    children: displayValue(detail.contactName),
                  },
                  {
                    key: "phone",
                    label: "联系电话",
                    children: displayValue(detail.contactPhone),
                  },
                  {
                    key: "address",
                    label: "收货地址",
                    span: 2,
                    children: displayValue(detail.shippingAddress),
                  },
                  {
                    key: "remark",
                    label: "备注",
                    span: 2,
                    children: displayValue(detail.remark),
                  },
                ]}
              />
            ) : (
              <Descriptions
                bordered
                size="small"
                column={2}
                title={<span className="sales-content-title">出库信息</span>}
                items={[
                  {
                    key: "status",
                    label: "出库状态",
                    children: <SalesOrderStatusTag status={detail.status} />,
                  },
                  {
                    key: "quantity",
                    label: "出库数量",
                    children: (
                      <b className="text-primary">
                        {detail.lines.reduce(
                          (sum, line) => sum + line.quantity,
                          0,
                        )}{" "}
                        件
                      </b>
                    ),
                  },
                  {
                    key: "customer",
                    label: "客户",
                    children: displayValue(detail.customerName),
                  },
                  {
                    key: "order",
                    label: "关联订单",
                    children: displayValue(detail.orderNo),
                  },
                  {
                    key: "warehouse",
                    label: "出库仓库",
                    children: displayValue(detail.warehouseName),
                  },
                  {
                    key: "time",
                    label: "出库时间",
                    children: new Date(detail.shippedAt).toLocaleString(
                      "zh-CN",
                    ),
                  },
                  {
                    key: "method",
                    label: "出库方式",
                    children:
                      detail.deliveryMethod === "logistics"
                        ? "物流发货"
                        : "线下自取",
                  },
                  {
                    key: "company",
                    label: "物流公司",
                    children:
                      detail.deliveryMethod === "logistics"
                        ? displayValue(detail.logisticsCompany)
                        : "-",
                  },
                  {
                    key: "tracking",
                    label: "物流单号",
                    span: 2,
                    children:
                      detail.deliveryMethod === "logistics"
                        ? displayValue(detail.trackingNo)
                        : "-",
                  },
                  {
                    key: "remark",
                    label: "备注",
                    span: 2,
                    children: displayValue(detail.remark),
                  },
                ]}
              />
            )}

            <Table<SalesOrderLine | SalesShipmentLine>
              size="middle"
              rowKey="id"
              pagination={false}
              dataSource={detail.lines}
              scroll={{ x: "totalAmount" in detail ? 1000 : 690 }}
              title={() => (
                <span className="sales-content-title">商品明细</span>
              )}
              columns={[
                {
                  title: "商品",
                  dataIndex: "productName",
                  width: 280,
                  ellipsis: true,
                  render: displayValue,
                },
                {
                  title: "规格",
                  dataIndex: "variantLabel",
                  width: 240,
                  ellipsis: true,
                  render: displayValue,
                },
                {
                  title: "数量",
                  width: 170,
                  align: "right",
                  render: (_, row) =>
                    "shippedQuantity" in row
                      ? `${row.quantity}（已出 ${row.shippedQuantity}）`
                      : row.quantity,
                },
                ...("totalAmount" in detail
                  ? [
                      {
                        title: "单价",
                        dataIndex: "unitPrice",
                        width: 150,
                        align: "right" as const,
                        render: (value: number) =>
                          money(value, detail.currency, salesConfig.currencies),
                      },
                      {
                        title: "金额",
                        dataIndex: "amount",
                        width: 160,
                        align: "right" as const,
                        render: (value: number) =>
                          money(value, detail.currency, salesConfig.currencies),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        )}
      </AppModal>
      <AppModal
        open={!!pendingOrderAction}
        width={440}
        title={
          pendingOrderAction?.type === "delete"
            ? "删除销售订单"
            : "取消销售订单"
        }
        okText={pendingOrderAction?.type === "delete" ? "确认删除" : "确认取消"}
        cancelText="暂不操作"
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
        onCancel={() => setPendingOrderAction(null)}
        onOk={() => void submitOrderAction()}
      >
        {pendingOrderAction && (
          <div className="py-3 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="app-confirm-message text-sm leading-relaxed text-muted-foreground">
              {pendingOrderAction.type === "delete" ? (
                <>
                  确定要删除销售订单{" "}
                  <strong className="text-foreground">
                    {pendingOrderAction.order.orderNo}
                  </strong>{" "}
                  吗？删除后无法恢复。
                </>
              ) : (
                <>
                  确定要取消销售订单{" "}
                  <strong className="text-foreground">
                    {pendingOrderAction.order.orderNo}
                  </strong>{" "}
                  吗？未出库商品的库存预占将被释放。
                </>
              )}
            </p>
          </div>
        )}
      </AppModal>
    </PageContent>
  );
};

export default SalesPage;
