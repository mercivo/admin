import React, { useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  message,
  Select,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import {
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
  inventoryApi,
  productApi,
  purchaseApi,
  workspaceApi,
  type PurchaseOrder,
  type PurchaseOrderInput,
  type PurchaseOrderLine,
  type PurchaseReceipt,
  type PurchaseReceiptLine,
  type Supplier,
  type SupplierInput,
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
  TableActionButton,
  TableActions,
  TableAddRowButton,
  WarehouseSelectOption,
  createActionColumn,
} from "../../components/shared";
import { useTablePagination } from "../../hooks/useTablePagination";
import { can } from "../../utils/permissions";

type OrderDraft = PurchaseOrderInput & { id?: string };
type ReceiptDraft = {
  order: PurchaseOrder;
  remark: string;
  lines: Array<{ orderLineId: string; quantity: number; max: number }>;
};
const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50";
const blankSupplier = (): SupplierInput => ({
  name: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
  remark: "",
});
const blankOrder = (currency: string): OrderDraft => ({
  supplierId: "",
  warehouseId: "",
  currency,
  taxAmount: 0,
  shippingFee: 0,
  expectedDate: undefined,
  remark: "",
  lines: [{ productId: "", variantKey: "BASE", quantity: 1, unitPrice: 0 }],
});
const orderStatus: Record<string, { color: string; label: string }> = {
  draft: { color: "default", label: "草稿" },
  confirmed: { color: "blue", label: "待入库" },
  partially_received: { color: "orange", label: "部分入库" },
  completed: { color: "green", label: "已完成" },
  cancelled: { color: "red", label: "已取消" },
  received: { color: "green", label: "已入库" },
};
const Status = ({ value }: { value: string }) => (
  <Tag color={orderStatus[value]?.color}>
    {orderStatus[value]?.label || value}
  </Tag>
);
const money = (
  value: number,
  currency = "CNY",
  currencies: CurrencyOption[] = DEFAULT_SALES_CONFIG.currencies,
) =>
  `${currencies.find((item) => item.code === currency)?.symbol || currency} ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
const displayValue = (value?: React.ReactNode) =>
  value === null || value === undefined || value === "" ? "-" : value;

const PurchasePage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedModule, setLoadedModule] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [config, setConfig] = useState<SalesConfig>(DEFAULT_SALES_CONFIG);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<
    (SupplierInput & { id?: string }) | null
  >(null);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);
  const [detail, setDetail] = useState<PurchaseOrder | PurchaseReceipt | null>(
    null,
  );
  const pagination = useTablePagination();
  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword,
        status,
      };
      if (module === "receipts") {
        const result = await purchaseApi.receipts(params);
        setReceipts(result.items);
        pagination.reconcile(result.total);
      } else if (module === "suppliers") {
        const result = await purchaseApi.suppliers(params);
        setSuppliers(result.items);
        pagination.reconcile(result.total);
      } else {
        const result = await purchaseApi.orders(params);
        setOrders(result.items);
        pagination.reconcile(result.total);
      }
    } catch {
      message.error("采购数据加载失败");
    } finally {
      setLoadedModule(module);
      setLoading(false);
    }
  };
  useEffect(() => {
    workspaceApi
      .getConfig<Partial<SalesConfig>>("currency")
      .then((value) =>
        setConfig({
          ...DEFAULT_SALES_CONFIG,
          ...value,
          currencies: value.currencies?.length
            ? value.currencies
            : DEFAULT_SALES_CONFIG.currencies,
        }),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [module, pagination.current, pagination.pageSize, keyword, status]);
  useEffect(() => {
    pagination.reset();
    setStatus(undefined);
  }, [module]);
  const loadOptions = async () => {
    const [supplierRows, warehouseRows, productRows] = await Promise.all([
      purchaseApi.supplierOptions(),
      inventoryApi.warehouseOptions(),
      productApi.options(),
    ]);
    setSuppliers(supplierRows);
    setWarehouses(warehouseRows);
    setProducts(productRows);
  };
  const productOptions = useMemo(
    () =>
      products.flatMap((product) =>
        product.variants?.length
          ? product.variants.map((variant) => ({
              value: `${product.id}:${variant.id}`,
              label: `${product.nameZh} · ${variant.specification}: ${variant.option} (${product.sku})`,
              product,
              variantKey: variant.id || "BASE",
            }))
          : [
              {
                value: `${product.id}:BASE`,
                label: `${product.nameZh} (${product.sku})`,
                product,
                variantKey: "BASE",
              },
            ],
      ),
    [products],
  );
  const amount =
    orderDraft?.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    ) || 0;
  const total =
    amount +
    Number(orderDraft?.taxAmount || 0) +
    Number(orderDraft?.shippingFee || 0);
  const openOrder = async () => {
    try {
      await loadOptions();
      setOrderDraft(
        blankOrder(config.purchaseDefaultCurrency || config.defaultCurrency),
      );
    } catch {
      message.error("采购选项加载失败");
    }
  };
  const saveOrder = async () => {
    if (
      !orderDraft?.supplierId ||
      !orderDraft.warehouseId ||
      !orderDraft.lines.length ||
      orderDraft.lines.some((line) => !line.productId || line.quantity < 1)
    )
      return void message.warning("请完整填写供应商、入库仓库和商品明细");
    setSaving(true);
    try {
      await purchaseApi.createOrder(orderDraft);
      message.success("采购订单已创建并计入在途库存");
      setOrderDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  };
  const saveSupplier = async () => {
    if (!supplierDraft?.name.trim())
      return void message.warning("请输入供应商名称");
    setSaving(true);
    try {
      supplierDraft.id
        ? await purchaseApi.updateSupplier(supplierDraft.id, supplierDraft)
        : await purchaseApi.createSupplier(supplierDraft);
      message.success(supplierDraft.id ? "供应商已更新" : "供应商已创建");
      setSupplierDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  };
  const act = async (label: string, fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      message.success(label);
      await load();
    } finally {
      setSaving(false);
    }
  };
  const startReceipt = (order: PurchaseOrder) =>
    setReceiptDraft({
      order,
      remark: "",
      lines: order.lines
        .filter((line) => line.quantity > line.receivedQuantity)
        .map((line) => ({
          orderLineId: line.id,
          quantity: line.quantity - line.receivedQuantity,
          max: line.quantity - line.receivedQuantity,
        })),
    });
  const saveReceipt = async () => {
    if (
      !receiptDraft ||
      !receiptDraft.lines.length ||
      receiptDraft.lines.some(
        (line) => line.quantity < 1 || line.quantity > line.max,
      )
    )
      return void message.warning("请填写有效的入库数量");
    setSaving(true);
    try {
      await purchaseApi.createReceipt({
        orderId: receiptDraft.order.id,
        remark: receiptDraft.remark,
        lines: receiptDraft.lines.map(({ orderLineId, quantity }) => ({
          orderLineId,
          quantity,
        })),
      });
      message.success("采购入库完成，库存已更新");
      setReceiptDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  };
  const title =
    module === "receipts"
      ? "采购入库"
      : module === "suppliers"
        ? "供应商管理"
        : "采购订单";
  const description =
    module === "receipts"
      ? "按采购订单分批收货，自动更新在途与现存库存"
      : module === "suppliers"
        ? "维护供应商档案与联系方式"
        : "管理采购需求、确认在途数量并跟踪到货进度";
  const statusOptions =
    module === "orders"
      ? [
          { value: "confirmed", label: "待入库" },
          { value: "partially_received", label: "部分入库" },
          { value: "completed", label: "已完成" },
          { value: "cancelled", label: "已取消" },
        ]
      : module === "suppliers"
        ? [
            { value: "active", label: "启用" },
            { value: "disabled", label: "停用" },
          ]
        : [];
  const baseColumns =
    module === "suppliers"
      ? [
          { title: "供应商名称", dataIndex: "name", width: 180 },
          {
            title: "联系人",
            dataIndex: "contact",
            width: 110,
            render: (v: string) => v || "-",
          },
          {
            title: "联系电话",
            dataIndex: "phone",
            width: 140,
            render: (v: string) => v || "-",
          },
          {
            title: "邮箱",
            dataIndex: "email",
            width: 190,
            render: (v: string) => v || "-",
          },
          {
            title: "地址",
            dataIndex: "address",
            width: 220,
            ellipsis: true,
            render: (v: string) => v || "-",
          },
          {
            title: "状态",
            width: 90,
            render: (_: unknown, row: Supplier) => (
              <Tag color={row.status === "active" ? "green" : "default"}>
                {row.status === "active" ? "启用" : "停用"}
              </Tag>
            ),
          },
          {
            title: "备注",
            dataIndex: "remark",
            width: 180,
            ellipsis: true,
            render: (v: string) => v || "-",
          },
          createActionColumn<Supplier>({
            actions: 2,
            render: (_: unknown, row: Supplier) => (
              <TableActions>
                {can("purchase.supplier.edit") && (
                  <TableActionButton
                    title="编辑"
                    onClick={() =>
                      setSupplierDraft({
                        id: row.id,
                        name: row.name,
                        contact: row.contact,
                        phone: row.phone,
                        email: row.email,
                        address: row.address,
                        status: row.status,
                        remark: row.remark,
                      })
                    }
                  >
                    <Edit3 size={15} />
                  </TableActionButton>
                )}
                {can("purchase.supplier.delete") && (
                  <TableActionButton
                    title="删除"
                    tone="danger"
                    onClick={() =>
                      AppModal.confirm({
                        title: "删除供应商",
                        content: `确认删除供应商“${row.name}”吗？`,
                        okText: "删除",
                        okButtonProps: { danger: true },
                        onOk: () =>
                          act("供应商已删除", () =>
                            purchaseApi.removeSupplier(row.id),
                          ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </TableActionButton>
                )}
              </TableActions>
            ),
          }),
        ]
      : module === "receipts"
        ? [
            {
              title: "入库单号",
              dataIndex: "receiptNo",
              width: 185,
              render: (v: string) => (
                <span className="font-mono text-xs">{v}</span>
              ),
            },
            {
              title: "采购订单",
              dataIndex: "orderNo",
              width: 185,
              render: (v: string) => (
                <span className="font-mono text-xs">{v}</span>
              ),
            },
            { title: "供应商", dataIndex: "supplierName", width: 160 },
            { title: "入库仓库", dataIndex: "warehouseName", width: 130 },
            {
              title: "入库数量",
              width: 100,
              render: (_: unknown, row: PurchaseReceipt) =>
                row.lines.reduce((sum, line) => sum + line.quantity, 0),
            },
            {
              title: "状态",
              width: 90,
              render: () => <Status value="received" />,
            },
            {
              title: "入库时间",
              dataIndex: "receivedAt",
              width: 170,
              render: (v: string) => new Date(v).toLocaleString("zh-CN"),
            },
            createActionColumn<PurchaseReceipt>({
              render: (_: unknown, row: PurchaseReceipt) => (
                <TableActions>
                  <TableActionButton
                    title="查看入库明细"
                    onClick={() => setDetail(row)}
                  >
                    <Eye size={15} />
                  </TableActionButton>
                </TableActions>
              ),
            }),
          ]
        : [
            {
              title: "采购单号",
              dataIndex: "orderNo",
              width: 185,
              render: (v: string) => (
                <span className="font-mono text-xs">{v}</span>
              ),
            },
            { title: "供应商", dataIndex: "supplierName", width: 160 },
            { title: "入库仓库", dataIndex: "warehouseName", width: 130 },
            {
              title: "商品/数量",
              width: 120,
              render: (_: unknown, row: PurchaseOrder) =>
                `${row.lines.length} 种 / ${row.lines.reduce((sum, line) => sum + line.quantity, 0)} 件`,
            },
            {
              title: "订单金额",
              dataIndex: "totalAmount",
              width: 125,
              render: (v: number, row: PurchaseOrder) =>
                money(v, row.currency, config.currencies),
            },
            {
              title: "预计到货",
              dataIndex: "expectedDate",
              width: 115,
              render: (v: string) => v || "-",
            },
            {
              title: "状态",
              width: 100,
              render: (_: unknown, row: PurchaseOrder) => (
                <Status value={row.status} />
              ),
            },
            createActionColumn<PurchaseOrder>({
              actions: 4,
              render: (_: unknown, row: PurchaseOrder) => (
                <TableActions>
                  <TableActionButton
                    title="查看"
                    onClick={() => setDetail(row)}
                  >
                    <Eye size={15} />
                  </TableActionButton>
                  {["confirmed", "partially_received"].includes(row.status) &&
                    can("purchase.receipt.create") && (
                      <TableActionButton
                        title="采购入库"
                        tone="success"
                        onClick={() => startReceipt(row)}
                      >
                        <PackageCheck size={15} />
                      </TableActionButton>
                    )}
                  {["confirmed", "partially_received"].includes(
                    row.status,
                  ) &&
                    can("purchase.order.cancel") && (
                      <TableActionButton
                        title="取消订单"
                        tone="danger"
                        onClick={() =>
                          AppModal.confirm({
                            title: "取消采购订单",
                            content:
                              "确认取消订单吗？尚未入库的在途数量将被释放。",
                            okText: "取消订单",
                            okButtonProps: { danger: true },
                            onOk: () =>
                              act("采购订单已取消", () =>
                                purchaseApi.cancelOrder(row.id),
                              ),
                          })
                        }
                      >
                        <XCircle size={15} />
                      </TableActionButton>
                    )}
                  {row.status === "cancelled" &&
                    can("purchase.order.cancel") && (
                      <TableActionButton
                        title="删除订单"
                        tone="danger"
                        onClick={() =>
                          AppModal.confirm({
                            title: "删除采购订单",
                            content: "删除后不可恢复。",
                            okText: "删除",
                            okButtonProps: { danger: true },
                            onOk: () =>
                              act("采购订单已删除", () =>
                                purchaseApi.removeOrder(row.id),
                              ),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </TableActionButton>
                    )}
                </TableActions>
              ),
            }),
          ];
  return (
    <PageContent>
      <PageHeader
        title={title}
        description={description}
        action={
          module === "orders" && can("purchase.order.create") ? (
            <button className={primaryButton} onClick={() => void openOrder()}>
              <Plus size={16} />
              新建采购订单
            </button>
          ) : module === "suppliers" && can("purchase.supplier.create") ? (
            <button
              className={primaryButton}
              onClick={() => setSupplierDraft(blankSupplier())}
            >
              <Plus size={16} />
              新建供应商
            </button>
          ) : undefined
        }
      />
      {loadedModule !== module ? <AdminPageSkeleton variant="table" /> : <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            allowClear
            prefix={<Search size={15} />}
            placeholder={`搜索${title}`}
            className="max-w-xs"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {statusOptions.length > 0 && (
            <Select
              allowClear
              placeholder="全部状态"
              className="w-40"
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          )}
        </div>
        <AppTable<Record<string, unknown>>
          key={module}
          rowKey="id"
          loading={loading}
          dataSource={
            (module === "suppliers"
              ? suppliers
              : module === "receipts"
                ? receipts
                : orders) as unknown as Record<string, unknown>[]
          }
          scroll={{ x: 1100 }}
          pagination={pagination.config}
          columns={baseColumns as never}
        />
      </section>}
      <AppModal
        open={!!orderDraft}
        width={980}
        className="sales-workflow-modal"
        title="新建采购订单"
        description="填写订单与到货信息，提交后商品数量将自动计入在途库存"
        okText="创建并计入在途库存"
        confirmLoading={saving}
        footerLeft={
          orderDraft ? (
            <span className="text-sm text-muted-foreground">
              采购合计{" "}
              <b className="ml-1 text-base text-primary">
                {money(total, orderDraft.currency, config.currencies)}
              </b>
            </span>
          ) : null
        }
        onCancel={() => setOrderDraft(null)}
        onOk={() => void saveOrder()}
      >
        {orderDraft && (
          <ModalForm>
            <ModalFormGrid>
              <ModalFormField label="供应商" required>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择供应商"
                  value={orderDraft.supplierId || undefined}
                  onChange={(supplierId) =>
                    setOrderDraft({ ...orderDraft, supplierId })
                  }
                  options={suppliers.map((row) => ({
                    value: row.id,
                    label: row.name,
                  }))}
                />
              </ModalFormField>
              <ModalFormField label="入库仓库" required>
                <Select
                  placeholder="请选择仓库"
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
              <ModalFormField label="预计到货">
                <DatePicker
                  className="w-full"
                  value={
                    orderDraft.expectedDate
                      ? dayjs(orderDraft.expectedDate)
                      : null
                  }
                  onChange={(value) =>
                    setOrderDraft({
                      ...orderDraft,
                      expectedDate: value?.format("YYYY-MM-DD"),
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="币种">
                <Select
                  value={orderDraft.currency}
                  onChange={(currency) =>
                    setOrderDraft({ ...orderDraft, currency })
                  }
                  options={config.currencies
                    .filter((item) => item.enabled)
                    .map((item) => ({
                      value: item.code,
                      label: `${item.name}（${item.code}）`,
                    }))}
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="商品明细" required>
              <AppEditableTable
                className="purchase-order-lines-table"
                rowKey={(_, index) => index}
                dataSource={orderDraft.lines}
                emptyText="暂无商品明细，请添加商品"
                columns={[
                  { title: "商品/规格" },
                  { title: "数量", width: 110 },
                  { title: "采购单价", width: 140 },
                  { title: "金额", width: 120 },
                  { title: "", width: 56 },
                ]}
                renderRow={(line, index) => [
                  <Select
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                    popupMatchSelectWidth={false}
                    popupClassName="product-spec-dropdown"
                    dropdownStyle={{ minWidth: 520, maxWidth: 'calc(100vw - 32px)' }}
                    optionRender={(option) => <span title={String(option.label)}>{option.label}</span>}
                    variant="borderless"
                    size="small"
                    placeholder="请选择商品"
                    value={
                      line.productId
                        ? `${line.productId}:${line.variantKey}`
                        : undefined
                    }
                    options={productOptions}
                    onChange={(value) => {
                      const option = productOptions.find(
                        (item) => item.value === value,
                      );
                      if (option)
                        setOrderDraft({
                          ...orderDraft,
                          lines: orderDraft.lines.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  productId: String(option.product.id),
                                  variantKey: option.variantKey,
                                }
                              : row,
                          ),
                        });
                    }}
                  />,
                  <InputNumber
                    className="w-full"
                    variant="borderless"
                    size="small"
                    min={1}
                    precision={0}
                    value={line.quantity}
                    onChange={(quantity) =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.map((row, i) =>
                          i === index
                            ? { ...row, quantity: Number(quantity) || 1 }
                            : row,
                        ),
                      })
                    }
                  />,
                  <InputNumber
                    className="w-full"
                    variant="borderless"
                    size="small"
                    min={0}
                    precision={2}
                    value={line.unitPrice}
                    onChange={(unitPrice) =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.map((row, i) =>
                          i === index
                            ? { ...row, unitPrice: Number(unitPrice) || 0 }
                            : row,
                        ),
                      })
                    }
                  />,
                  money(
                    line.quantity * line.unitPrice,
                    orderDraft.currency,
                    config.currencies,
                  ),
                  <TableActionButton
                    title="删除明细"
                    tone="danger"
                    disabled={orderDraft.lines.length === 1}
                    onClick={() =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </TableActionButton>,
                ]}
              />
              <TableAddRowButton
                onClick={() =>
                  setOrderDraft({
                    ...orderDraft,
                    lines: [
                      ...orderDraft.lines,
                      {
                        productId: "",
                        variantKey: "BASE",
                        quantity: 1,
                        unitPrice: 0,
                      },
                    ],
                  })
                }
              >
                添加商品
              </TableAddRowButton>
            </ModalFormField>
            <ModalFormGrid>
              <ModalFormField label="税额">
                <InputNumber
                  className="w-full"
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  value={orderDraft.taxAmount}
                  onChange={(taxAmount) =>
                    setOrderDraft({
                      ...orderDraft,
                      taxAmount: Number(taxAmount) || 0,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="运费">
                <InputNumber
                  className="w-full"
                  style={{ width: "100%" }}
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
            </ModalFormGrid>
            <ModalFormField label="备注">
              <Input.TextArea
                rows={2}
                value={orderDraft.remark}
                onChange={(event) =>
                  setOrderDraft({ ...orderDraft, remark: event.target.value })
                }
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!supplierDraft}
        width={720}
        title={supplierDraft?.id ? "编辑供应商" : "新建供应商"}
        okText="保存"
        confirmLoading={saving}
        onCancel={() => setSupplierDraft(null)}
        onOk={() => void saveSupplier()}
      >
        {supplierDraft && (
          <ModalForm>
            <ModalFormGrid>
              <ModalFormField label="供应商名称" required>
                <Input
                  value={supplierDraft.name}
                  placeholder="供应商名称"
                  variant="filled"
                  size="middle"
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      name: event.target.value,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="联系人">
                <Input
                  value={supplierDraft.contact}
                  placeholder="联系人"
                  variant="filled"
                  size="middle"
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      contact: event.target.value,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="联系电话">
                <Input
                  value={supplierDraft.phone}
                  placeholder="联系电话"
                  variant="filled"
                  size="middle"
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      phone: event.target.value,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="邮箱">
                <Input
                  value={supplierDraft.email}
                  placeholder="邮箱"
                  variant="filled"
                  size="middle"
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      email: event.target.value,
                    })
                  }
                />
              </ModalFormField>
              <ModalFormField label="状态">
                <Select
                  value={supplierDraft.status}
                  placeholder="状态"
                  variant="filled"
                  size="middle"
                  onChange={(statusValue) =>
                    setSupplierDraft({ ...supplierDraft, status: statusValue })
                  }
                  options={[
                    { value: "active", label: "启用" },
                    { value: "disabled", label: "停用" },
                  ]}
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="地址">
              <Input
                value={supplierDraft.address}
                placeholder="地址"
                variant="filled"
                size="middle"
                onChange={(event) =>
                  setSupplierDraft({
                    ...supplierDraft,
                    address: event.target.value,
                  })
                }
              />
            </ModalFormField>
            <ModalFormField label="备注">
              <Input.TextArea
                rows={2}
                value={supplierDraft.remark}
                placeholder="备注"
                variant="filled"
                onChange={(event) =>
                  setSupplierDraft({
                    ...supplierDraft,
                    remark: event.target.value,
                  })
                }
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!receiptDraft}
        width={860}
        className="sales-workflow-modal sales-shipment-modal"
        title={`采购入库 · ${receiptDraft?.order.orderNo || ""}`}
        description="核对待入库商品与入库仓库，提交后将增加现存库存"
        okText="确认入库"
        confirmLoading={saving}
        onCancel={() => setReceiptDraft(null)}
        onOk={() => void saveReceipt()}
      >
        {receiptDraft && (
          <ModalForm>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 3 }}
              items={[
                { key: "supplier", label: "供应商", children: receiptDraft.order.supplierName },
                { key: "warehouse", label: "入库仓库", children: receiptDraft.order.warehouseName },
                {
                  key: "quantity",
                  label: "本次入库",
                  children: <b className="text-primary">{receiptDraft.lines.reduce((sum, line) => sum + line.quantity, 0)} 件</b>,
                },
              ]}
            />
            <div className="sales-content-block">
              <div className="sales-content-title">本次入库明细</div>
              <AppEditableTable
                rowKey="orderLineId"
                dataSource={receiptDraft.lines}
                emptyText="暂无待入库商品"
                columns={[
                  { title: "商品/规格" },
                  { title: "订购", width: 80 },
                  { title: "已入库", width: 90 },
                  { title: "本次入库", width: 130 },
                ]}
                renderRow={(line, index) => {
                  const source = receiptDraft.order.lines.find((row) => row.id === line.orderLineId)!;
                  return [
                    <div><div>{source.productName}</div><div className="text-xs text-muted-foreground">{displayValue(source.variantLabel)}</div></div>,
                    source.quantity,
                    source.receivedQuantity,
                    <InputNumber
                      className="w-full"
                      style={{ width: "100%" }}
                      variant="borderless"
                      size="small"
                      min={1}
                      max={line.max}
                      precision={0}
                      value={line.quantity}
                      onChange={(quantity) =>
                        setReceiptDraft({
                          ...receiptDraft,
                          lines: receiptDraft.lines.map((row, i) =>
                            i === index ? { ...row, quantity: Number(quantity) || 1 } : row,
                          ),
                        })
                      }
                    />,
                  ];
                }}
              />
            </div>
            <ModalFormField label="入库备注">
              <Input.TextArea
                rows={2}
                value={receiptDraft.remark}
                onChange={(event) =>
                  setReceiptDraft({
                    ...receiptDraft,
                    remark: event.target.value,
                  })
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
            ? `采购订单 · ${(detail as PurchaseOrder).orderNo}`
            : `采购入库 · ${(detail as PurchaseReceipt | null)?.receiptNo || ""}`
        }
        description={
          detail && "totalAmount" in detail
            ? "查看订单信息、到货信息及商品明细"
            : "查看入库信息、关联订单及商品明细"
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
                  { key: "status", label: "订单状态", children: <Status value={detail.status} /> },
                  { key: "supplier", label: "供应商", children: displayValue(detail.supplierName) },
                  { key: "warehouse", label: "入库仓库", children: displayValue(detail.warehouseName) },
                  { key: "expected", label: "预计到货", children: displayValue(detail.expectedDate) },
                  { key: "total", label: "订单金额", children: <b className="text-primary">{money(detail.totalAmount, detail.currency, config.currencies)}</b> },
                  { key: "confirmed", label: "确认时间", children: detail.confirmedAt ? new Date(detail.confirmedAt).toLocaleString("zh-CN") : "-" },
                  { key: "remark", label: "备注", span: 2, children: displayValue(detail.remark) },
                ]}
              />
            ) : (
              <Descriptions
                bordered
                size="small"
                column={2}
                title={<span className="sales-content-title">入库信息</span>}
                items={[
                  { key: "status", label: "入库状态", children: <Status value={detail.status} /> },
                  { key: "quantity", label: "入库数量", children: <b className="text-primary">{detail.lines.reduce((sum, line) => sum + line.quantity, 0)} 件</b> },
                  { key: "supplier", label: "供应商", children: displayValue(detail.supplierName) },
                  { key: "order", label: "关联订单", children: displayValue(detail.orderNo) },
                  { key: "warehouse", label: "入库仓库", children: displayValue(detail.warehouseName) },
                  { key: "time", label: "入库时间", children: new Date(detail.receivedAt).toLocaleString("zh-CN") },
                  { key: "remark", label: "备注", span: 2, children: displayValue(detail.remark) },
                ]}
              />
            )}
            <Table<PurchaseOrderLine | PurchaseReceiptLine>
              size="middle"
              rowKey="id"
            pagination={false}
              dataSource={detail.lines}
              scroll={{ x: 680, y: 320 }}
              title={() => <span className="sales-content-title">商品明细</span>}
            columns={[
                { title: "商品", dataIndex: "productName", render: displayValue },
                { title: "规格", dataIndex: "variantLabel", render: displayValue },
                {
                  title: "数量",
                  render: (_, row) =>
                    "receivedQuantity" in row
                      ? `${row.quantity}（已入 ${row.receivedQuantity}）`
                      : row.quantity,
                },
                ...("totalAmount" in detail
                  ? [
                      { title: "单价", dataIndex: "unitPrice", render: (value: number) => money(value, detail.currency, config.currencies) },
                      { title: "金额", dataIndex: "amount", render: (value: number) => money(value, detail.currency, config.currencies) },
                    ]
                  : []),
            ]}
            />
          </div>
        )}
      </AppModal>
    </PageContent>
  );
};
export default PurchasePage;
