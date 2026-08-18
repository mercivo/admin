import React, { useState, useEffect, useRef } from 'react';
import { Input, Select } from 'antd';
import {
  Plus,
  Bot,
  MessageSquare,
  Users,
  Star,
  Edit,
  Upload,
  Trash2,
  AlertCircle,
  FileText,
  Mail,
  ShoppingCart,
  X,
  Play,
  Pause,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { agentApi, workspaceApi } from '../../services/api/index';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../../components/shared';
import type { Agent } from '../../types';
import type { AgentPreset, KnowledgeFile } from '../../services/api/index';
import { can } from '../../utils/permissions';

const statusMap: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: '运行中', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
  paused: { label: '已暂停', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  MessageSquare, ShoppingCart, Mail, FileText,
};

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}> = ({ icon: Icon, title, description, action, compact = false }) => (
  <div className={`flex h-full w-full flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-6 text-center ${compact ? 'min-h-40 py-8' : 'min-h-64 py-12'}`}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
    <div className="text-sm font-bold text-foreground">{title}</div>
    <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

type AgentType = 'sales' | 'translation' | 'sourcing';
const AGENT_PRESETS: Record<AgentType, { label: string; desc: string; name: string; lang: string; systemPrompt: string }> = {
  sales: {
    label: '询盘智能体',
    desc: '自动接待独立站访客，识别采购意向并将有效询盘沉淀为客户线索。',
    name: '询盘智能体',
    lang: '多语言',
    systemPrompt: '',
  },
  translation: {
    label: '翻译智能体',
    desc: '将独立站的中文内容生成为目标语言版本，并按发布版本缓存。',
    name: '翻译智能体',
    lang: '多语言',
    systemPrompt: '保留品牌名、商品编码、数值、计量单位、链接和 HTML 结构，使用符合目标市场的自然 B2B 商业表达。',
  },
  sourcing: {
    label: '选品智能体',
    desc: '结合商品、客户与市场需求生成选品建议，预留后续供应链数据接口。',
    name: '选品智能体',
    lang: '多语言',
    systemPrompt: '',
  },
};

// ─────────────── Create/Edit Agent Modal ───────────────
const AgentFormModal: React.FC<{
  agent?: Agent;
  onClose: () => void;
  onSave: (data: Partial<Agent>) => void;
}> = ({ agent, onClose, onSave }) => {
  const isEdit = !!agent;
  const initialType: AgentType = agent?.agentType || 'sales';
  const initialPreset = AGENT_PRESETS[initialType];
  const [form, setForm] = useState({
    name: agent?.name || initialPreset.name,
    desc: agent?.desc || initialPreset.desc,
    model: agent?.model || 'GPT-4o',
    lang: agent?.lang || initialPreset.lang,
    agentType: initialType,
    systemPrompt: agent?.systemPrompt || initialPreset.systemPrompt,
  });

  const applyPreset = (agentType: AgentType) => {
    const preset = AGENT_PRESETS[agentType];
    setForm(current => ({ ...current, agentType, name: preset.name, desc: preset.desc, lang: preset.lang, systemPrompt: preset.systemPrompt }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">{isEdit ? '编辑智能体' : '新建智能体'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {!isEdit && <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">选择智能体用途</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(AGENT_PRESETS) as Array<[AgentType, typeof AGENT_PRESETS[AgentType]]>).map(([type, preset]) => {
                const selected = form.agentType === type;
                return <button key={type} type="button" onClick={() => applyPreset(type)} className={`rounded-xl border p-4 text-left transition-all ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/40 hover:bg-secondary/40'}`}>
                  <div className="mb-1 flex items-center gap-2"><Bot className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} /><span className="text-sm font-bold text-foreground">{preset.label}</span></div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{preset.desc}</p>
                </button>;
              })}
            </div>
          </div>}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">名称</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="智能体名称" variant="filled" size="middle" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">描述</label>
            <Input.TextArea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} rows={3} placeholder="描述智能体的功能..." variant="filled" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">AI 模型</label>
              <Select value={form.model} onChange={v => setForm({ ...form, model: v })} style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'GPT-4o', label: 'GPT-4o' }, { value: 'Claude Sonnet', label: 'Claude Sonnet' }, { value: 'GPT-4o-mini', label: 'GPT-4o-mini' }]} />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">支持语言</label>
              <Input value={form.lang} onChange={e => setForm({ ...form, lang: e.target.value })} placeholder="中/英/西" variant="filled" size="middle" />
            </div>
          </div>
          {isEdit && <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">智能体用途</label>
            <Select value={form.agentType} onChange={applyPreset} style={{ width: '100%' }} variant="filled" options={[{ value: 'sales', label: '询盘智能体' }, { value: 'translation', label: '翻译智能体' }, { value: 'sourcing', label: '选品智能体' }]} />
          </div>}
          {form.agentType === 'translation' && <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">翻译系统提示词</label>
            <Input.TextArea value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} rows={4} placeholder="例如：保持品牌名、型号、数字和计量单位不变，使用专业 B2B 营销语气。" variant="filled" />
          </div>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">{isEdit ? '保存修改' : '创建智能体'}</button>
        </div>
      </div>
    </div >
  );
};

// ─────────────── Delete Confirm Modal ───────────────
const DeleteConfirmModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">确认删除智能体</h3>
        <p className="text-sm text-muted-foreground">确定要删除 <strong className="text-foreground">{name}</strong> 吗？此操作不可撤销，所有对话数据将被清除。</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认删除</button>
      </div>
    </div>
  </div>
);

const AICenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [presets, setPresets] = useState<AgentPreset[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([agentApi.list(), workspaceApi.listKnowledge(), agentApi.listPresets()]).then(([agentItems, files, presetItems]) => {
      setAgents(agentItems); setKnowledgeFiles(files); setPresets(presetItems);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleCreateAgent = async (data: Partial<Agent>) => {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: data.name || '新智能体',
      desc: data.desc || '',
      status: 'draft',
      model: data.model || 'GPT-4o',
      lang: data.lang || '中/英',
      agentType: data.agentType || 'sales', systemPrompt: data.systemPrompt || '',
      chats: 0, leads: 0, rate: '—', satisfaction: 0,
      icon: 'Bot', color: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    try {
      const created = await agentApi.create(newAgent);
      setAgents(prev => [...prev, created]);
    } catch {
      setToast({ message: '创建智能体失败，请重试', type: 'error' });
      return;
    }
    setShowCreateModal(false);
    setToast({ message: `智能体 "${newAgent.name}" 已创建`, type: 'success' });
  };

  const handleInstallPreset = async (preset: AgentPreset) => {
    try {
      const created = await agentApi.installPreset(preset.id);
      setAgents(current => [created, ...current]);
      setToast({ message: `已添加平台智能体“${preset.name}”`, type: 'success' });
      setActiveTab('agents');
    } catch {
      setToast({ message: '添加失败，请检查套餐智能体配额和操作权限', type: 'error' });
    }
  };

  const uploadKnowledge = async (file?: File) => {
    if (!file) return;
    if (file.size > 500_000) return setToast({ message: '知识文档不能超过 500 KB', type: 'error' });
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) return setToast({ message: '当前支持 TXT、Markdown、CSV 和 JSON 文本文档', type: 'error' });
    try {
      const content = await file.text();
      const created = await workspaceApi.createKnowledge({ name: file.name, type: file.name.split('.').pop()?.toUpperCase() || 'TXT', size: `${Math.max(1, Math.ceil(file.size / 1024))} KB`, content });
      setKnowledgeFiles(current => [created, ...current]);
      setToast({ message: `“${file.name}”已加入知识库`, type: 'success' });
    } catch { setToast({ message: '知识文档上传失败', type: 'error' }); }
    if (knowledgeInputRef.current) knowledgeInputRef.current.value = '';
  };

  const handleEditAgent = async (data: Partial<Agent>) => {
    if (!editAgent) return;
    try {
      const updated = await agentApi.update(String(editAgent.id), data);
      setAgents(prev => prev.map(a => a.id === editAgent.id ? updated : a));
    } catch {
      setToast({ message: '更新智能体失败，请重试', type: 'error' });
      return;
    }
    setEditAgent(null);
    setToast({ message: `智能体 "${data.name}" 已更新`, type: 'success' });
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgent) return;
    try {
      await agentApi.remove(String(deleteAgent.id));
      setAgents(prev => prev.filter(a => a.id !== deleteAgent.id));
    } catch {
      setToast({ message: '删除智能体失败，请重试', type: 'error' });
      return;
    }
    setDeleteAgent(null);
    setToast({ message: `已删除 "${deleteAgent.name}"`, type: 'success' });
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await agentApi.update(String(agent.id), { status: newStatus });
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
    } catch {
      setToast({ message: '切换智能体状态失败，请重试', type: 'error' });
      return;
    }
    setToast({ message: `"${agent.name}" 已${newStatus === 'active' ? '启动' : '暂停'}`, type: 'success' });
  };
  const hasAnalyticsData = agents.some(agent => agent.chats > 0 || agent.leads > 0);
  const agentsWithConversations = agents.filter(agent => agent.status !== 'draft' && agent.chats > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">智能体中心</h1>
          <p className="text-sm text-muted-foreground mt-0.5">通过询盘与翻译智能体，完成独立站访客接待、线索沉淀和多语言发布</p>
        </div>
        {can('agent.create') && <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />新建智能体
        </button>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '运行中智能体', value: agents.filter(a => a.status === 'active').length, sub: `共 ${agents.length} 个`, icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
          { label: '今日对话总量', value: agents.reduce((s, a) => s + a.chats, 0), sub: '+18% vs 昨日', icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'AI生成线索', value: agents.reduce((s, a) => s + a.leads, 0), sub: '本周累计', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '平均满意度', value: (agents.filter(a => a.satisfaction > 0).reduce((s, a) => s + a.satisfaction, 0) / agents.filter(a => a.satisfaction > 0).length || 0).toFixed(1), sub: '最近 30 天', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{s.label}</span><div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}><Icon className={`w-4 h-4 ${s.color}`} /></div></div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {[{ id: 'agents', label: '智能体列表' }, { id: 'presets', label: '平台预制' }, { id: 'analytics', label: '数据分析' }, { id: 'knowledge', label: '知识库' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'agents' && (
        <div className="grid grid-cols-2 gap-4">
          {!loading && agents.length === 0 && <div className="col-span-2 rounded-2xl border border-white/60 bg-white p-4 shadow-sm">
            <EmptyState
              icon={Bot}
              title="暂无智能体"
              description="创建询盘智能体或翻译智能体后，可在这里统一配置、启停并查看运行数据。"
              action={can('agent.create') ? <button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90"><Plus className="mr-1.5 inline h-3.5 w-3.5" />新建智能体</button> : undefined}
            />
          </div>}
          {loading && <div className="col-span-2 rounded-2xl border border-white/60 bg-white p-4 shadow-sm"><EmptyState icon={Bot} title="正在加载智能体" description="正在获取智能体配置，请稍候…" /></div>}
          {agents.map(ag => {
            const Icon = iconMap[ag.icon] || Bot;
            const st = statusMap[ag.status];
            const isSelected = selectedAgent === ag.id;
            return (
              <div key={ag.id} onClick={() => setSelectedAgent(isSelected ? null : ag.id)} className={`bg-white rounded-2xl border-2 p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isSelected ? 'border-primary shadow-md' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${ag.color}`}><Icon className="w-5 h-5" /></div>
                    <div><div className="font-bold text-foreground text-sm">{ag.name}</div><div className="text-xs text-muted-foreground mt-0.5">{ag.model} · {ag.lang} · {ag.agentType === 'translation' ? '独立站翻译' : '询盘销售'}</div></div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{ag.desc}</p>
                {ag.status !== 'draft' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: '对话次数', value: ag.chats }, { label: '线索数', value: ag.leads }, { label: '转化率', value: ag.rate }].map(m => (
                      <div key={m.label} className="text-center p-2.5 bg-secondary rounded-xl"><div className="font-bold text-foreground text-sm">{m.value}</div><div className="text-xs text-muted-foreground mt-0.5">{m.label}</div></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border-2 border-dashed border-border"><AlertCircle className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">智能体尚未配置，点击完成设置后发布</span></div>
                )}
                {can('agent.edit') && <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                  {ag.status === 'active' ? (
                    <>
                      <button onClick={() => handleToggleStatus(ag)} className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary flex items-center justify-center gap-1"><Pause className="w-3 h-3" />暂停</button>
                      <button onClick={() => setEditAgent(ag)} className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"><Edit className="w-3 h-3 inline mr-1" />编辑</button>
                      <button onClick={() => navigate('/ai-chat')} className="flex-1 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20">查看对话</button>
                    </>
                  ) : ag.status === 'paused' ? (
                    <>
                      <button onClick={() => handleToggleStatus(ag)} className="flex-1 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1"><Play className="w-3 h-3" />重新启动</button>
                      <button onClick={() => setEditAgent(ag)} className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary"><Edit className="w-3 h-3 inline mr-1" />编辑</button>
                      <button onClick={() => setDeleteAgent(ag)} className="flex-1 py-2 border border-red-200 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3 inline mr-1" />删除</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditAgent(ag)} className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90">立即配置</button>
                      <button onClick={() => setDeleteAgent(ag)} className="flex-1 py-2 border border-red-200 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3 inline mr-1" />删除</button>
                    </>
                  )}
                </div>}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="grid grid-cols-3 gap-4">
          {presets.length === 0 && <div className="col-span-3 rounded-2xl border border-white/60 bg-white p-4 shadow-sm"><EmptyState icon={Bot} title="暂无平台预制智能体" description="平台发布翻译、询盘或选品智能体后，会自动出现在这里供有权限的商户添加。" /></div>}
          {presets.map(preset => <div key={preset.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${preset.color}`}><Bot className="h-5 w-5" /></div><div><div className="text-sm font-bold text-foreground">{preset.name}</div><div className="text-xs text-muted-foreground">{preset.model} · {preset.lang}</div></div></div>
            <p className="min-h-12 text-xs leading-5 text-muted-foreground">{preset.description}</p>
            {can('agent.create') && <button onClick={() => void handleInstallPreset(preset)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90"><Plus className="mr-1.5 inline h-3.5 w-3.5" />添加到当前站点</button>}
          </div>)}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex min-h-72 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-sm">本周智能体对话与线索趋势</h3>
              <div className="flex gap-3 text-xs"><div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded" /><span className="text-muted-foreground">对话次数</span></div><div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" /><span className="text-muted-foreground">线索数</span></div></div>
            </div>
            {hasAnalyticsData ? <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={agents.map((agent, index) => ({ day: agent.name.slice(0, 4) || String(index + 1), chats: agent.chats, leads: agent.leads }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ai-center-chats" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C6EF5" stopOpacity={0.15} /><stop offset="100%" stopColor="#7C6EF5" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ai-center-leads" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.15} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Area type="monotone" dataKey="chats" name="对话" stroke="#7C6EF5" fill="url(#ai-center-chats)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="leads" name="线索" stroke="#10B981" fill="url(#ai-center-leads)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer> : <EmptyState compact icon={MessageSquare} title="暂无趋势数据" description="智能体产生对话或线索后，这里将展示趋势变化。" />}
          </div>
          <div className="flex min-h-72 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
            <h3 className="font-bold text-foreground text-sm mb-4">各智能体对话占比</h3>
            {agentsWithConversations.length > 0 ? <><div className="space-y-3">
              {agentsWithConversations.map((a, i) => {
                const total = agents.reduce((s, ag) => s + ag.chats, 0);
                const pct = total > 0 ? Math.round((a.chats / total) * 100) : 0;
                const colors = ['bg-primary', 'bg-violet-500', 'bg-amber-500'];
                return (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-1 text-xs"><span className="text-foreground font-medium truncate flex-1 mr-2">{a.name}</span><span className="text-muted-foreground font-bold">{pct}%</span></div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${colors[i] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div><div className="mt-5 pt-4 border-t border-border space-y-2">
              {[['最高转化率', '询盘接待助手', '24.4%'], ['最活跃时段', '14:00–18:00', '高峰期'], ['主要来源地区', '美国 · 欧洲', '62%']].map(([l, v, s]) => (
                <div key={l} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{l}</span><div className="text-right"><span className="font-bold text-foreground">{v}</span><span className="text-muted-foreground ml-1.5">{s}</span></div></div>
              ))}
            </div></> : <EmptyState compact icon={Bot} title="暂无对话分布" description="运行中的智能体产生对话后，这里将展示各智能体占比。" />}
          </div>
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="flex min-h-80 flex-col backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="font-bold text-foreground">知识库管理</h3><p className="text-xs text-muted-foreground mt-0.5">上传产品资料、FAQ、价格单，AI将自动学习并应用到对话中</p></div>
            {can('agent.knowledge') && <><input ref={knowledgeInputRef} type="file" accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json" className="hidden" onChange={event => void uploadKnowledge(event.target.files?.[0])}/><button onClick={() => knowledgeInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary"><Upload className="w-4 h-4" />上传文件</button></>}
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {!loading && knowledgeFiles.length === 0 && <EmptyState compact icon={FileText} title="知识库暂无内容" description="上传产品资料、FAQ 或价格单，智能体即可基于企业知识回答访客问题。" />}
            {loading && <EmptyState compact icon={FileText} title="正在加载知识库" description="正在获取知识文件，请稍候…" />}
            {knowledgeFiles.map(f => (
              <div key={f.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0"><div className="font-semibold text-foreground text-sm truncate">{f.name}</div><div className="text-xs text-muted-foreground mt-0.5">{f.size} · {f.chunks} 个知识块 · 上传于 {new Date(f.createdAt).toLocaleDateString()}</div></div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${f.status === 'indexed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{f.status === 'indexed' ? '已学习' : '处理中'}</span>
                {can('agent.knowledge') && <button onClick={async () => { try { await workspaceApi.deleteKnowledge(f.id); setKnowledgeFiles(v => v.filter(x => x.id !== f.id)); setToast({ message: `已删除 "${f.name}"`, type: 'success' }); } catch { setToast({ message: '删除知识文件失败', type: 'error' }); } }} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
          {can('agent.knowledge') && <div onClick={() => knowledgeInputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void uploadKnowledge(event.dataTransfer.files?.[0]); }} className="mt-5 border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <div className="text-sm font-semibold text-muted-foreground">拖拽文件到此处，或点击上传</div>
            <div className="text-xs text-muted-foreground mt-1">支持 TXT、Markdown、CSV、JSON，单文件最大 500 KB</div>
          </div>}
        </div>
      )}

      {showCreateModal && <AgentFormModal onClose={() => setShowCreateModal(false)} onSave={handleCreateAgent} />}
      {editAgent && <AgentFormModal agent={editAgent} onClose={() => setEditAgent(null)} onSave={handleEditAgent} />}
      {deleteAgent && <DeleteConfirmModal name={deleteAgent.name} onClose={() => setDeleteAgent(null)} onConfirm={handleDeleteAgent} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AICenterPage;
