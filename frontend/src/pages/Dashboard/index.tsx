import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Banknote, Boxes, CircleDollarSign, ClipboardList, MessageSquareText, PackageCheck, ShoppingCart, Truck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, storefrontManageApi, type DashboardStats, type StorefrontOverview } from '../../services/api/index';
import { AppTable, CurrencySelect, LeadStatusTag, PageContent, PageHeader, SalesOrderStatusTag } from '../../components/shared';
import CategoryDonutChart from './CategoryDonutChart';
import OrderTrendChart from './OrderTrendChart';

const card = 'rounded-2xl border border-border bg-card shadow-sm';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>();
  const [storefront, setStorefront] = useState<StorefrontOverview>();
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    dashboardApi.getStats().then((data) => {
      setStats(data);
      setCurrency(data.defaultCurrency || data.currencies[0]?.code || data.financials[0]?.currency || 'CNY');
    }).catch(() => setStats(undefined));
  }, []);
  useEffect(() => { storefrontManageApi.overview().then(setStorefront).catch(() => setStorefront(undefined)); }, []);

  const currencyOptions = useMemo(() => {
    const configured = stats?.currencies || [];
    const codes = new Set(configured.map((item) => item.code));
    const additions = (stats?.financials || []).filter((item) => !codes.has(item.currency)).map((item) => ({ code: item.currency, symbol: item.currency, name: item.currency }));
    return [...configured, ...additions];
  }, [stats]);
  const selectedCurrency = currencyOptions.find((item) => item.code === currency);
  const financial = stats?.financials.find((item) => item.currency === currency);
  const symbol = selectedCurrency?.symbol || currency;
  const formatMoney = (value?: number) => `${symbol} ${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const trend = stats?.monthlyOrders || Array.from({ length: 12 }, (_, index) => ({ month: `${new Date().getFullYear()}-${String(index + 1).padStart(2, '0')}`, label: `${index + 1}月`, sales: 0, purchases: 0 }));
  const topSelling = Object.values((stats?.topSellingProducts || []).reduce<Record<string, { productId: string; name: string; sku: string; quantity: number }>>((result, item) => {
    const current = result[item.productId] || { productId: item.productId, name: item.name, sku: item.sku, quantity: 0 };
    current.quantity += item.quantity;
    result[item.productId] = current;
    return result;
  }, {})).sort((left, right) => right.quantity - left.quantity).slice(0, 8);
  const categories = (stats?.categoryDistribution || []).slice(0, 6);

  const signals = [
    { label: '待履约销售单', value: stats?.orders.salesOpen || 0, path: '/sales/orders', icon: ShoppingCart, tone: 'bg-violet-50 text-violet-600' },
    { label: '待入库采购单', value: stats?.orders.purchaseOpen || 0, path: '/purchase/orders', icon: Truck, tone: 'bg-blue-50 text-blue-600' },
    { label: '低库存预警', value: stats?.risks.lowStock || 0, path: '/inventory/stocks', icon: AlertTriangle, tone: 'bg-red-50 text-red-600' },
    { label: '待确认资金单', value: stats?.risks.pendingFunds || 0, path: '/finance/receipts', icon: CircleDollarSign, tone: 'bg-orange-50 text-orange-600' },
    { label: '客户数', value: stats?.totalCustomers || 0, path: '/customers', icon: Users, tone: 'bg-emerald-50 text-emerald-600' },
    { label: '未同步商品', value: stats?.risks.pendingProducts || 0, path: '/products', icon: Boxes, tone: 'bg-amber-50 text-amber-600' },
  ];

  const kpis = [
    { label: '本月销售额', value: financial?.currentMonthSales, note: `累计销售 ${formatMoney(financial?.salesAmount)}`, icon: ShoppingCart, tone: 'from-violet-600 to-indigo-500' },
    { label: '本月采购额', value: financial?.currentMonthPurchases, note: `累计采购 ${formatMoney(financial?.purchaseAmount)}`, icon: Truck, tone: 'from-blue-600 to-cyan-500' },
    { label: '已确认收款', value: financial?.receipts, note: '仅统计当前币种已确认流水', icon: Banknote, tone: 'from-emerald-600 to-teal-500' },
    { label: '已确认付款', value: financial?.payments, note: '仅统计当前币种已确认流水', icon: CircleDollarSign, tone: 'from-orange-500 to-amber-500' },
  ];

  return <PageContent>
    <PageHeader title="经营概览" description="快速了解销售、采购、库存与资金经营状态" action={<button onClick={() => navigate('/sales/orders')} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">处理销售订单 <ArrowRight size={15}/></button>}/>

    <section className={`${card} p-4 sm:p-5`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">经营金额</h2><p className="mt-1 text-xs text-muted-foreground">金额按原币独立统计，币种切换仅影响本区域</p></div><CurrencySelect value={currency} onChange={setCurrency} currencies={currencyOptions}/></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kpis.map(({ label, value, note, icon: Icon, tone }) => <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-5 text-white shadow-sm`}><div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10"/><div className="relative flex items-start justify-between"><div><div className="text-sm text-white/80">{label}</div><div className="mt-3 text-2xl font-bold">{formatMoney(value)}</div><div className="mt-3 text-xs text-white/70">{note}</div></div><Icon size={24} className="text-white/85"/></div></div>)}</div></section>

    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{signals.map(({ label, value, path, icon: Icon, tone }) => <button key={label} onClick={() => navigate(path)} className={`${card} flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span><span><b className="text-xl">{value}</b><span className="mt-0.5 block text-xs text-muted-foreground">{label}</span></span></button>)}</div>

    <div className="grid items-stretch gap-5 xl:grid-cols-[1.5fr_.7fr]">
      <section className={`${card} flex h-[390px] flex-col p-5`}><div className="mb-3 shrink-0"><h2 className="font-bold">销售与采购订单趋势（{new Date().getFullYear()}年）</h2><p className="mt-1 text-xs text-muted-foreground">按全部币种的订单数量统计，鼠标移入可查看当月销售与采购单量</p></div><div className="min-h-0 flex-1"><OrderTrendChart data={trend}/></div></section>
      <section className={`${card} flex h-[390px] flex-col p-5`}><div className="shrink-0"><h2 className="font-bold">商品品类占比</h2><p className="mt-1 text-xs text-muted-foreground">按全部商品数量统计，不区分币种</p></div>{categories.length ? <div className="min-h-0 flex-1"><CategoryDonutChart data={categories}/></div> : <div className="grid flex-1 place-items-center text-sm text-muted-foreground">暂无数据</div>}</section>
    </div>

    <div className="grid items-stretch gap-5 xl:grid-cols-2">
      <section className={`${card} flex h-[430px] flex-col overflow-hidden p-5`}><div className="mb-4 flex shrink-0 items-center justify-between"><div><h2 className="font-bold">商品销售 TOP8</h2><p className="mt-1 text-xs text-muted-foreground">按全部币种销售数量排名</p></div><PackageCheck size={18} className="text-primary"/></div><div className="min-h-0 flex-1 overflow-y-auto"><AppTable size="small" pagination={false} rowKey="productId" dataSource={topSelling} columns={[{ title: '商品', dataIndex: 'name', ellipsis: true, render: (value, row) => <div><div className="font-medium">{value || '-'}</div><div className="text-xs text-muted-foreground">{row.sku || '-'}</div></div> }, { title: '销售数量', dataIndex: 'quantity', width: 90, align: 'right', render: (value) => `${value} 件` }]}/></div></section>
      <section className={`${card} flex h-[430px] flex-col overflow-hidden`}><div className="flex shrink-0 items-center gap-3 border-b border-border p-5"><AlertTriangle size={20} className="text-red-500"/><h2 className="font-bold">低库存预警</h2><span className="rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600">{stats?.risks.lowStock || 0}</span></div><div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5">{(stats?.lowStockProducts || []).map((item) => <button key={item.id} onClick={() => navigate('/inventory/stocks')} className="flex w-full items-center gap-3 py-4 text-left"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-sm font-bold text-red-600">低</span><span className="min-w-0 flex-1"><b className="block truncate">{item.name || '-'}</b><span className="mt-1 block truncate text-xs text-muted-foreground">{item.variantLabel || '-'} · {item.warehouseName || '-'}</span></span><span className="w-24 shrink-0 text-right"><b className="block text-sm font-semibold tabular-nums text-red-600">{item.available} 个</b><span className="mt-1 block h-2 overflow-hidden rounded-full bg-red-100"><i className="block h-full rounded-full bg-red-500" style={{ width: `${Math.max(8, Math.min(100, item.warningStock ? item.available / item.warningStock * 100 : 100))}%` }}/></span></span></button>)}{stats && !stats.lowStockProducts.length && <div className="grid h-full place-items-center text-sm text-muted-foreground">暂无低库存商品</div>}</div></section>
    </div>

    <section className={`${card} overflow-hidden p-5`}><div className="mb-4 flex items-center gap-3"><ClipboardList size={20} className="text-indigo-600"/><div><h2 className="font-bold">最新销售订单</h2><p className="mt-1 text-xs text-muted-foreground">保留订单原币展示，左右滑动可查看完整列</p></div></div><AppTable size="middle" pagination={false} rowKey="id" scroll={{ x: 900 }} dataSource={stats?.latestSalesOrders || []} columns={[{ title: '订单号', dataIndex: 'orderNo', width: 220, render: (value) => <span className="font-mono font-medium text-indigo-600">{value || '-'}</span> }, { title: '客户', dataIndex: 'customerName', width: 180, render: (value) => value || '-' }, { title: '金额', dataIndex: 'amount', width: 170, align: 'right', render: (value, row) => <b className="text-indigo-600">{row.currency} {Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> }, { title: '状态', dataIndex: 'status', width: 130, align: 'center', render: (value) => <SalesOrderStatusTag status={value}/> }, { title: '日期', dataIndex: 'createdAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('zh-CN') : '-' }]}/></section>

    <section className={`${card} overflow-hidden p-5`}><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><MessageSquareText size={20} className="text-violet-600"/><div><h2 className="font-bold">最新询盘线索</h2><p className="mt-1 text-xs text-muted-foreground">独立站访客最新提交的需求</p></div></div><button onClick={() => navigate('/storefront/leads')} className="text-sm font-semibold text-primary">进入线索池</button></div><AppTable size="middle" pagination={false} rowKey="id" dataSource={storefront?.recentLeads || []} columns={[{ title: '客户', render: (_, row) => <div><span>{row.name || '-'}</span><div className="text-xs text-muted-foreground">{row.company || '-'}</div></div> }, { title: '联系方式', render: (_, row) => row.contact || row.email || row.phone || '-' }, { title: '采购需求', dataIndex: 'requirements', width: 320, ellipsis: true, render: value => value || '-' }, { title: '状态', dataIndex: 'status', width: 100, render: value => <LeadStatusTag status={value}/> }, { title: '提交时间', dataIndex: 'createdAt', render: value => value ? new Date(value).toLocaleString('zh-CN') : '-' }]}/></section>
  </PageContent>;
};

export default DashboardPage;
