import React, { useState, useEffect } from 'react';
import { Empty, Input } from 'antd';
import {
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Tag,
  Clock,
  X,
  List,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bot,
  MoreHorizontal,
  CheckCircle,
  UserPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge, ScoreDot, Toast } from '../../components/shared';
import { leadApi } from '../../services/api/index';
import type { Lead } from '../../types';
import { can } from '../../utils/permissions';

const getKanbanCols = (leads: Lead[]) => [
  { id: 'new', label: '新线索', headerColor: 'bg-blue-500', color: 'border-blue-100 bg-blue-50/30', count: leads.filter(l => l.status === 'new').length },
  { id: 'contacted', label: '已联系', headerColor: 'bg-amber-500', color: 'border-amber-100 bg-amber-50/30', count: leads.filter(l => l.status === 'contacted').length },
  { id: 'converted', label: '已转化', headerColor: 'bg-emerald-500', color: 'border-emerald-100 bg-emerald-50/30', count: leads.filter(l => l.status === 'converted').length },
];

const LeadEmptyState: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex min-h-60 items-center justify-center ${className}`}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无客户线索" />
  </div>
);

const SALES_MEMBERS = [
  { name: '张明', email: 'admin@maixiwo.com', avatar: 'photo-1472099645785-5658abf4ff4e' },
  { name: '李小红', email: 'lixiaohong@maixiwo.com', avatar: 'photo-1494790108377-be9c29b29330' },
  { name: '王大明', email: 'wangdaming@maixiwo.com', avatar: 'photo-1500648767791-00dcc994a43e' },
];

const downloadLeads = (leads: Lead[]) => {
  const rows = [['姓名', '企业', '邮箱', '电话', '国家', '意向商品', '状态', '评分', '负责人'], ...leads.map(lead => [lead.name, lead.company, lead.email, lead.phone, lead.country, lead.product, lead.status, String(lead.score), lead.assignedTo || ''])];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `mercivo-leads-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
};

// ─────────────── Confirm Modal ───────────────
const ConfirmModal: React.FC<{
  title: string; desc: string; confirmLabel: string; confirmCls?: string;
  onClose: () => void; onConfirm: () => void;
}> = ({ title, desc, confirmLabel, confirmCls, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold ${confirmCls || 'bg-primary hover:bg-primary/90'}`}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// ─────────────── Assign Sales Modal ───────────────
const AssignModal: React.FC<{ leadName: string; onClose: () => void; onConfirm: (name: string) => void }> = ({ leadName, onClose, onConfirm }) => {
  const [selected, setSelected] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">分配销售</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">将 <strong className="text-foreground">{leadName}</strong> 分配给：</p>
          {SALES_MEMBERS.map(m => (
            <button
              key={m.email}
              onClick={() => setSelected(m.name)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${selected === m.name ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
            >
              <img src={`https://images.unsplash.com/${m.avatar}?w=40&h=40&fit=crop&auto=format`} alt={m.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="font-semibold text-foreground text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              {selected === m.name && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
            </button>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button onClick={() => selected && onConfirm(selected)} disabled={!selected} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50">确认分配</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────── Conversation Modal ───────────────
const ConvModal: React.FC<{ leadName: string; onClose: () => void }> = ({ leadName, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-bold text-foreground text-sm">AI对话记录</h3>
            <p className="text-xs text-muted-foreground">{leadName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-gray-50 space-y-3">
        {[
          { type: 'ai', text: "Hi! Welcome to EcoBags. I'm Anna. Are you looking for specific products?" },
          { type: 'user', text: "Yes, I need eco shopping bags for my retail stores. What's the MOQ?" },
          { type: 'ai', text: 'Great! Our MOQ for Eco Shopping Bags is 500 pcs. We also offer custom logo printing. How many stores do you have?' },
          { type: 'user', text: 'About 12 stores, so I need around 500-1000 bags per store.' },
          { type: 'ai', text: 'Perfect! For 6,000-12,000 pcs we can offer better pricing. Could you share your email for a detailed quotation?' },
          { type: 'user', text: "Sure, it's sarah@greenlife.com" },
          { type: 'system', text: 'Quotation sent to sarah@greenlife.com. Our team will follow up within 24 hours.' },
        ].map((msg, i) => (
          <div key={i}>
            {msg.type === 'system' ? (
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground px-2 bg-gray-50">{msg.text}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : msg.type === 'ai' ? (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="max-w-[75%] bg-white border border-border rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-foreground shadow-sm">{msg.text}</div>
              </div>
            ) : msg.type === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] bg-primary text-white rounded-2xl rounded-tr-sm px-3 py-2 text-xs">{msg.text}</div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────── Lead Detail Side Panel ───────────────
const LeadDetailPanel: React.FC<{
  lead: Lead;
  onClose: () => void;
  onConvert: () => void;
  onAssign: () => void;
  onViewConv: () => void;
}> = ({ lead, onClose, onConvert, onAssign, onViewConv }) => (
  <>
    <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-border z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">{lead.name.charAt(0)}</div>
          <div>
            <div className="font-bold text-foreground text-sm">{lead.name}</div>
            <div className="text-xs text-muted-foreground">{lead.company}</div>
          </div>
          <StatusBadge status={lead.status} />
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <div className="px-5 py-4 border-b border-border bg-white">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Mail, label: '邮箱', value: lead.email },
            { icon: Phone, label: '电话', value: lead.phone },
            { icon: MapPin, label: '国家', value: lead.country },
            { icon: Tag, label: '意向产品', value: lead.product },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-2">
              <f.icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">{f.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-3 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">AI对话记录</span>
            <span className="text-xs text-muted-foreground">· {lead.time}</span>
          </div>
        </div>
        <div className="p-4 space-y-3 bg-gray-50">
          {[
            { type: 'ai', text: "Hi! Welcome to EcoBags. I'm Anna. Are you looking for specific products?" },
            { type: 'user', text: "Yes, I need eco shopping bags for my retail stores. What's the MOQ?" },
            { type: 'ai', text: 'Great! Our MOQ for Eco Shopping Bags is 500 pcs. We also offer custom logo printing. How many stores do you have?' },
            { type: 'user', text: 'About 12 stores, so I need around 500-1000 bags per store.' },
            { type: 'ai', text: 'Perfect! For 6,000-12,000 pcs we can offer better pricing. Could you share your email for a detailed quotation?' },
            { type: 'user', text: "Sure, it's sarah@greenlife.com" },
            { type: 'system', text: 'Quotation sent to sarah@greenlife.com. Our team will follow up within 24 hours.' },
          ].map((msg, i) => (
            <div key={i}>
              {msg.type === 'system' && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground px-2 bg-gray-50">{msg.text}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              {msg.type === 'ai' && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="max-w-[75%] bg-white border border-border rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-foreground shadow-sm">{msg.text}</div>
                </div>
              )}
              {msg.type === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-primary text-white rounded-2xl rounded-tr-sm px-3 py-2 text-xs">{msg.text}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border p-4 space-y-3 bg-white">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1.5">跟进备注</label>
          <Input.TextArea placeholder="添加跟进备注..." rows={2} variant="filled" />
        </div>
        <div className="flex gap-2">
          <button onClick={onConvert} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90">转为客户</button>
          <button onClick={onAssign} className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary">分配销售</button>
          <button onClick={onViewConv} className="py-2.5 px-3 border border-border rounded-xl text-xs text-muted-foreground hover:bg-secondary"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </>
);

// ─────────────── Leads Page ───────────────
const LeadsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [activeStatus, setActiveStatus] = useState('all');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    leadApi.list().then(setLeads).catch(() => { });
  }, []);

  // Modal states
  const [convertModal, setConvertModal] = useState<Lead | null>(null);
  const [assignModal, setAssignModal] = useState<Lead | null>(null);
  const [deleteModal, setDeleteModal] = useState<Lead | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [convModal, setConvModal] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const filtered = leads.filter(l => {
    if (activeStatus !== 'all' && l.status !== activeStatus) return false;
    if (search && !l.name.includes(search) && !l.email.includes(search) && !l.company.includes(search)) return false;
    return true;
  });

  const handleConvert = async () => {
    if (!convertModal) return;
    try {
      const { lead: updated } = await leadApi.convert(String(convertModal.id));
      setLeads(prev => prev.map(l => l.id === convertModal.id ? updated : l));
    } catch {
      setToast({ message: '线索转化失败，请重试', type: 'error' });
      return;
    }
    setConvertModal(null);
    setDetailLead(null);
    setToast({ message: `已将 "${convertModal.name}" 转为客户并创建初始商机`, type: 'success' });
  };

  const handleAssign = async (name: string) => {
    if (!assignModal) return;
    try {
      const updated = await leadApi.update(String(assignModal.id), { assignedTo: name });
      setLeads(prev => prev.map(l => l.id === assignModal.id ? updated : l));
    } catch {
      setToast({ message: '线索分配失败，请重试', type: 'error' });
      return;
    }
    setAssignModal(null);
    setDetailLead(null);
    setToast({ message: `已将 "${assignModal.name}" 分配给 ${name}`, type: 'success' });
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await leadApi.remove(String(deleteModal.id));
      setLeads(prev => prev.filter(l => l.id !== deleteModal.id));
    } catch {
      setToast({ message: '删除线索失败，请重试', type: 'error' });
      return;
    }
    setDeleteModal(null);
    setDetailLead(null);
    setToast({ message: `已删除线索 "${deleteModal.name}"`, type: 'success' });
  };

  const handleExport = () => {
    downloadLeads(leads);
    setExportModal(false);
    setToast({ message: `已导出 ${leads.length} 条线索数据`, type: 'success' });
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">线索管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">统一管理独立站表单与询盘智能体沉淀的客户线索</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('kanban')} className={`p-2.5 transition-colors ${viewMode === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
          {can('lead.export') && <button onClick={() => setExportModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary">
            <Download className="w-3.5 h-3.5" />导出
          </button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '全部线索', value: leads.length, color: '#1E1B35', sub: '实时 API 数据', subColor: 'text-emerald-600' },
          { label: '新线索', value: leads.filter(l => l.status === 'new').length, color: '#7C6EF5', sub: '待跟进', subColor: 'text-primary' },
          { label: '已联系', value: leads.filter(l => l.status === 'contacted').length, color: '#F59E0B', sub: '跟进中', subColor: 'text-amber-500' },
          { label: '已转化', value: leads.filter(l => l.status === 'converted').length, color: '#10B981', sub: `转化率 ${leads.length ? Math.round(leads.filter(l => l.status === 'converted').length / leads.length * 100) : 0}%`, subColor: 'text-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="backdrop-blur-xl bg-white/80 rounded-2xl p-5 border border-white/60 shadow-sm">
            <div className="text-2xl font-bold text-foreground" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            <div className={`text-xs font-semibold mt-1 ${s.subColor}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {viewMode === 'table' ? (
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <div className="flex-1 max-w-xs">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户名称、邮箱..." prefix={<Search className="w-4 h-4 text-muted-foreground" />} variant="filled" size="middle" />
            </div>
            <div className="flex gap-1.5">
              {[{ id: 'all', label: '全部' }, { id: 'new', label: '新线索' }, { id: 'contacted', label: '已联系' }, { id: 'converted', label: '已转化' }].map(f => (
                <button key={f.id} onClick={() => setActiveStatus(f.id)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${activeStatus === f.id ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{f.label}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.length === 0 && <LeadEmptyState className="h-full" />}
            {filtered.map(lead => (
              <div key={lead.id} className="px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setDetailLead(lead)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">{lead.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{lead.name}</span>
                      <span className="text-sm text-muted-foreground">{lead.company}</span>
                      <StatusBadge status={lead.status} />
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">{lead.tag}</span>
                      <ScoreDot score={lead.score} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.country}</span>
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{lead.product}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lead.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{lead.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setConvModal(lead)} className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary transition-colors">查看对话</button>
                    {can('lead.assign') && <button onClick={() => setAssignModal(lead)} className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"><UserPlus className="w-3 h-3 inline mr-1" />分配</button>}
                    {can('lead.convert') && <button onClick={() => setConvertModal(lead)} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20">转为客户</button>}
                    {can('lead.delete') && <button onClick={() => setDeleteModal(lead)} className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 0 && <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <span className="text-sm text-muted-foreground">共 {filtered.length} 条线索</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
              {[1, 2, 3].map(p => (
                <button key={p} className={`w-8 h-8 text-xs rounded-lg font-bold ${p === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>{p}</button>
              ))}
              <span className="text-muted-foreground px-1 text-xs">...</span>
              <button className="w-8 h-8 text-xs rounded-lg font-bold text-muted-foreground hover:bg-secondary">5</button>
              <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>}
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-auto pb-2">
          {getKanbanCols(leads).map(col => (
            <div key={col.id} className="flex-1 min-w-72 flex flex-col">
              <div className={`${col.headerColor} text-white px-4 py-3 rounded-t-2xl flex items-center justify-between`}>
                <span className="font-bold text-sm">{col.label}</span>
                <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold">{leads.filter(l => l.status === col.id).length}</span>
              </div>
              <div className={`flex-1 overflow-auto space-y-3 p-3 border-2 ${col.color} rounded-b-2xl`}>
                {leads.filter(l => l.status === col.id).length === 0 && <LeadEmptyState className="min-h-52" />}
                {leads.filter(l => l.status === col.id).map(lead => (
                  <div key={lead.id} className="bg-white rounded-xl border border-border p-4 hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5" onClick={() => setDetailLead(lead)}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">{lead.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">{lead.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{lead.company}</div>
                      </div>
                      <ScoreDot score={lead.score} />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">{lead.product}</span>
                      <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full">{lead.country}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{lead.time.split(' ')[1]}</span>
                      <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full font-medium border border-border">{lead.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Panel */}
      {detailLead && (
        <LeadDetailPanel
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onConvert={() => setConvertModal(detailLead)}
          onAssign={() => setAssignModal(detailLead)}
          onViewConv={() => setConvModal(detailLead)}
        />
      )}

      {/* Modals */}
      {convertModal && (
        <ConfirmModal
          title="确认转为客户"
          desc={`确定要将 "${convertModal.name}" 转为客户吗？系统将同时创建一条初始商机，并将线索移至"已转化"状态。`}
          confirmLabel="确认转化"
          onClose={() => setConvertModal(null)}
          onConfirm={handleConvert}
        />
      )}
      {deleteModal && (
        <ConfirmModal
          title="确认删除线索"
          desc={`确定要删除 "${deleteModal.name}"（${deleteModal.company}）的线索吗？此操作不可撤销。`}
          confirmLabel="确认删除"
          confirmCls="bg-red-500 hover:bg-red-600"
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}
      {exportModal && (
        <ConfirmModal
          title="导出线索数据"
          desc={`确定要导出全部 ${leads.length} 条线索数据吗？将导出为 Excel 格式。`}
          confirmLabel="确认导出"
          onClose={() => setExportModal(false)}
          onConfirm={handleExport}
        />
      )}
      {assignModal && (
        <AssignModal
          leadName={assignModal.name}
          onClose={() => setAssignModal(null)}
          onConfirm={handleAssign}
        />
      )}
      {convModal && (
        <ConvModal
          leadName={convModal.name}
          onClose={() => setConvModal(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default LeadsPage;
