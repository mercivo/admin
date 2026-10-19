import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Descriptions, Input, InputNumber, message, Select, Tag } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { BarChart3, CheckCircle2, Eye, Plus, Search, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import MonthlyFinanceChart from "./MonthlyFinanceChart";
import FinanceOrderDetailSummary from "./FinanceOrderDetailSummary";
import {
  financeApi,
  workspaceApi,
  type FinanceOrderOption,
  type FinancePaymentMethod,
  type FinanceStatistics,
  type FinanceTransaction,
  type FinanceTransactionInput,
} from "../../services/api/index";
import { DEFAULT_CURRENCY_CONFIG, type CurrencyConfig } from '../../config/sales';
import {
  AppModal,
  AppTable,
  AdminPageSkeleton,
  ModalForm,
  ModalFormField,
  ModalFormGrid,
  PageContent,
  PageHeader,
  TableActionButton,
  TableActions,
  createActionColumn,
  CurrencySelect,
} from "../../components/shared";
import { useTablePagination } from "../../hooks/useTablePagination";
import { can } from "../../utils/permissions";

const { RangePicker } = DatePicker;
const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50";
const displayValue = (value?: React.ReactNode) => value === null || value === undefined || value === "" ? "-" : value;
const money = (value: number, currency = "CNY") => `${currency} ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const methods: Array<{ value: FinancePaymentMethod; label: string }> = [
  { value: "bank_transfer", label: "银行转账" },
  { value: "cash", label: "现金" },
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
  { value: "other", label: "其他" },
];
const methodLabel = (value: FinancePaymentMethod) => methods.find((item) => item.value === value)?.label || value;
const blankDraft = (): FinanceTransactionInput => ({
  orderId: "",
  amount: 0,
  paymentMethod: "bank_transfer",
  accountName: "",
  referenceNo: "",
  transactionDate: dayjs().format("YYYY-MM-DD"),
  remark: "",
});

const summaryTone = {
  violet: "from-violet-500/[0.09] text-violet-600",
  blue: "from-blue-500/[0.09] text-blue-600",
  green: "from-emerald-500/[0.09] text-emerald-600",
  orange: "from-orange-500/[0.09] text-orange-500",
} as const;
const SummaryCard = ({ label, value, tone = "violet" }: { label: string; value: string; tone?: keyof typeof summaryTone }) => (
  <div className={`rounded-2xl border border-border bg-gradient-to-br ${summaryTone[tone]} to-card px-5 py-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
    <div className="text-2xl font-bold tabular-nums tracking-tight xl:text-3xl">{value}</div>
    <div className="mt-2 text-sm font-medium text-muted-foreground">{label}</div>
  </div>
);

const FinancePage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const isReceipt = module === "receipts";
  const isStatistics = module === "statistics";
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState({ confirmedAmount: 0, pendingAmount: 0, totalCount: 0 });
  const [statistics, setStatistics] = useState<FinanceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedModule, setLoadedModule] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day"), dayjs()]);
  const [statisticsYear, setStatisticsYear] = useState(dayjs().year());
  const [statisticsCurrency, setStatisticsCurrency] = useState('BAM');
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCY_CONFIG.currencies);
  const [draft, setDraft] = useState<FinanceTransactionInput | null>(null);
  const [orderOptions, setOrderOptions] = useState<FinanceOrderOption[]>([]);
  const [detail, setDetail] = useState<FinanceTransaction | null>(null);
  const [cancelTarget, setCancelTarget] = useState<FinanceTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const pagination = useTablePagination();

  const load = async () => {
    setLoading(true);
    try {
      if (isStatistics) {
        setStatistics(await financeApi.statistics({ year: statisticsYear, currency: statisticsCurrency }));
      } else {
        const dates = { startDate: range[0].format("YYYY-MM-DD"), endDate: range[1].format("YYYY-MM-DD") };
        const result = await (isReceipt ? financeApi.receipts : financeApi.payments)({
          page: pagination.current,
          pageSize: pagination.pageSize,
          keyword,
          status,
          ...dates,
        });
        setRows(result.items);
        setSummary(result.summary);
        pagination.reconcile(result.total);
      }
    } catch {
      message.error("财务数据加载失败");
    } finally {
      setLoadedModule(module);
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [module, pagination.current, pagination.pageSize, keyword, status, statisticsYear, statisticsCurrency, range[0].valueOf(), range[1].valueOf()]);
  useEffect(() => { workspaceApi.getConfig<CurrencyConfig>('currency').then(config => { setCurrencies(config.currencies.filter(item => item.enabled)); setStatisticsCurrency(config.salesDefaultCurrency || config.defaultCurrency); }).catch(() => undefined); }, []);
  useEffect(() => {
    pagination.reset();
  }, [module, keyword, status, range[0].valueOf(), range[1].valueOf()]);
  useEffect(() => {
    setStatus(undefined);
  }, [module]);

  const openCreate = async () => {
    try {
      const options = await (isReceipt ? financeApi.receivableOrders() : financeApi.payableOrders());
      setOrderOptions(options);
      setDraft(blankDraft());
    } catch {
      message.error(`${isReceipt ? "待收款" : "待付款"}订单加载失败`);
    }
  };
  const selectedOrder = orderOptions.find((item) => item.id === draft?.orderId);
  const save = async () => {
    if (!draft?.orderId || draft.amount <= 0) return void message.warning(`请选择订单并填写${isReceipt ? "收款" : "付款"}金额`);
    if (selectedOrder && draft.amount > selectedOrder.remainingAmount) return void message.warning("本次金额不能超过订单剩余金额");
    setSaving(true);
    try {
      await (isReceipt ? financeApi.createReceipt(draft) : financeApi.createPayment(draft));
      message.success(`${isReceipt ? "收款" : "付款"}单已创建，等待确认`);
      setDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  };
  const confirmTransaction = (row: FinanceTransaction) => {
    AppModal.confirm({
      title: `确认${isReceipt ? "收款" : "付款"}`,
      content: `确认后该笔 ${money(row.amount, row.currency)} 将正式计入财务统计和订单结算。`,
      okText: "确认",
      onOk: async () => {
        await (isReceipt ? financeApi.confirmReceipt(row.id) : financeApi.confirmPayment(row.id));
        message.success(`${isReceipt ? "收款" : "付款"}已确认`);
        await load();
      },
    });
  };
  const submitCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return void message.warning("请填写取消原因");
    setSaving(true);
    try {
      await (isReceipt ? financeApi.cancelReceipt(cancelTarget.id, cancelReason) : financeApi.cancelPayment(cancelTarget.id, cancelReason));
      message.success(`${isReceipt ? "收款" : "付款"}单已取消`);
      setCancelTarget(null);
      setCancelReason("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: isReceipt ? "收款单号" : "付款单号", dataIndex: "transactionNo", minWidth: 180 },
    { title: "业务日期", dataIndex: "transactionDate", minWidth: 110 },
    { title: isReceipt ? "客户" : "供应商", dataIndex: "partnerName", minWidth: 150, ellipsis: true },
    { title: "关联订单", dataIndex: "orderNo", minWidth: 170, render: displayValue },
    { title: "金额", dataIndex: "amount", align: "right" as const, minWidth: 140, render: (value: number, row: FinanceTransaction) => <b>{money(value, row.currency)}</b> },
    { title: "支付方式", dataIndex: "paymentMethod", minWidth: 100, render: methodLabel },
    { title: "状态", dataIndex: "status", minWidth: 90, render: (value: string) => value === "confirmed" ? <Tag color="green">已确认</Tag> : value === "pending" ? <Tag color="gold">待确认</Tag> : <Tag color="default">已取消</Tag> },
    createActionColumn<FinanceTransaction>({ actions: 3, render: (_value, row: FinanceTransaction) => (
      <TableActions>
        <TableActionButton title="查看详情" onClick={() => setDetail(row)}><Eye size={14} /></TableActionButton>
        {row.status === "pending" && can(isReceipt ? "finance.receipt.confirm" : "finance.payment.confirm") && (
          <TableActionButton title="确认" tone="success" onClick={() => confirmTransaction(row)}><CheckCircle2 size={14} /></TableActionButton>
        )}
        {row.status === "pending" && can(isReceipt ? "finance.receipt.cancel" : "finance.payment.cancel") && (
          <TableActionButton title="取消" tone="danger" onClick={() => setCancelTarget(row)}><XCircle size={14} /></TableActionButton>
        )}
      </TableActions>
    ) }),
  ], [isReceipt]);

  const title = isStatistics ? "财务统计" : isReceipt ? "收款管理" : "付款管理";
  const description = isStatistics ? "按币种独立统计销售、采购及已确认收付款，不进行汇率换算" : isReceipt ? "登记客户回款，确认后计入订单结算，待确认单可取消" : "登记供应商付款，确认后计入订单结算，待确认单可取消";
  const dateFilter = <RangePicker allowClear={false} value={range} onChange={(value) => value?.[0] && value?.[1] && setRange([value[0], value[1]])} variant="filled" size="middle" />;

  if (loadedModule !== module) return (
    <PageContent>
      <PageHeader title={title} description={description} />
      <AdminPageSkeleton variant="table" />
    </PageContent>
  );

  if (isStatistics) return (
    <PageContent>
      <PageHeader title={title} description={description} action={
        <div className="flex gap-2"><CurrencySelect value={statisticsCurrency} onChange={setStatisticsCurrency} currencies={currencies} /><Select
          className="w-32"
          value={statisticsYear}
          onChange={setStatisticsYear}
          options={Array.from({ length: 5 }, (_, index) => ({ value: dayjs().year() - index, label: `${dayjs().year() - index}年` }))}
        /></div>
      } />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="年度销售总额" value={money(statistics?.summary.salesAmount || 0, statisticsCurrency)} tone="violet" />
        <SummaryCard label="年度采购总额" value={money(statistics?.summary.purchaseAmount || 0, statisticsCurrency)} tone="blue" />
        <SummaryCard label="已确认收款" value={money(statistics?.summary.receiptAmount || 0, statisticsCurrency)} tone="green" />
        <SummaryCard label="已确认付款" value={money(statistics?.summary.paymentAmount || 0, statisticsCurrency)} tone="orange" />
      </div>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold"><BarChart3 size={18} />月度收支对比（{statisticsYear}年）</h2>
        <div className="h-80">
          <MonthlyFinanceChart data={statistics?.monthly || []} />
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4"><h2 className="text-base font-semibold">月度财务明细（{statisticsCurrency}）</h2></div>
        <AppTable pagination={false} loading={loading} rowKey="month" dataSource={statistics?.monthly || []} columns={[
          { title: "月份", dataIndex: "monthLabel", width: 110 },
          { title: "销售收入", dataIndex: "salesAmount", align: "right", render: (value) => money(value, statisticsCurrency) },
          { title: "采购支出", dataIndex: "purchaseAmount", align: "right", render: (value) => money(value, statisticsCurrency) },
          { title: "已确认收款", dataIndex: "receiptAmount", align: "right", render: (value) => money(value, statisticsCurrency) },
          { title: "已确认付款", dataIndex: "paymentAmount", align: "right", render: (value) => money(value, statisticsCurrency) },
        ]} />
      </section>
    </PageContent>
  );

  return (
    <PageContent>
      <PageHeader title={title} description={description} action={can(isReceipt ? "finance.receipt.create" : "finance.payment.create") ? <button className={primaryButton} onClick={() => void openCreate()}><Plus size={16}/>登记{isReceipt ? "收款" : "付款"}</button> : undefined} />
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={`已确认${isReceipt ? "收款" : "付款"}`} value={money(summary.confirmedAmount)} tone="green" />
        <SummaryCard label={`待确认${isReceipt ? "收款" : "付款"}`} value={money(summary.pendingAmount)} tone="orange" />
        <SummaryCard label={`总${isReceipt ? "收款" : "付款"}笔数`} value={`${summary.totalCount.toLocaleString()} 笔`} tone="violet" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-56 max-w-xs flex-1"><Input allowClear prefix={<Search className="h-4 w-4 text-muted-foreground" />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={`搜索${isReceipt ? "收款" : "付款"}单号、往来单位或流水号...`} variant="filled" size="middle" /></div>
          <Select value={status || "all"} onChange={(value) => setStatus(value === "all" ? undefined : value)} style={{ width: 140 }} variant="filled" size="middle" options={[{ value: "all", label: "全部状态" }, { value: "pending", label: "待确认" }, { value: "confirmed", label: "已确认" }, { value: "cancelled", label: "已取消" }]} />
          {dateFilter}
          <span className="ml-auto text-xs text-muted-foreground">共 {pagination.total} 条</span>
        </div>
        <AppTable rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={pagination.config} tableLayout="auto" scroll={{ x: "max-content" }} />
      </div>

      <AppModal open={Boolean(draft)} title={`登记${isReceipt ? "收款" : "付款"}`} description={`新增后进入待确认状态，确认后才会正式计入订单结算`} width={720} okText="创建待确认单" cancelText="关闭" confirmLoading={saving} onOk={() => void save()} onCancel={() => setDraft(null)}>
        {draft && <ModalForm>
          <ModalFormField label={`关联${isReceipt ? "销售" : "采购"}订单`} required><Select showSearch optionFilterProp="label" value={draft.orderId || undefined} onChange={(orderId) => { const order = orderOptions.find((item) => item.id === orderId); setDraft({ ...draft, orderId, amount: order?.remainingAmount || 0 }); }} placeholder="请选择待结算订单" variant="filled" options={orderOptions.map((item) => ({ value: item.id, label: `${item.orderNo} · ${item.partnerName} · 待${isReceipt ? "收" : "付"} ${money(item.remainingAmount, item.currency)}` }))} /></ModalFormField>
          {selectedOrder && <FinanceOrderDetailSummary order={selectedOrder} isReceipt={isReceipt} />}
          <ModalFormGrid>
            <ModalFormField label={`${isReceipt ? "收款" : "付款"}金额`} required><InputNumber className="w-full" style={{ width: "100%" }} min={0.01} max={selectedOrder?.remainingAmount} precision={2} value={draft.amount} onChange={(amount) => setDraft({ ...draft, amount: Number(amount || 0) })} /></ModalFormField>
            <ModalFormField label="业务日期" required><DatePicker className="w-full" value={dayjs(draft.transactionDate)} onChange={(date) => setDraft({ ...draft, transactionDate: date.format("YYYY-MM-DD") })} /></ModalFormField>
            <ModalFormField label="支付方式" required><Select value={draft.paymentMethod} onChange={(paymentMethod) => setDraft({ ...draft, paymentMethod })} options={methods} /></ModalFormField>
            <ModalFormField label="资金账户"><Input value={draft.accountName} onChange={(event) => setDraft({ ...draft, accountName: event.target.value })} placeholder="例如：招商银行基本户" /></ModalFormField>
            <ModalFormField label="外部流水号"><Input value={draft.referenceNo} onChange={(event) => setDraft({ ...draft, referenceNo: event.target.value })} placeholder="银行流水号或第三方交易号" /></ModalFormField>
          </ModalFormGrid>
          <ModalFormField label="备注"><Input.TextArea rows={3} maxLength={500} value={draft.remark} onChange={(event) => setDraft({ ...draft, remark: event.target.value })} /></ModalFormField>
        </ModalForm>}
      </AppModal>

      <AppModal open={Boolean(detail)} title={`${isReceipt ? "收款单" : "付款单"} · ${detail?.transactionNo || ""}`} description={`查看${isReceipt ? "收款" : "付款"}信息、关联订单及商品明细`} width={900} className="sales-detail-modal" footer={null} onCancel={() => setDetail(null)}>
        {detail && <div><Descriptions bordered size="small" column={2} title={<span className="sales-content-title">{isReceipt ? "收款信息" : "付款信息"}</span>} items={[
          { key: "no", label: "单据编号", children: detail.transactionNo }, { key: "status", label: "状态", children: detail.status === "confirmed" ? <Tag color="green">已确认</Tag> : detail.status === "pending" ? <Tag color="gold">待确认</Tag> : <Tag>已取消</Tag> },
          { key: "partner", label: isReceipt ? "客户" : "供应商", children: detail.partnerName }, { key: "order", label: "关联订单", children: displayValue(detail.orderNo) },
          { key: "amount", label: "金额", children: money(detail.amount, detail.currency) }, { key: "date", label: "业务日期", children: detail.transactionDate },
          { key: "method", label: "支付方式", children: methodLabel(detail.paymentMethod) }, { key: "account", label: "资金账户", children: displayValue(detail.accountName) },
          { key: "reference", label: "外部流水号", children: displayValue(detail.referenceNo), span: 2 }, { key: "remark", label: "备注", children: displayValue(detail.remark), span: 2 },
          ...(detail.status === "cancelled" ? [{ key: "cancelReason", label: "取消原因", children: displayValue(detail.cancelReason), span: 2 }] : []),
        ]} />
          {detail.orderDetail && <div className="mt-5 grid gap-1.5"><div className="sales-content-title">关联单据明细</div><FinanceOrderDetailSummary order={detail.orderDetail} isReceipt={isReceipt} /></div>}
        </div>}
      </AppModal>

      <AppModal open={Boolean(cancelTarget)} title={`取消${isReceipt ? "收款" : "付款"}单`} description="取消后将释放订单占用金额，原单据会保留用于审计。" width={440} okText="确认取消" cancelText="关闭" confirmLoading={saving} okButtonProps={{ danger: true }} onOk={() => void submitCancel()} onCancel={() => { setCancelTarget(null); setCancelReason(""); }}>
        <ModalFormField label="取消原因" required><Input.TextArea rows={4} maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="请填写取消原因" /></ModalFormField>
      </AppModal>
    </PageContent>
  );
};

export default FinancePage;
