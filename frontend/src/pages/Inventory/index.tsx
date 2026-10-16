import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Select,
  Table,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  LockKeyhole,
  PackageCheck,
  Pencil,
  Plus,
  ScrollText,
  Star,
  Trash2,
  XCircle,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AppEditableTable,
  AppModal,
  AppTable,
  createActionColumn,
  InventoryStatusBadge,
  ModalForm,
  ModalFormField,
  ModalFormGrid,
  PageContent,
  PageHeader,
  QuotaUsage,
  TableActionButton,
  TableActions,
} from "../../components/shared";
import { inventoryApi, workspaceApi } from "../../services/api/index";
import type {
  InventoryLedgerEntry,
  InventoryStock,
  StockCount,
  StockTransfer,
  Warehouse,
} from "../../services/api/index";
import { can } from "../../utils/permissions";
import { useTablePagination } from "../../hooks/useTablePagination";

const ledgerTypeOptions: Array<{
  value: InventoryLedgerEntry["type"];
  label: string;
}> = [
  { value: "opening", label: "期初库存" },
  { value: "count_adjust", label: "盘点调整" },
  { value: "transfer_out", label: "调拨出库" },
  { value: "transfer_in", label: "调拨入库" },
  { value: "purchase_in", label: "采购入库" },
  { value: "sales_out", label: "销售出库" },
];
const ledgerTypeLabels = Object.fromEntries(
  ledgerTypeOptions.map((item) => [item.value, item.label]),
);

type ModuleId = "stocks" | "counts" | "transfers" | "warehouses";
type WarehouseDraft = Pick<
  Warehouse,
  "name" | "contact" | "phone" | "address" | "status"
> & { id?: string };
type LedgerFilters = {
  keyword: string;
  warehouseId?: string;
  type?: string;
  startDate: string;
  endDate: string;
  productId?: string;
  variantKey?: string;
};
type TransferDraft = {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  remark: string;
  lines: Array<{ productId: string; variantKey: string; quantity: number }>;
};
const modules = new Set<ModuleId>([
  "stocks",
  "counts",
  "transfers",
  "warehouses",
]);
const emptyWarehouse: WarehouseDraft = {
  name: "",
  contact: "",
  phone: "",
  address: "",
  status: "active",
};
const emptyLedgerFilters: LedgerFilters = {
  keyword: "",
  startDate: "",
  endDate: "",
};
const emptyTransfer: TransferDraft = {
  sourceWarehouseId: "",
  destinationWarehouseId: "",
  remark: "",
  lines: [{ productId: "", variantKey: "BASE", quantity: 1 }],
};
const card =
  "overflow-hidden rounded-2xl border border-border bg-card shadow-sm";
const primaryButton =
  "inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

const InventoryPage: React.FC = () => {
  const { module: rawModule } = useParams<{ module: string }>();
  const navigate = useNavigate();
  const module = rawModule as ModuleId;
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseRows, setWarehouseRows] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [stockRows, setStockRows] = useState<InventoryStock[]>([]);
  const [summary, setSummary] = useState({
    onHand: 0,
    available: 0,
    inTransit: 0,
    warningItems: 0,
    warehouses: [] as Array<{ warehouseId: string; warehouseName: string; onHand: number; available: number; inTransit: number; warningItems: number }>,
    warningEnabled: true,
    warningThreshold: 10,
  });
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [keyword, setKeyword] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [warehouseDraft, setWarehouseDraft] = useState<WarehouseDraft | null>(
    null,
  );
  const [countDraft, setCountDraft] = useState<{
    warehouseId: string;
    remark: string;
  } | null>(null);
  const [editingCount, setEditingCount] = useState<StockCount | null>(null);
  const [transferDraft, setTransferDraft] = useState<TransferDraft | null>(
    null,
  );
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>([]);
  const [ledgerFilters, setLedgerFilters] =
    useState<LedgerFilters>(emptyLedgerFilters);
  const [ledgerStock, setLedgerStock] = useState<InventoryStock | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const [ledgerSummary, setLedgerSummary] = useState({
    inbound: 0,
    outbound: 0,
  });
  const ledgerRequestRef = useRef(0);
  const ledgerKeywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [warehouseLimit, setWarehouseLimit] = useState<number | null>(null);
  const pagination = useTablePagination();

  const loadList = async () => {
    setLoading(true);
    try {
      if (module === "stocks") {
        const result = await inventoryApi.stocks({ page: pagination.current, pageSize: pagination.pageSize, keyword: keyword || undefined, warehouseId: warehouseFilter, status: statusFilter });
        setStockRows(result.items); setSummary(result.summary); pagination.reconcile(result.total);
      } else if (module === "counts" && can("page.inventory.counts")) {
        const result = await inventoryApi.counts({ page: pagination.current, pageSize: pagination.pageSize });
        setCounts(result.items); pagination.reconcile(result.total);
      } else if (module === "transfers" && can("page.inventory.transfers")) {
        const result = await inventoryApi.transfers({ page: pagination.current, pageSize: pagination.pageSize });
        setTransfers(result.items); pagination.reconcile(result.total);
      } else if (module === "warehouses") {
        const result = await inventoryApi.warehouses({ page: pagination.current, pageSize: pagination.pageSize, keyword: keyword || undefined, status: statusFilter });
        setWarehouseRows(result.items); pagination.reconcile(result.total);
      }
    } catch {
      message.error("库存数据加载失败");
    } finally {
      setLoading(false);
    }
  };
  const loadWarehouseOptions = async () => setWarehouses(await inventoryApi.warehouseOptions());
  const loadStockOptions = async () => setStocks(await inventoryApi.stockOptions());
  useEffect(() => {
    if (module === "warehouses") void workspaceApi.getSettings().then(workspace => setWarehouseLimit(workspace.billing.limits.warehouses)).catch(() => setWarehouseLimit(null));
  }, [module]);
  useEffect(() => {
    if (module === "stocks") void loadWarehouseOptions().catch(() => message.error("仓库选项加载失败"));
  }, [module]);
  useEffect(() => { const timer = window.setTimeout(() => void loadList(), 250); return () => window.clearTimeout(timer); }, [module, pagination.current, pagination.pageSize, keyword, warehouseFilter, statusFilter]);
  useEffect(() => { pagination.reset(); }, [module, keyword, warehouseFilter, statusFilter]);
  useEffect(
    () => () => {
      if (ledgerKeywordTimerRef.current)
        clearTimeout(ledgerKeywordTimerRef.current);
    },
    [],
  );

  const stockOptions = useMemo(
    () =>
      stocks
        .filter(
          (item) =>
            !transferDraft?.sourceWarehouseId ||
            item.warehouseId === transferDraft.sourceWarehouseId,
        )
        .map((item) => ({
          value: `${item.productId}:${item.variantKey}`,
          label: `${item.productName} · ${item.variantLabel}（可用 ${item.available}）`,
          stock: item,
        })),
    [stocks, transferDraft?.sourceWarehouseId],
  );
  const stockMap = useMemo(
    () =>
      new Map(
        stocks.map((item) => [`${item.productId}:${item.variantKey}`, item]),
      ),
    [stocks],
  );
  const warehouseQuotaReached =
    warehouseLimit !== null && (module === "warehouses" ? pagination.total : warehouses.length) >= warehouseLimit;
  if (!modules.has(module)) return <Navigate to="/inventory/stocks" replace />;

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await action();
      message.success(success);
      await loadList();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };
  const confirmAction = (
    title: string,
    content: string,
    action: () => Promise<unknown>,
    success: string,
    danger = false,
  ) =>
    AppModal.confirm({
      title,
      content,
      okText: "确认",
      okButtonProps: { danger },
      onOk: async () => {
        await mutate(action, success);
      },
    });
  const queryLedger = async (filters: LedgerFilters, page = 1, pageSize = ledgerPageSize) => {
    const requestId = ++ledgerRequestRef.current;
    setLedgerLoading(true);
    try {
      const result = await inventoryApi.ledger({
        page,
        pageSize,
        ...filters,
      });
      if (requestId === ledgerRequestRef.current) {
        setLedger(result.items);
        setLedgerTotal(result.total);
        setLedgerPage(result.page);
        setLedgerPageSize(result.pageSize);
        setLedgerSummary(result.summary);
      }
    } catch {
      message.error("库存流水加载失败");
    } finally {
      if (requestId === ledgerRequestRef.current) setLedgerLoading(false);
    }
  };
  const changeLedgerFilter = (patch: Partial<LedgerFilters>) => {
    if (ledgerKeywordTimerRef.current)
      clearTimeout(ledgerKeywordTimerRef.current);
    const next = { ...ledgerFilters, ...patch };
    setLedgerFilters(next);
    void queryLedger(next);
  };
  const changeLedgerKeyword = (keyword: string) => {
    const next = { ...ledgerFilters, keyword };
    setLedgerFilters(next);
    if (ledgerKeywordTimerRef.current)
      clearTimeout(ledgerKeywordTimerRef.current);
    ledgerKeywordTimerRef.current = setTimeout(
      () => void queryLedger(next),
      350,
    );
  };
  const openLedger = async (stock?: InventoryStock) => {
    const filters = stock
      ? {
          ...emptyLedgerFilters,
          warehouseId: stock.warehouseId,
          productId: stock.productId,
          variantKey: stock.variantKey,
        }
      : { ...emptyLedgerFilters };
    if (ledgerKeywordTimerRef.current)
      clearTimeout(ledgerKeywordTimerRef.current);
    setLedgerStock(stock || null);
    setLedgerFilters(filters);
    setLedgerOpen(true);
    await queryLedger(filters);
  };
  const openCountDraft = async () => {
    try {
      await loadWarehouseOptions();
      setCountDraft({ warehouseId: "", remark: "" });
    } catch { message.error("仓库选项加载失败"); }
  };
  const openTransferDraft = async () => {
    try {
      await Promise.all([loadWarehouseOptions(), loadStockOptions()]);
      setTransferDraft({ ...emptyTransfer, lines: [{ ...emptyTransfer.lines[0] }] });
    } catch { message.error("调拨选项加载失败"); }
  };

  const saveWarehouse = async () => {
    if (!warehouseDraft?.name.trim()) return message.warning("请填写仓库名称");
    const data = {
      name: warehouseDraft.name,
      contact: warehouseDraft.contact,
      phone: warehouseDraft.phone,
      address: warehouseDraft.address,
      status: warehouseDraft.status,
    };
    if (
      await mutate(
        () =>
          warehouseDraft.id
            ? inventoryApi.updateWarehouse(warehouseDraft.id, data)
            : inventoryApi.createWarehouse(data),
        "仓库已保存",
      )
    )
      setWarehouseDraft(null);
  };
  const saveCountDraft = async () => {
    if (!countDraft?.warehouseId) return message.warning("请选择盘点仓库");
    setSaving(true);
    try {
      const created = await inventoryApi.createCount(countDraft);
      setCountDraft(null);
      setEditingCount(created);
      await loadList();
      message.success("盘点已开始，仓库已锁定");
    } catch {
      /* API interceptor displays the business error. */
    } finally {
      setSaving(false);
    }
  };
  const saveCountLines = async () => {
    if (!editingCount) return;
    const canComplete = can("inventory.count.complete");
    if (
      canComplete &&
      editingCount.lines.some((line) => line.countedQuantity === null)
    )
      return message.warning("请录入全部实盘数量");
    setSaving(true);
    try {
      if (editingCount.status === "draft")
        await inventoryApi.startCount(editingCount.id);
      await inventoryApi.updateCount(editingCount.id, {
        remark: editingCount.remark,
        lines: editingCount.lines.map((line) => ({
          productId: line.productId,
          variantKey: line.variantKey,
          ...(line.countedQuantity === null
            ? {}
            : { countedQuantity: Number(line.countedQuantity) }),
        })),
      });
      if (canComplete) await inventoryApi.completeCount(editingCount.id);
      setEditingCount(null);
      message.success(
        canComplete ? "盘点已完成，仓库已解锁" : "盘点进度已保存",
      );
      await loadList();
    } catch {
      /* API interceptor displays the business error. */
    } finally {
      setSaving(false);
    }
  };
  const saveTransfer = async () => {
    if (
      !transferDraft?.sourceWarehouseId ||
      !transferDraft.destinationWarehouseId
    )
      return message.warning("请选择调出仓和调入仓");
    if (
      transferDraft.lines.some((line) => !line.productId || line.quantity < 1)
    )
      return message.warning("请完整填写调拨明细");
    setSaving(true);
    try {
      await inventoryApi.createTransfer(transferDraft);
      message.success("调拨已发出，等待目标仓收货");
      setTransferDraft(null);
      await loadList();
    } catch {
      /* API interceptor displays the business error. */
    } finally {
      setSaving(false);
    }
  };

  const StockPage = () => (
    <PageContent>
      <PageHeader
        title="库存查询"
        description="按仓库、商品与规格查看现存、可用和在途库存"
        action={
          can("inventory.ledger.view") ? (
            <button onClick={() => void openLedger()} className={primaryButton}>
              <Eye size={16} />
              库存流水
            </button>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([
          { label: "现存库存", key: "onHand", total: summary.onHand },
          { label: "可用库存", key: "available", total: summary.available },
          { label: "在途库存", key: "inTransit", total: summary.inTransit },
          { label: summary.warningEnabled ? `预警商品（阈值 ≤ ${summary.warningThreshold}）` : "缺货商品（预警已关闭）", key: "warningItems", total: summary.warningItems },
        ] as const).map(metric => <div key={metric.key} className={`${card} p-5`}>
          <div className="text-sm text-muted-foreground">{metric.label}</div>
          <div className="mt-2 text-2xl font-bold">{metric.total.toLocaleString()}</div>
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {summary.warehouses.map(warehouse => <div key={warehouse.warehouseId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">{warehouse.warehouseName || "未命名仓库"}</span><b className="shrink-0 text-foreground">{warehouse[metric.key].toLocaleString()}</b></div>)}
          </div>
        </div>)}
      </div>
      <section className={card}>
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Input
            className="max-w-xs"
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索商品、编码或规格"
          />
          <Select
            className="w-44"
            allowClear
            value={warehouseFilter}
            onChange={setWarehouseFilter}
            placeholder="全部仓库"
            options={warehouses.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <Select
            className="w-36"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="全部状态"
            options={[
              { value: "normal", label: "正常" },
              { value: "warning", label: "预警" },
              { value: "out", label: "缺货" },
            ]}
          />
        </div>
        <AppTable
          rowKey="id"
          loading={loading}
          dataSource={stockRows}
          pagination={pagination.config}
          scroll={{ x: 920 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无库存"
              />
            ),
          }}
          columns={[
            {
              title: "商品",
              render: (_, row) => (
                <div>
                  <span>{row.productName}</span>
                  <div className="text-xs text-muted-foreground">
                    {row.productSku} · {row.variantLabel}
                  </div>
                </div>
              ),
            },
            { title: "仓库", dataIndex: "warehouseName" },
            { title: "现存", dataIndex: "onHand" },
            { title: "预占", dataIndex: "reserved" },
            { title: "可用", dataIndex: "available" },
            { title: "在途", dataIndex: "inTransit" },
            {
              title: "状态",
              render: (_, row) => <InventoryStatusBadge status={row.status} />,
            },
            ...(can("inventory.ledger.view")
              ? [
                  createActionColumn<InventoryStock>({
                    actions: 1,
                    render: (_, row) => (
                      <TableActions>
                        <TableActionButton
                          title="查看库存流水"
                          tone="primary"
                          onClick={() => void openLedger(row)}
                        >
                          <ScrollText size={15} />
                        </TableActionButton>
                      </TableActions>
                    ),
                  }),
                ]
              : []),
          ]}
        />
      </section>
    </PageContent>
  );

  const CountPage = () => (
    <PageContent>
      <PageHeader
        title="库存盘点"
        description="选择仓库后立即锁定，录入实盘数即可完成盘点"
        action={
          can("inventory.count.create") ? (
            <button
              onClick={() => void openCountDraft()}
              className={primaryButton}
            >
              <Plus size={16} />
              开始盘点
            </button>
          ) : undefined
        }
      />
      <section className={card}>
        <AppTable
          rowKey="id"
          loading={loading}
          dataSource={counts}
          pagination={pagination.config}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无盘点单"
              />
            ),
          }}
          columns={[
            {
              title: "盘点单号",
              dataIndex: "documentNo",
              render: (value) => (
                <span className="font-mono text-xs">{value}</span>
              ),
            },
            { title: "仓库", dataIndex: "warehouseName" },
            { title: "明细数", render: (_, row) => row.lines.length },
            {
              title: "差异项",
              render: (_, row) =>
                row.lines.filter((line) => line.difference !== 0).length,
            },
            {
              title: "状态",
              render: (_, row) => <InventoryStatusBadge status={row.status} />,
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              render: (value) => new Date(value).toLocaleString("zh-CN"),
            },
            createActionColumn<StockCount>({
              actions: 2,
              render: (_, row) => (
                <TableActions>
                  <TableActionButton
                    title={
                      ["completed", "cancelled"].includes(row.status)
                        ? "查看盘点"
                        : "继续盘点"
                    }
                    tone="primary"
                    onClick={() => setEditingCount(row)}
                  >
                    <ClipboardCheck size={15} />
                  </TableActionButton>
                  {["draft", "counting"].includes(row.status) &&
                    can("inventory.count.complete") && (
                      <TableActionButton
                        title="取消盘点"
                        tone="danger"
                        onClick={() =>
                          confirmAction(
                            "取消盘点",
                            "取消后仓库将立即解锁。",
                            () => inventoryApi.cancelCount(row.id),
                            "盘点已取消，仓库已解锁",
                            true,
                          )
                        }
                      >
                        <XCircle size={15} />
                      </TableActionButton>
                    )}
                  {row.status === "cancelled" &&
                    can("inventory.count.create") && (
                      <TableActionButton
                        title="删除盘点单"
                        tone="danger"
                        onClick={() =>
                          confirmAction(
                            "删除盘点单",
                            `确认永久删除盘点单“${row.documentNo}”？`,
                            () => inventoryApi.removeCount(row.id),
                            "盘点单已删除",
                            true,
                          )
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
      </section>
    </PageContent>
  );

  const TransferPage = () => (
    <PageContent>
      <PageHeader
        title="库存调拨"
        description="新建后直接发出，目标仓确认收货即可完成调拨"
        action={
          can("inventory.transfer.create") ? (
            <button
              onClick={() => void openTransferDraft()}
              className={primaryButton}
            >
              <Plus size={16} />
              新建调拨
            </button>
          ) : undefined
        }
      />
      <section className={card}>
        <AppTable
          rowKey="id"
          loading={loading}
          dataSource={transfers}
          pagination={pagination.config}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无调拨单"
              />
            ),
          }}
          columns={[
            {
              title: "调拨单号",
              dataIndex: "documentNo",
              render: (value) => (
                <span className="font-mono text-xs">{value}</span>
              ),
            },
            {
              title: "调拨路径",
              render: (_, row) => (
                <div className="flex items-center gap-2">
                  <span>{row.sourceWarehouseName}</span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <span>{row.destinationWarehouseName}</span>
                </div>
              ),
            },
            { title: "明细数", render: (_, row) => row.lines.length },
            {
              title: "总数量",
              render: (_, row) =>
                row.lines.reduce((sum, line) => sum + line.quantity, 0),
            },
            {
              title: "状态",
              render: (_, row) => <InventoryStatusBadge status={row.status} />,
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              render: (value) => new Date(value).toLocaleString("zh-CN"),
            },
            createActionColumn<StockTransfer>({
              actions: 1,
              render: (_, row) => (
                <TableActions>
                  {row.status === "shipped" &&
                    can("inventory.transfer.receive") && (
                      <TableActionButton
                        title="确认收货"
                        tone="success"
                        onClick={() =>
                          confirmAction(
                            "调拨收货",
                            "确认目标仓已收到全部调拨商品？",
                            () => inventoryApi.receiveTransfer(row.id),
                            "调拨已收货",
                          )
                        }
                      >
                        <PackageCheck size={15} />
                      </TableActionButton>
                    )}
                  {row.status === "cancelled" &&
                    can("inventory.transfer.create") && (
                      <TableActionButton
                        title="删除调拨单"
                        tone="danger"
                        onClick={() =>
                          confirmAction(
                            "删除调拨单",
                            `确认永久删除调拨单“${row.documentNo}”？`,
                            () => inventoryApi.removeTransfer(row.id),
                            "调拨单已删除",
                            true,
                          )
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
      </section>
    </PageContent>
  );

  const WarehousePage = () => (
    <PageContent>
      <PageHeader
        title="仓库管理"
        description="维护库存所属仓库、联系方式和默认仓设置"
        action={
          <div className="flex items-center gap-3">
            {warehouseLimit !== null && (
              <QuotaUsage
                label="仓库配额"
                used={module === "warehouses" ? pagination.total : warehouses.length}
                limit={warehouseLimit}
                onExhaustedClick={() => navigate("/settings?tab=billing")}
              />
            )}{" "}
            {can("inventory.warehouse.manage") && (
              <button
                disabled={warehouseQuotaReached}
                title={
                  warehouseQuotaReached
                    ? "仓库额度已用完，请升级套餐或联系管理员"
                    : "新增仓库"
                }
                onClick={() => setWarehouseDraft({ ...emptyWarehouse })}
                className={primaryButton}
              >
                <Plus size={16} />
                新增仓库
              </button>
            )}
          </div>
        }
      />
      <section className={card}>
        <AppTable
          rowKey="id"
          loading={loading}
          dataSource={warehouseRows}
          pagination={pagination.config}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无仓库"
              />
            ),
          }}
          columns={[
            {
              title: "仓库",
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl ${row.isLocked ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary"}`}
                  >
                    {row.isLocked ? (
                      <LockKeyhole size={17} />
                    ) : (
                      <WarehouseIcon size={17} />
                    )}
                  </div>
                  <span>{row.name}</span>
                </div>
              ),
            },
            {
              title: "联系人",
              render: (_, row) => (
                <div>
                  {row.contact || "-"}
                  <div className="text-xs text-muted-foreground">
                    {row.phone}
                  </div>
                </div>
              ),
            },
            {
              title: "地址",
              dataIndex: "address",
              render: (value) => value || "-",
            },
            {
              title: "状态",
              render: (_, row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <InventoryStatusBadge status={row.status} />
                  {row.isLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      <LockKeyhole size={12} />
                      盘点锁定
                    </span>
                  )}
                  {row.isDefault && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      默认仓
                    </span>
                  )}
                </div>
              ),
            },
            createActionColumn<Warehouse>({
              actions: 3,
              render: (_, row) =>
                row.isLocked ? (
                  <TableActions>
                    <TableActionButton
                      title="查看盘点"
                      tone="warning"
                      onClick={() => {
                        const count = counts.find(
                          (item) => item.id === row.activeCountId,
                        );
                        if (count) setEditingCount(count);
                      }}
                    >
                      <ClipboardCheck size={15} />
                    </TableActionButton>
                  </TableActions>
                ) : can("inventory.warehouse.manage") ? (
                  <TableActions>
                    <TableActionButton
                      title="编辑仓库"
                      tone="primary"
                      onClick={() => setWarehouseDraft({ ...row })}
                    >
                      <Pencil size={15} />
                    </TableActionButton>
                    {!row.isDefault && row.status === "active" && (
                      <TableActionButton
                        title="设为默认仓"
                        tone="warning"
                        onClick={() =>
                          confirmAction(
                            "设为默认仓",
                            `确认将“${row.name}”设为默认仓？`,
                            () => inventoryApi.setDefaultWarehouse(row.id),
                            "默认仓已更新",
                          )
                        }
                      >
                        <Star size={15} />
                      </TableActionButton>
                    )}
                    {!row.isDefault && (
                      <TableActionButton
                        title="删除仓库"
                        tone="danger"
                        onClick={() =>
                          confirmAction(
                            "删除仓库",
                            "仅无库存和业务记录的仓库可以删除。",
                            () => inventoryApi.removeWarehouse(row.id),
                            "仓库已删除",
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </TableActionButton>
                    )}
                  </TableActions>
                ) : null,
            }),
          ]}
        />
      </section>
    </PageContent>
  );

  return (
    <>
      {module === "stocks" && <StockPage />}
      {module === "counts" && <CountPage />}
      {module === "transfers" && <TransferPage />}
      {module === "warehouses" && <WarehousePage />}
      <AppModal
        open={!!warehouseDraft}
        width={620}
        title={warehouseDraft?.id ? "编辑仓库" : "新增仓库"}
        okText="保存"
        confirmLoading={saving}
        onCancel={() => setWarehouseDraft(null)}
        onOk={() => void saveWarehouse()}
      >
        {warehouseDraft && (
          <ModalForm>
            <ModalFormGrid>
              <ModalFormField label="仓库名称" required>
                <Input
                  value={warehouseDraft.name}
                  onChange={(event) =>
                    setWarehouseDraft({
                      ...warehouseDraft,
                      name: event.target.value,
                    })
                  }
                  placeholder="例如：上海成品仓"
                  variant="filled"
                  size="middle"
                />
              </ModalFormField>
              <ModalFormField label="仓库状态">
                <Select
                  className="w-full"
                  value={warehouseDraft.status}
                  onChange={(status) =>
                    setWarehouseDraft({ ...warehouseDraft, status })
                  }
                  variant="filled"
                  size="middle"
                  options={[
                    { value: "active", label: "启用" },
                    { value: "disabled", label: "停用" },
                  ]}
                />
              </ModalFormField>
              <ModalFormField label="联系人">
                <Input
                  value={warehouseDraft.contact}
                  onChange={(event) =>
                    setWarehouseDraft({
                      ...warehouseDraft,
                      contact: event.target.value,
                    })
                  }
                  placeholder="联系人姓名"
                  variant="filled"
                  size="middle"
                />
              </ModalFormField>
              <ModalFormField label="联系电话">
                <Input
                  value={warehouseDraft.phone}
                  onChange={(event) =>
                    setWarehouseDraft({
                      ...warehouseDraft,
                      phone: event.target.value,
                    })
                  }
                  placeholder="手机号或座机"
                  variant="filled"
                  size="middle"
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="仓库地址">
              <Input.TextArea
                rows={3}
                value={warehouseDraft.address}
                onChange={(event) =>
                  setWarehouseDraft({
                    ...warehouseDraft,
                    address: event.target.value,
                  })
                }
                placeholder="填写仓库详细地址"
                variant="filled"
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!countDraft}
        width={520}
        title="开始盘点"
        okText="开始并锁定仓库"
        confirmLoading={saving}
        onCancel={() => setCountDraft(null)}
        onOk={() => void saveCountDraft()}
      >
        {countDraft && (
          <ModalForm>
            <ModalFormField label="盘点仓库" required>
              <Select
                className="w-full"
                value={countDraft.warehouseId || undefined}
                onChange={(warehouseId) =>
                  setCountDraft({ ...countDraft, warehouseId })
                }
                placeholder="请选择盘点仓库"
                variant="filled"
                size="middle"
                options={warehouses
                  .filter((item) => item.status === "active" && !item.isLocked)
                  .map((item) => ({ value: item.id, label: item.name }))}
              />
            </ModalFormField>
            <ModalFormField label="盘点备注">
              <Input.TextArea
                rows={3}
                value={countDraft.remark}
                onChange={(event) =>
                  setCountDraft({ ...countDraft, remark: event.target.value })
                }
                placeholder="可填写盘点原因、范围或负责人"
                variant="filled"
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!editingCount}
        width={820}
        title={`盘点录入 · ${editingCount?.documentNo || ""}`}
        okText={
          editingCount &&
          ["draft", "counting"].includes(editingCount.status) &&
          can("inventory.count.create")
            ? can("inventory.count.complete")
              ? "保存并完成盘点"
              : "保存盘点进度"
            : undefined
        }
        cancelText="关闭"
        confirmLoading={saving}
        onCancel={() => setEditingCount(null)}
        onOk={() => void saveCountLines()}
        okButtonProps={{
          style:
            editingCount &&
            ["draft", "counting"].includes(editingCount.status) &&
            can("inventory.count.create")
              ? undefined
              : { display: "none" },
        }}
      >
        {editingCount && (
          <ModalForm>
            <AppEditableTable
              rowKey="id"
              dataSource={editingCount.lines}
              emptyText="暂无盘点明细"
              columns={[
                { title: "商品/规格" },
                { title: "系统数量", width: 110 },
                { title: "实盘数量", width: 150 },
                { title: "差异", width: 90 },
              ]}
              renderRow={(row) => {
                return [
                  <div>
                    <span>{row.productName || "-"}</span>
                    <div className="text-xs text-muted-foreground">
                      {row.productSku || "无 SKU"} · {row.variantLabel || "-"}
                    </div>
                  </div>,
                  row.systemQuantity,
                  <InputNumber
                    className="w-full"
                    variant="borderless"
                    size="small"
                    min={0}
                    precision={0}
                    disabled={
                      !["draft", "counting"].includes(editingCount.status) ||
                      !can("inventory.count.create")
                    }
                    value={row.countedQuantity}
                    onChange={(value) =>
                      setEditingCount({
                        ...editingCount,
                        lines: editingCount.lines.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                countedQuantity:
                                  value === null ? null : Number(value),
                                difference:
                                  value === null
                                    ? 0
                                    : Number(value) - item.systemQuantity,
                              }
                            : item,
                        ),
                      })
                    }
                  />,
                  <span
                    className={
                      row.difference > 0
                        ? "text-emerald-600"
                        : row.difference < 0
                          ? "text-red-500"
                          : ""
                    }
                  >
                    {row.difference > 0 ? "+" : ""}
                    {row.difference}
                  </span>,
                ];
              }}
            />
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={!!transferDraft}
        width={820}
        title="新建库存调拨"
        okText="创建调拨单"
        confirmLoading={saving}
        onCancel={() => setTransferDraft(null)}
        onOk={() => void saveTransfer()}
      >
        {transferDraft && (
          <ModalForm>
            <ModalFormGrid>
              <ModalFormField label="调出仓" required>
                <Select
                  className="w-full"
                  value={transferDraft.sourceWarehouseId || undefined}
                  onChange={(sourceWarehouseId) =>
                    setTransferDraft({
                      ...transferDraft,
                      sourceWarehouseId,
                      lines: [
                        { productId: "", variantKey: "BASE", quantity: 1 },
                      ],
                    })
                  }
                  placeholder="请选择调出仓"
                  variant="filled"
                  size="middle"
                  options={warehouses
                    .filter((item) => item.status === "active")
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </ModalFormField>
              <ModalFormField label="调入仓" required>
                <Select
                  className="w-full"
                  value={transferDraft.destinationWarehouseId || undefined}
                  onChange={(destinationWarehouseId) =>
                    setTransferDraft({
                      ...transferDraft,
                      destinationWarehouseId,
                    })
                  }
                  placeholder="请选择调入仓"
                  variant="filled"
                  size="middle"
                  options={warehouses
                    .filter(
                      (item) =>
                        item.status === "active" &&
                        item.id !== transferDraft.sourceWarehouseId,
                    )
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </ModalFormField>
            </ModalFormGrid>
            <ModalFormField label="调拨明细" required>
              <div className="space-y-2">
                <AppEditableTable
                  rowKey={(_, index) => index}
                  dataSource={transferDraft.lines}
                  emptyText="暂无调拨明细"
                  columns={[
                    { title: "商品/规格" },
                    { title: "调拨数量", width: 140 },
                    { title: "", width: 56, className: "text-center" },
                  ]}
                  renderRow={(line, index) => [
                    <Select
                      className="w-full"
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择商品规格"
                      variant="borderless"
                      size="small"
                      value={
                        line.productId
                          ? `${line.productId}:${line.variantKey}`
                          : undefined
                      }
                      onChange={(value) => {
                        const option = stockOptions.find(
                          (item) => item.value === value,
                        )!;
                        setTransferDraft({
                          ...transferDraft,
                          lines: transferDraft.lines.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  productId: option.stock.productId,
                                  variantKey: option.stock.variantKey,
                                }
                              : item,
                          ),
                        });
                      }}
                      options={stockOptions}
                    />,
                    <InputNumber
                      className="w-full"
                      variant="borderless"
                      size="small"
                      min={1}
                      precision={0}
                      placeholder="数量"
                      value={line.quantity}
                      onChange={(value) =>
                        setTransferDraft({
                          ...transferDraft,
                          lines: transferDraft.lines.map((item, i) =>
                            i === index
                              ? { ...item, quantity: Number(value) || 1 }
                              : item,
                          ),
                        })
                      }
                    />,
                    <TableActionButton
                      title="删除调拨明细"
                      tone="danger"
                      onClick={() =>
                        setTransferDraft({
                          ...transferDraft,
                          lines: transferDraft.lines.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </TableActionButton>,
                  ]}
                />
                <button
                  type="button"
                  disabled={!transferDraft.sourceWarehouseId}
                  onClick={() =>
                    setTransferDraft({
                      ...transferDraft,
                      lines: [
                        ...transferDraft.lines,
                        { productId: "", variantKey: "BASE", quantity: 1 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-40"
                >
                  <Plus size={14} />
                  添加明细
                </button>
              </div>
            </ModalFormField>
            <ModalFormField label="调拨备注">
              <Input.TextArea
                rows={3}
                value={transferDraft.remark}
                onChange={(event) =>
                  setTransferDraft({
                    ...transferDraft,
                    remark: event.target.value,
                  })
                }
                placeholder="可填写调拨原因或交接说明"
                variant="filled"
              />
            </ModalFormField>
          </ModalForm>
        )}
      </AppModal>
      <AppModal
        open={ledgerOpen}
        width={1180}
        className="inventory-ledger-modal"
        title={ledgerStock ? "库存流水 · 单品明细" : "库存流水 · 全部明细"}
        footer={null}
        onCancel={() => {
          ledgerRequestRef.current += 1;
          if (ledgerKeywordTimerRef.current)
            clearTimeout(ledgerKeywordTimerRef.current);
          setLedgerOpen(false);
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              allowClear
              value={ledgerFilters.keyword}
              onChange={(event) => changeLedgerKeyword(event.target.value)}
              placeholder="搜索商品、编码、单号"
            />
            {ledgerStock ? (
              <Input disabled value={ledgerStock.warehouseName} />
            ) : (
              <Select
                allowClear
                value={ledgerFilters.warehouseId}
                onChange={(warehouseId) => changeLedgerFilter({ warehouseId })}
                placeholder="全部仓库"
                options={warehouses.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            )}
            <Select
              allowClear
              value={ledgerFilters.type}
              onChange={(type) => changeLedgerFilter({ type })}
              placeholder="全部业务类型"
              options={ledgerTypeOptions}
            />
            <DatePicker.RangePicker
              className="w-full"
              allowClear
              value={
                ledgerFilters.startDate && ledgerFilters.endDate
                  ? [
                      dayjs(ledgerFilters.startDate),
                      dayjs(ledgerFilters.endDate),
                    ]
                  : null
              }
              format="YYYY-MM-DD"
              placeholder={["开始日期", "结束日期"]}
              onChange={(dates) =>
                changeLedgerFilter({
                  startDate: dates?.[0]?.format("YYYY-MM-DD") || "",
                  endDate: dates?.[1]?.format("YYYY-MM-DD") || "",
                })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground">流水记录</div>
              <b className="mt-1 block text-lg">{ledgerTotal}</b>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground">累计入库</div>
              <b className="mt-1 block text-lg text-emerald-600">
                +{ledgerSummary.inbound}
              </b>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground">累计出库</div>
              <b className="mt-1 block text-lg text-red-500">
                {ledgerSummary.outbound}
              </b>
            </div>
          </div>
          <AppTable
            rowKey="id"
            loading={ledgerLoading}
            size="middle"
            dataSource={ledger}
            scroll={{ x: 1200 }}
            pagination={{
              current: ledgerPage,
              pageSize: ledgerPageSize,
              total: ledgerTotal,
              size: "small",
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={(pagination) =>
              void queryLedger(ledgerFilters, pagination.current || 1, pagination.pageSize || 10)
            }
            columns={[
              {
                title: "发生时间",
                dataIndex: "createdAt",
                width: 160,
                render: (value) => new Date(value).toLocaleString("zh-CN"),
              },
              {
                title: "商品/规格",
                width: 230,
                render: (_, row) => (
                  <div className="min-w-0 max-w-[198px]">
                    <span className="block truncate" title={row.productName || "-"}>
                      {row.productName || "-"}
                    </span>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={`${row.productSku || "无 SKU"} · ${row.variantLabel || "-"}`}
                    >
                      {row.productSku || "无 SKU"} · {row.variantLabel || "-"}
                    </div>
                  </div>
                ),
              },
              { title: "仓库", dataIndex: "warehouseName", width: 130 },
              {
                title: "业务类型",
                dataIndex: "type",
                width: 100,
                render: (value) => ledgerTypeLabels[value] || value,
              },
              {
                title: "业务单号",
                dataIndex: "referenceNo",
                width: 180,
                render: (value) => (
                  <span className="font-mono text-xs">{value || "-"}</span>
                ),
              },
              {
                title: "数量变动",
                dataIndex: "quantityChange",
                width: 100,
                align: "center",
                render: (value) => (
                  <b
                    className={value > 0 ? "text-emerald-600" : "text-red-500"}
                  >
                    {value > 0 ? "+" : ""}
                    {value}
                  </b>
                ),
              },
              {
                title: "变动后结存",
                dataIndex: "balanceAfter",
                width: 110,
                align: "center",
              },
              {
                title: "备注",
                dataIndex: "remark",
                width: 190,
                ellipsis: true,
                render: (value) => value || "-",
              },
            ]}
          />
        </div>
      </AppModal>
    </>
  );
};

export default InventoryPage;
