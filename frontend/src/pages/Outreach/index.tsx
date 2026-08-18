import React, { useEffect, useMemo, useState } from 'react';
import { Input, Progress, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChart3, Bot, Clock3, MailCheck, MousePointerClick, Plus, Search, Send, Trash2 } from 'lucide-react';
import { outreachApi } from '../../services/api/index';
import type { OutreachCampaign, OutreachStats } from '../../services/api/index';
import { can } from '../../utils/permissions';

const emptyForm = { name: '', audienceType: 'customers' as const, audienceLabel: '全部有效客户', subject: '', content: '', scheduledAt: '' };

const OutreachPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [stats, setStats] = useState<OutreachStats>({ campaigns: 0, sent: 0, pending: 0, openRate: 0, replyRate: 0 });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [composer, setComposer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [items, summary] = await Promise.all([outreachApi.list(), outreachApi.stats()]);
    setCampaigns(items); setStats(summary);
  };
  useEffect(() => { void load().catch(() => message.error('开发信数据加载失败')); }, []);

  const data = useMemo(() => campaigns.filter(item => (status === 'all' || item.status === status) && item.name.toLowerCase().includes(keyword.trim().toLowerCase())), [campaigns, keyword, status]);
  const save = async (schedule: boolean) => {
    if (!form.name.trim() || !form.subject.trim() || !form.content.trim()) return message.warning('请完整填写任务名称、邮件主题和正文');
    if (schedule && !form.scheduledAt) return message.warning('请选择发送时间');
    setSaving(true);
    try {
      const created = await outreachApi.create({ name: form.name, audienceType: form.audienceType, audienceLabel: form.audienceLabel, subject: form.subject, content: form.content });
      if (schedule) await outreachApi.schedule(created.id, new Date(form.scheduledAt).toISOString());
      message.success(schedule ? '开发信任务已设置发送计划' : '开发信草稿已保存');
      setComposer(false); setForm(emptyForm); await load();
    } catch { message.error('保存失败，请检查权限、受众数据和发送时间'); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { await outreachApi.remove(id); message.success('任务已删除'); await load(); };

  const columns: ColumnsType<OutreachCampaign> = [
    { title: '开发任务', render: (_, row) => <div><b>{row.name}</b><div className="mt-1 text-xs text-muted-foreground">{row.audienceLabel || (row.audienceType === 'customers' ? '全部客户' : '全部线索')} · {row.recipientCount} 人</div></div> },
    { title: '状态', dataIndex: 'status', width: 110, render: value => <Tag color={value === 'completed' ? 'green' : value === 'sending' ? 'blue' : value === 'scheduled' ? 'gold' : 'default'}>{{ completed: '已完成', sending: '发送中', scheduled: '待发送', paused: '已暂停', draft: '草稿' }[value as string] || value}</Tag> },
    { title: '发送进度', width: 180, render: (_, row) => <div><Progress percent={row.recipientCount ? Math.round(row.sentCount / row.recipientCount * 100) : 0} size="small"/><span className="text-xs text-muted-foreground">已发送 {row.sentCount} / {row.recipientCount}</span></div> },
    { title: '打开率', width: 100, render: (_, row) => <b>{row.sentCount ? Math.round(row.openCount / row.sentCount * 100) : 0}%</b> },
    { title: '回复率', width: 100, render: (_, row) => <b className="text-emerald-600">{row.sentCount ? Math.round(row.replyCount / row.sentCount * 100) : 0}%</b> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 140, render: value => new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { title: '操作', width: 70, render: (_, row) => can('outreach.delete') && row.status !== 'sending' ? <button aria-label="删除任务" onClick={() => void remove(row.id)} className="text-red-500"><Trash2 size={15}/></button> : null },
  ];

  return <div className="space-y-5">
    <div className="flex items-end justify-between"><div><h1 className="page-title">开发信</h1><p className="page-subtitle">统一管理客户与线索触达，发送执行由后续邮件服务器承接</p></div>{can('outreach.create') && <button onClick={() => setComposer(!composer)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15}/>创建开发任务</button>}</div>
    <div className="grid grid-cols-4 gap-4">{[{ label: '累计已发送', value: stats.sent, sub: `${stats.campaigns} 个任务`, icon: Send, tone: 'bg-violet-100 text-violet-700' }, { label: '平均打开率', value: `${stats.openRate}%`, sub: '基于真实追踪数据', icon: MailCheck, tone: 'bg-blue-100 text-blue-700' }, { label: '平均回复率', value: `${stats.replyRate}%`, sub: '后续可转为商机', icon: MousePointerClick, tone: 'bg-emerald-100 text-emerald-700' }, { label: '待发送联系人', value: stats.pending, sub: '已排期任务', icon: Clock3, tone: 'bg-amber-100 text-amber-700' }].map(item => <div key={item.label} className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}><item.icon size={17}/></div><b className="text-2xl">{item.value}</b></div><div className="mt-3 text-xs font-semibold text-muted-foreground">{item.label}</div><div className="mt-1 text-[11px] text-muted-foreground">{item.sub}</div></div>)}</div>
    {composer && <div className="grid grid-cols-[1fr_320px] gap-4 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm"><div className="space-y-4"><h2 className="font-bold">创建开发任务</h2><div className="grid grid-cols-2 gap-3"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="任务名称" variant="filled"/><Select value={form.audienceType} onChange={audienceType => setForm({ ...form, audienceType, audienceLabel: audienceType === 'customers' ? '全部有效客户' : '全部站点线索' })} variant="filled" options={[{ value: 'customers', label: '全部有效客户' }, { value: 'leads', label: '全部站点线索' }]}/></div><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="邮件主题" variant="filled"/><Input.TextArea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} placeholder="输入产品卖点与触达内容…" variant="filled"/><div className="flex gap-2"><button disabled title="AI 生成服务接口已预留" className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary opacity-60"><Bot size={15}/>AI 生成（待接入）</button><button disabled={saving} onClick={() => void save(false)} className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary">保存草稿</button></div></div><aside className="rounded-xl bg-secondary/40 p-4"><h3 className="font-bold">发送计划</h3><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="mt-4"/><p className="mt-3 text-xs leading-5 text-muted-foreground">当前仅负责任务编排和受众快照，不会直接向外发送邮件。</p>{can('outreach.schedule') && <button disabled={saving} onClick={() => void save(true)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">保存并设置计划</button>}</aside></div>}
    <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">开发任务</h2><p className="mt-1 text-xs text-muted-foreground"><BarChart3 size={13} className="mr-1 inline"/>数据按当前租户和站点隔离</p></div><div className="flex gap-2"><Input value={keyword} onChange={e => setKeyword(e.target.value)} prefix={<Search size={14}/>} placeholder="搜索任务" className="w-52"/><Select value={status} onChange={setStatus} className="w-32" options={[{ value: 'all', label: '全部状态' }, { value: 'scheduled', label: '待发送' }, { value: 'draft', label: '草稿' }, { value: 'sending', label: '发送中' }, { value: 'completed', label: '已完成' }]}/></div></div><Table rowKey="id" dataSource={data} columns={columns} pagination={false}/></div>
  </div>;
};

export default OutreachPage;
