import React, { useState, useCallback, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  Plus,
  RefreshCw,
  ArrowUpRight,
  TrendingDown,
  ChevronRight,
  Bot,
  Globe,
  MessageSquare,
  ExternalLink,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  Star,
  FileText,
  Users,
  ShoppingCart,
  Download,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../services/api/index';
import type { Lead } from '../../types';

const statColors = [
  { label: '今日访客', color: '#7C6EF5', seed: 1.2 },
  { label: '新增线索', color: '#10B981', seed: 2.5 },
  { label: 'AI对话次数', color: '#8B5CF6', seed: 0.8 },
  { label: '本月订单额', color: '#F59E0B', seed: 3.1 },
];

type StatItem = { label: string; value: string; change: string; up: boolean; color: string; seed: number };

const activityIcons: Record<string, React.FC<{ className?: string }>> = {
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
};

const DashboardEmpty: React.FC<{
  icon?: React.ElementType;
  title?: string;
  description?: string;
  className?: string;
}> = ({ icon: Icon = FileText, title = '暂无相关数据', description = '产生业务数据后将在这里展示。', className = 'min-h-[160px]' }) => (
  <div className={`flex h-full w-full flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-6 text-center ${className}`}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
    <div className="text-sm font-bold text-foreground">{title}</div>
    <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>
  </div>
);

// ─────────────── Lead Detail Modal ───────────────

const LeadDetailModal: React.FC<{ lead: Lead; onClose: () => void }> = ({ lead, onClose }) => {
  const statusMap: Record<string, { label: string; cls: string }> = {
    new: { label: '新线索', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    contacted: { label: '已联系', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    converted: { label: '已转化', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
  const st = statusMap[lead.status] || statusMap.new;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-foreground">{lead.name}</h3>
              <p className="text-xs text-muted-foreground">{lead.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${st.cls}`}>{st.label}</span>
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-bold">{lead.tag}</span>
            <div className="flex items-center gap-1 ml-auto">
              <Star className="w-3.5 h-3.5 text-amber-400" fill="#F59E0B" />
              <span className="text-xs font-bold text-foreground">{lead.score}分</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Mail, label: '邮箱', value: lead.email },
              { icon: Phone, label: '电话', value: lead.phone },
              { icon: MapPin, label: '国家', value: lead.country },
              { icon: ShoppingCart, label: '意向产品', value: lead.product },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 p-3 bg-secondary rounded-xl">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{f.label}</div>
                    <div className="text-sm font-medium text-foreground truncate">{f.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />线索摘要
            </div>
            <div className="p-3.5 bg-secondary rounded-xl text-sm text-foreground leading-relaxed">{lead.summary}</div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {lead.time}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">发送邮件</button>
          <button className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">转为客户</button>
          <button className="flex-1 py-2.5 border border-border text-muted-foreground rounded-xl text-sm font-semibold hover:bg-secondary">标记已读</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────── Activity Feed Modal ───────────────

type ActivityItem = { icon: string; text: string; time: string; color: string };
const seededSpark = (seed: number, count: number) => Array.from({ length: count }, (_, i) => ({ v: Math.max(1, Math.round((Math.sin(i + seed) + 1.2) * seed * 10)) }));
const ActivityFeedModal: React.FC<{ onClose: () => void; activities: ActivityItem[] }> = ({ onClose, activities }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <h3 className="font-bold text-foreground">全部动态</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {activities.length === 0 ? <DashboardEmpty icon={Clock} title="暂无动态" description="业务操作和客户互动产生后，将在这里记录。" className="min-h-[240px]" /> : activities.map((a, i) => {
          const Icon = activityIcons[a.icon];
          return (
            <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${a.color}`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{a.text}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{a.time}</p>
              </div>
              <button className="text-xs text-primary font-medium hover:underline flex-shrink-0">详情</button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ─────────────── Stat Detail Modal ───────────────

const StatDetailModal: React.FC<{ stat: StatItem; onClose: () => void }> = ({ stat, onClose }) => {
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    value: Math.round((Math.sin(i + stat.seed) + 1.2) * stat.seed * 50),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">{stat.label}详情</h3>
            <p className="text-xs text-muted-foreground mt-0.5">今日实时数据</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            <span className={`inline-flex items-center gap-0.5 text-sm font-bold mt-1 ${stat.up ? 'text-emerald-600' : 'text-red-600'}`}>
              {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {stat.change} vs 昨日
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar dataKey="value" fill={stat.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: '峰值时段', value: '14:00–16:00' },
              { label: '平均值', value: String(Math.floor(Number(stat.value.replace(/,/g, '').replace('$', '')) / 24)) },
              { label: '趋势', value: stat.up ? '上升' : '下降' },
            ].map((m, i) => (
              <div key={i} className="text-center p-3 bg-secondary rounded-xl">
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────── Dashboard Page ───────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>(statColors.map(s => ({ ...s, value: '--', change: '--', up: true })));
  const [topProducts, setTopProducts] = useState<{ name: string; views: number; inquiries: number; rate: number }[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [aiPerformance, setAiPerformance] = useState({ chats: 0, leads: 0, responseRate: 0, satisfaction: 0, activeAgents: 0 });
  const [trafficData, setTrafficData] = useState(Array.from({ length: 7 }, (_, i) => ({ day: `周${'一二三四五六日'[i]}`, visitors: 0, leads: 0, aiChats: 0 })));
  const activities: ActivityItem[] = recentLeads.map(lead => ({ icon: 'MessageCircle', text: `${lead.name} 提交了 ${lead.product} 询盘`, time: lead.time || '刚刚', color: 'bg-violet-100' }));
  const hasAiPerformance = Object.values(aiPerformance).some(value => value > 0);
  const hasTrafficData = trafficData.some(item => item.visitors > 0 || item.leads > 0 || item.aiChats > 0);

  useEffect(() => {
    dashboardApi.getStats().then((data: any) => {
      setTopProducts(data.topProducts || []);
      setRecentLeads(data.recentLeads || []);
      if (data.traffic?.length) setTrafficData(data.traffic);
      setAiPerformance({ chats: data.aiChats || 0, leads: data.aiLeads || 0, responseRate: data.aiChats ? Math.round((data.aiLeads || 0) / data.aiChats * 100) : 0, satisfaction: data.aiSatisfaction || 0, activeAgents: data.activeAgents || 0 });
      const visitors = data.traffic?.at(-1)?.visitors ?? 0;
      setStats([
        { label: '今日访客', value: String(visitors), change: '0%', up: true, color: '#7C6EF5', seed: 1.2 },
        { label: '新增线索', value: String(data.newLeads ?? 0), change: '0%', up: true, color: '#10B981', seed: 2.5 },
        { label: 'AI对话次数', value: String(data.aiChats ?? 0), change: '0%', up: true, color: '#8B5CF6', seed: 0.8 },
        { label: '客户累计成交额', value: `$${Number(data.customerValue || 0).toLocaleString()}`, change: '0%', up: true, color: '#F59E0B', seed: 3.1 },
      ]);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    dashboardApi.getStats().then((data: any) => {
      setTopProducts(data.topProducts || []);
      setRecentLeads(data.recentLeads || []);
      if (data.traffic?.length) setTrafficData(data.traffic);
      setAiPerformance({ chats: data.aiChats || 0, leads: data.aiLeads || 0, responseRate: data.aiChats ? Math.round((data.aiLeads || 0) / data.aiChats * 100) : 0, satisfaction: data.aiSatisfaction || 0, activeAgents: data.activeAgents || 0 });
      const visitors = data.traffic?.at(-1)?.visitors ?? 0;
      setStats([
        { label: '今日访客', value: String(visitors), change: '0%', up: true, color: '#7C6EF5', seed: 1.2 },
        { label: '新增线索', value: String(data.newLeads ?? 0), change: '0%', up: true, color: '#10B981', seed: 2.5 },
        { label: 'AI对话次数', value: String(data.aiChats ?? 0), change: '0%', up: true, color: '#8B5CF6', seed: 0.8 },
        { label: '客户累计成交额', value: `$${Number(data.customerValue || 0).toLocaleString()}`, change: '0%', up: true, color: '#F59E0B', seed: 3.1 },
      ]);
    }).catch(() => { }).finally(() => setIsRefreshing(false));
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">工作台</h1>
          <p className="text-sm text-muted-foreground mt-0.5">欢迎回来，张经理 · 上次登录 2026-07-08 08:32</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '刷新中...' : '数据刷新'}
          </button>
          <button onClick={() => navigate('/products/new')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" />添加商品
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => setSelectedStat(stat)}
            className="backdrop-blur-xl bg-white/80 rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${stat.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={36}>
                <AreaChart data={seededSpark(stat.seed, 100)}>
                  <Area type="monotone" dataKey="v" stroke={stat.color} fill={stat.color} fillOpacity={0.12} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Side Widgets */}
      <div className="grid grid-cols-3 gap-5">
        {/* Traffic Chart */}
        <div className="col-span-2 flex min-h-64 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground text-sm">本周流量与线索趋势</h2>
              <p className="text-xs text-muted-foreground mt-0.5">访客数 vs 新增线索</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded inline-block" /><span className="text-muted-foreground">访客</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded inline-block" /><span className="text-muted-foreground">线索</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-500 rounded inline-block" /><span className="text-muted-foreground">AI对话</span></div>
            </div>
          </div>
          {hasTrafficData ? <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trafficData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dash-traffic-visitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C6EF5" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7C6EF5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dash-traffic-leads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Area type="monotone" dataKey="visitors" name="访客" stroke="#7C6EF5" fill="url(#dash-traffic-visitors)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="leads" name="线索" stroke="#10B981" fill="url(#dash-traffic-leads)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="aiChats" name="AI对话" stroke="#8B5CF6" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer> : <DashboardEmpty icon={Globe} title={loading ? '正在加载趋势数据' : '暂无流量趋势'} description={loading ? '正在获取本周访客、线索和 AI 对话数据…' : '独立站产生访问或线索后，这里将展示本周趋势。'} className="min-h-[180px]" />}
        </div>

        {/* Right Column: Top Products + Activity */}
        <div className="flex flex-col gap-4">
          {/* Top Products */}
          <div className="flex flex-1 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-4">
            <h2 className="font-bold text-foreground text-sm mb-3">热销商品</h2>
            {topProducts.length === 0 ? <DashboardEmpty icon={ShoppingCart} title={loading ? '正在加载商品数据' : '暂无热销商品'} description={loading ? '正在获取商品表现数据…' : '商品产生浏览或询盘后，这里将展示热门排行。'} className="min-h-[140px]" /> : <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/products')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate flex-1 mr-2">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.inquiries} 询盘</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>}
          </div>
          {/* AI Performance */}
          <div className="flex flex-1 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">AI助手今日表现</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${aiPerformance.activeAgents ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />{aiPerformance.activeAgents ? `${aiPerformance.activeAgents} 个运行中` : '未运行'}
              </span>
            </div>
            {hasAiPerformance ? <div className="grid grid-cols-2 gap-2">
              {[[String(aiPerformance.chats), '总对话', 'text-primary'], [String(aiPerformance.leads), '转为线索', 'text-emerald-600'], [`${aiPerformance.responseRate}%`, '线索转化率', 'text-violet-500'], [`${aiPerformance.satisfaction}★`, '满意度', 'text-amber-500']].map(([v, l, c]) => (
                <div key={l} className="bg-secondary/60 rounded-xl p-2.5 cursor-pointer hover:bg-secondary transition-colors" onClick={() => navigate('/ai-center')}>
                  <div className={`text-lg font-bold ${c}`}>{v}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l}</div>
                </div>
              ))}
            </div> : <DashboardEmpty icon={Bot} title={loading ? '正在加载 AI 数据' : '暂无 AI 运行数据'} description={loading ? '正在获取智能体表现数据…' : '智能体开始运行并产生对话后，这里将展示今日表现。'} className="min-h-[140px]" />}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Leads + Activity Feed */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 flex min-h-80 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-foreground text-sm">最近线索</h2>
            <button onClick={() => navigate('/leads')} className="text-xs text-primary hover:underline flex items-center gap-1">
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentLeads.length === 0 ? <div className="flex flex-1 p-5"><DashboardEmpty icon={Users} title={loading ? '正在加载线索' : '暂无最近线索'} description={loading ? '正在获取最新客户线索…' : '访客提交询盘或 AI 识别出采购意向后，线索将出现在这里。'} /></div> : <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {['客户', '邮箱', '国家', '意向产品', '来源', '时间'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.slice(0, 5).map((lead, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedLead(lead)}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">{lead.name.charAt(0)}</div>
                      <span className="text-sm font-medium text-foreground">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{lead.email}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{lead.country}</td>
                  <td className="px-5 py-3 text-xs text-foreground">{lead.product}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">AI助手</span></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{lead.time ? lead.time.split(' ')[1] || lead.time : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>

        {/* Activity Feed */}
        <div className="flex min-h-80 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-4">
          <h2 className="font-bold text-foreground text-sm mb-4">实时动态</h2>
          {activities.length === 0 ? <DashboardEmpty icon={Clock} title={loading ? '正在加载动态' : '暂无实时动态'} description={loading ? '正在获取最新业务动态…' : '线索、客户和智能体产生业务活动后，将在这里记录。'} className="min-h-[190px]" /> : <div className="space-y-3">
            {activities.slice(0, 4).map((a, i) => {
              const Icon = activityIcons[a.icon];
              return (
                <div key={i} className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowActivityFeed(true)}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>}
          {activities.length > 0 && <button
            onClick={() => setShowActivityFeed(true)}
            className="mt-4 w-full py-2 text-xs text-primary font-medium border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
          >
            查看全部动态
          </button>}
        </div>
      </div>

      {/* Modals */}
      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
      {showActivityFeed && <ActivityFeedModal activities={activities} onClose={() => setShowActivityFeed(false)} />}
      {selectedStat && <StatDetailModal stat={selectedStat} onClose={() => setSelectedStat(null)} />}
    </div>
  );
};

export default DashboardPage;
