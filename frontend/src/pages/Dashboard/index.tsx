import React, { useEffect, useState } from 'react';
import { ArrowRight, Boxes, CircleDollarSign, Globe2, PackageCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../services/api/index';
import { PageContent, PageHeader } from '../../components/shared';

type Stats = {
  totalProducts: number;
  publishedProducts: number;
  totalCustomers: number;
  customerValue: number;
  topProducts: Array<{ name: string; stock: number; status: string }>;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>();
  useEffect(() => { dashboardApi.getStats().then(setStats).catch(() => setStats(undefined)); }, []);

  const cards = [
    { label: '商品总数', value: stats?.totalProducts ?? 0, icon: Boxes, tone: 'bg-indigo-50 text-indigo-600' },
    { label: '已发布商品', value: stats?.publishedProducts ?? 0, icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { label: '客户数量', value: stats?.totalCustomers ?? 0, icon: Users, tone: 'bg-amber-50 text-amber-600' },
    { label: '客户累计金额', value: `¥${Number(stats?.customerValue || 0).toLocaleString()}`, icon: CircleDollarSign, tone: 'bg-sky-50 text-sky-600' },
  ];

  return <PageContent>
    <PageHeader title="经营概览" description="聚焦外贸 ERP 商品、客户与独立站运营" action={<button onClick={() => navigate('/site-editor')} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">管理独立站 <ArrowRight size={15}/></button>}/>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19}/></div><div className="text-2xl font-bold">{value}</div><div className="mt-1 text-sm text-muted-foreground">{label}</div></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
      <section className="rounded-2xl border bg-card p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">重点商品</h2><p className="mt-1 text-xs text-muted-foreground">按当前库存展示已发布商品</p></div><button onClick={() => navigate('/products')} className="text-sm font-semibold text-primary">全部商品</button></div><div className="divide-y">{(stats?.topProducts || []).map(item => <div key={item.name} className="flex items-center justify-between py-3"><div className="font-medium">{item.name || '未命名商品'}</div><div className="text-sm text-muted-foreground">库存 {item.stock}</div></div>)}{stats && !stats.topProducts.length && <div className="py-12 text-center text-sm text-muted-foreground">暂无已发布商品</div>}</div></section>
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-indigo-50 p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white"><Globe2 size={21}/></div><h2 className="mt-5 text-lg font-bold">独立站</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">设计页面、管理域名、配置 SEO，并将 ERP 商品同步发布到品牌站点。</p><button onClick={() => navigate('/site-editor')} className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">进入站点设计 <ArrowRight size={15}/></button></section>
    </div>
  </PageContent>;
};

export default DashboardPage;
