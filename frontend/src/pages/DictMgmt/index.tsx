import React, { useState, useEffect } from 'react';
import { Input, Select, Switch as AntSwitch } from 'antd';
import { Search, Plus, ChevronRight, Edit, Trash2, BookOpen, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Toast } from '../../components/shared';
import { dictApi } from '../../services/api/index';

type DictChild = { code: string; label: string; sort: number; status: string; remark: string };
type DictEntry = DictChild & { children: DictChild[] };
type DictType = { id: string; label: string; icon: string; children: DictEntry[] };

// ─────────────── Modals ───────────────
interface DictFormData { code: string; label: string; sort: string; remark: string; status: string; }

const DictFormModal: React.FC<{
  title: string;
  initial?: DictFormData;
  onClose: () => void;
  onSave: (data: DictFormData) => void;
}> = ({ title, initial, onClose, onSave }) => {
  const [form, setForm] = useState<DictFormData>(initial || { code: '', label: '', sort: '', remark: '', status: 'enabled' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">编码</label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="唯一编码" variant="filled" size="middle" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">名称</label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="字典名称" variant="filled" size="middle" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">排序</label><Input value={form.sort} onChange={e => setForm({ ...form, sort: e.target.value })} placeholder="数字" variant="filled" size="middle" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">状态</label><Select value={form.status} onChange={v => setForm({ ...form, status: v })} style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }]} /></div>
          </div>
          <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">备注</label><Input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="可选备注" variant="filled" size="middle" /></div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button onClick={() => { if (form.code && form.label) onSave(form); }} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">确认</button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
        <h3 className="text-lg font-bold text-foreground mb-2">确认删除</h3>
        <p className="text-sm text-muted-foreground">确定要删除 <strong className="text-foreground">{name}</strong> 吗？此操作不可撤销。</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认删除</button>
      </div>
    </div>
  </div>
);

const DictMgmtPage: React.FC = () => {
  const [selectedDict, setSelectedDict] = useState('category');
  const [dictSearch, setDictSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<{ level: number; code: string; data: DictFormData } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['eco', 'new', 'confirmed', 'producing', 'tt']));
  const [dictData, setDictData] = useState<DictType[]>([]);

  useEffect(() => {
    dictApi.getTree().then(setDictData).catch(() => { });
  }, []);

  const [showAddLevel1, setShowAddLevel1] = useState(false);
  const [showAddLevel2, setShowAddLevel2] = useState<{ parentCode: string; parentLabel: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const toggleExpand = (code: string) => setExpandedRows(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });

  const toggleStatus = async (catId: string, code: string, childCode?: string) => {
    const targetCode = childCode || code;
    const cat = dictData.find(item => item.id === catId);
    const target = childCode
      ? cat?.children.flatMap(item => item.children).find(item => item.code === childCode)
      : cat?.children.find(item => item.code === code);
    if (!target) return;
    try {
      await dictApi.updateEntry(catId, targetCode, { status: target.status === 'enabled' ? 'disabled' : 'enabled' });
    } catch {
      setToast({ message: '状态更新失败，请重试', type: 'error' });
      return;
    }
    setDictData(prev => prev.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        children: cat.children.map(entry => {
          if (childCode && entry.code === code) {
            return { ...entry, children: entry.children.map(c => c.code === childCode ? { ...c, status: c.status === 'enabled' ? 'disabled' : 'enabled' } : c) };
          }
          if (!childCode && entry.code === code) return { ...entry, status: entry.status === 'enabled' ? 'disabled' : 'enabled' };
          return entry;
        }),
      };
    }));
  };

  const handleAddLevel1 = async (data: DictFormData) => {
    try {
      await dictApi.createEntry(selectedDict, { ...data, sort: Number(data.sort) || 0, parentCode: null });
    } catch { setToast({ message: '新增字典项失败', type: 'error' }); return; }
    setDictData(prev => prev.map(cat => {
      if (cat.id !== selectedDict) return cat;
      return { ...cat, children: [...cat.children, { code: data.code, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark, children: [] }] };
    }));
    setShowAddLevel1(false);
    setToast({ message: `一级字典项 "${data.label}" 已添加`, type: 'success' });
  };

  const handleAddLevel2 = async (data: DictFormData) => {
    if (!showAddLevel2) return;
    try {
      await dictApi.createEntry(selectedDict, { ...data, sort: Number(data.sort) || 0, parentCode: showAddLevel2.parentCode });
    } catch { setToast({ message: '新增子项失败', type: 'error' }); return; }
    setDictData(prev => prev.map(cat => {
      if (cat.id !== selectedDict) return cat;
      return { ...cat, children: cat.children.map(e => e.code === showAddLevel2.parentCode ? { ...e, children: [...e.children, { code: data.code, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark }] } : e) };
    }));
    setShowAddLevel2(null);
    setToast({ message: `二级字典项 "${data.label}" 已添加`, type: 'success' });
  };

  const handleEditEntry = async (data: DictFormData) => {
    if (!editingEntry) return;
    const { level, code } = editingEntry;
    try {
      await dictApi.updateEntry(selectedDict, code, { code: data.code, label: data.label, sort: Number(data.sort) || 0, remark: data.remark, status: data.status });
    } catch { setToast({ message: '更新字典项失败', type: 'error' }); return; }
    setDictData(prev => prev.map(cat => {
      if (cat.id !== selectedDict) return cat;
      if (level === 0) {
        return { ...cat, children: cat.children.map(e => e.code === code ? { ...e, code: data.code, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark } : e) };
      }
      return { ...cat, children: cat.children.map(e => ({ ...e, children: e.children.map(c => c.code === code ? { ...c, code: data.code, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark } : c) })) };
    }));
    setEditingEntry(null);
    setToast({ message: `字典项 "${data.label}" 已更新`, type: 'success' });
  };

  const handleDelete = (code: string, label: string, level: number) => {
    const onConfirm = async () => {
      try { await dictApi.deleteEntry(selectedDict, code); }
      catch { setToast({ message: '删除字典项失败', type: 'error' }); return; }
      setDictData(prev => prev.map(cat => {
        if (cat.id !== selectedDict) return cat;
        if (level === 0) return { ...cat, children: cat.children.filter(e => e.code !== code) };
        return { ...cat, children: cat.children.map(e => ({ ...e, children: e.children.filter(c => c.code !== code) })) };
      }));
      setDeleteTarget(null);
      setToast({ message: `已删除 "${label}"`, type: 'success' });
    };
    setDeleteTarget({ name: `"${label}" (${code})`, onConfirm });
  };

  const filteredCategories = dictData.filter(d => d.label.includes(dictSearch) || d.id.includes(dictSearch));
  const selectedCategory = dictData.find(d => d.id === selectedDict);
  const totalEntries = (cat: DictType) => cat.children.reduce((sum, e) => sum + 1 + e.children.length, 0);

  const EntryRow = ({ entry, level = 0 }: { entry: DictEntry | DictChild; level?: number }) => {
    const isParent = level === 0 && 'children' in entry && (entry as DictEntry).children !== undefined;
    const children = isParent ? (entry as DictEntry).children : [];
    const isExpanded = expandedRows.has(entry.code);
    const isEditing = editingEntry?.level === level && editingEntry.code === entry.code;

    return (
      <>
        <tr className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors group ${level === 1 ? 'bg-secondary/10' : ''}`}>
          <td className="px-6 py-3.5 w-20">
            <div className="flex items-center gap-1.5" style={{ paddingLeft: level * 20 }}>
              {isParent && children.length > 0 ? (
                <button onClick={() => toggleExpand(entry.code)} className="p-0.5 hover:bg-secondary rounded transition-colors"><ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
              ) : <span className="w-5 flex-shrink-0" />}
              <span className="text-sm text-muted-foreground">{entry.sort}</span>
            </div>
          </td>
          <td className="px-6 py-3.5">
            <span className={`text-sm font-mono bg-secondary px-2.5 py-1 rounded-lg ${level === 1 ? 'text-primary/70' : 'text-muted-foreground'}`}>{entry.code}</span>
          </td>
          <td className="px-6 py-3.5">
            <div className="flex items-center gap-2">
              {level === 0 && isParent && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">一级</span>}
              {level === 1 && <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground rounded font-medium">二级</span>}
              <span className={`text-sm ${level === 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>{entry.label}</span>
              {isParent && children.length > 0 && <span className="text-xs text-muted-foreground ml-1">({children.length}个子项)</span>}
            </div>
          </td>
          <td className="px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <AntSwitch checked={entry.status === 'enabled'} onChange={() => toggleStatus(selectedDict, level === 0 ? entry.code : '', level === 1 ? entry.code : undefined)} />
              <span className={`text-sm ${entry.status === 'enabled' ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}`}>{entry.status === 'enabled' ? '启用' : '禁用'}</span>
            </div>
          </td>
          <td className="px-6 py-3.5"><span className="text-sm text-muted-foreground">{entry.remark || '—'}</span></td>
          <td className="px-6 py-3.5">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {level === 0 && (
                <button onClick={() => setShowAddLevel2({ parentCode: entry.code, parentLabel: entry.label })} className="flex items-center gap-1 px-2 py-1.5 hover:bg-primary/10 rounded-lg text-xs text-primary font-medium transition-colors whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" />子项
                </button>
              )}
              <button onClick={() => setEditingEntry({ level, code: entry.code, data: { code: entry.code, label: entry.label, sort: String(entry.sort), remark: entry.remark, status: entry.status } })} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(entry.code, entry.label, level)} className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </td>
        </tr>
        {isParent && isExpanded && children.map(child => <EntryRow key={child.code} entry={child as DictEntry} level={1} />)}
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">字典管理</h1><p className="text-sm text-muted-foreground mt-0.5">支持两级字典维护：一级字典项可包含多个二级子项</p></div>
        <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">字典类型由系统统一预制</span>
      </div>

      <div className="flex gap-5" style={{ minHeight: 560 }}>
        <div className="w-64 flex-shrink-0 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Input value={dictSearch} onChange={e => setDictSearch(e.target.value)} placeholder="搜索字典类型..." prefix={<Search className="w-4 h-4 text-muted-foreground" />} variant="filled" />
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-0.5">
            {filteredCategories.map(cat => {
              const isActive = selectedDict === cat.id;
              return (
                <button key={cat.id} onClick={() => setSelectedDict(cat.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}>
                  <span className="text-lg flex-shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0"><div className="truncate">{cat.label}</div><div className={`text-xs mt-0.5 ${isActive ? 'text-primary/60' : 'text-muted-foreground'}`}>{cat.children.length}个一级 · {totalEntries(cat)}条合计</div></div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm overflow-hidden flex flex-col">
          {selectedCategory ? (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedCategory.icon}</span>
                  <div><h2 className="font-bold text-foreground text-base">{selectedCategory.label}</h2><p className="text-sm text-muted-foreground mt-0.5">{selectedCategory.children.length} 个一级字典项 · {totalEntries(selectedCategory) - selectedCategory.children.length} 个二级子项</p></div>
                </div>
                <button onClick={() => setShowAddLevel1(true)} className="flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors"><Plus className="w-4 h-4 text-muted-foreground" />新增一级字典项</button>
              </div>
              {selectedCategory.children.length === 0 ? (
                <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground"><BookOpen className="w-12 h-12 opacity-20" /><p className="text-sm font-medium">暂无字典项</p><p className="text-sm text-muted-foreground/60">点击右上角"新增一级字典项"开始添加</p></div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-secondary/40 sticky top-0 z-10"><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground w-28">排序</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">编码</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">名称</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground w-36">状态</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">备注</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground w-44">操作</th></tr></thead>
                    <tbody>{selectedCategory.children.map(entry => <EntryRow key={entry.code} entry={entry} level={0} />)}</tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground"><BookOpen className="w-12 h-12 opacity-20" /><p className="text-sm font-medium">请从左侧选择字典类型</p></div>
          )}
        </div>
      </div>

      {showAddLevel1 && <DictFormModal title="新增一级字典项" onClose={() => setShowAddLevel1(false)} onSave={handleAddLevel1} />}
      {showAddLevel2 && <DictFormModal title={`为 "${showAddLevel2.parentLabel}" 添加二级子项`} onClose={() => setShowAddLevel2(null)} onSave={handleAddLevel2} />}
      {editingEntry && <DictFormModal title="编辑字典项" initial={editingEntry.data} onClose={() => setEditingEntry(null)} onSave={handleEditEntry} />}
      {deleteTarget && <DeleteConfirmModal name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={deleteTarget.onConfirm} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DictMgmtPage;
