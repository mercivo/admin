import React, { useState, useEffect } from 'react';
import { Input, Select, Switch as AntSwitch } from 'antd';
import { Search, Plus, ChevronRight, Edit, Trash2, Tags, AlertCircle } from 'lucide-react';
import { AppModal, TableActions, Toast } from '../../components/shared';
import { productCategoryApi } from '../../services/api/index';

type ProductCategoryChild = { code: string; label: string; sort: number; status: string; remark: string };
type ProductCategory = ProductCategoryChild & { children: ProductCategoryChild[] };

// ─────────────── Modals ───────────────
interface CategoryFormData { label: string; sort: string; remark: string; status: string; }

const CategoryFormModal: React.FC<{
  title: string;
  initial?: CategoryFormData;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
}> = ({ title, initial, onClose, onSave }) => {
  const [form, setForm] = useState<CategoryFormData>(initial || { label: '', sort: '', remark: '', status: 'enabled' });

  return (
    <AppModal open centered title={title} okText="确认" cancelText="取消" onCancel={onClose} onOk={() => { if (form.label.trim()) onSave({ ...form, label: form.label.trim() }); }} width={520}>
        <div className="space-y-4 pt-3">
          <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">名称</label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="分类名称" variant="filled" size="middle" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">排序</label><Input value={form.sort} onChange={e => setForm({ ...form, sort: e.target.value })} placeholder="数字" variant="filled" size="middle" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">状态</label><Select value={form.status} onChange={v => setForm({ ...form, status: v })} style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }]} /></div>
          </div>
          <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">备注</label><Input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="可选备注" variant="filled" size="middle" /></div>
        </div>
    </AppModal>
  );
};

const DeleteConfirmModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <AppModal open title="确认删除" onCancel={onClose} onOk={onConfirm} okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }} width={440}>
      <div className="py-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
        <p className="text-sm text-muted-foreground">确定要删除 <strong className="text-foreground">{name}</strong> 吗？此操作不可撤销。</p>
      </div>
  </AppModal>
);

const ProductCategoriesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<{ level: number; code: string; data: CategoryFormData } | null>(null);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    productCategoryApi.list().then(items => {
      setCategories(items);
      setCollapsedRows(new Set());
    }).catch(() => setToast({ message: '商品分类加载失败', type: 'error' }));
  }, []);

  const [showAddLevel1, setShowAddLevel1] = useState(false);
  const [showAddLevel2, setShowAddLevel2] = useState<{ parentCode: string; parentLabel: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const toggleExpand = (code: string) => setCollapsedRows(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });

  const toggleStatus = async (code: string) => {
    const target = categories.find(item => item.code === code) || categories.flatMap(item => item.children).find(item => item.code === code);
    if (!target) return;
    try {
      await productCategoryApi.update(code, { status: target.status === 'enabled' ? 'disabled' : 'enabled' });
    } catch {
      setToast({ message: '状态更新失败，请重试', type: 'error' });
      return;
    }
    setCategories(prev => prev.map(parent => parent.code === code
      ? { ...parent, status: parent.status === 'enabled' ? 'disabled' : 'enabled' }
      : { ...parent, children: parent.children.map(child => child.code === code ? { ...child, status: child.status === 'enabled' ? 'disabled' : 'enabled' } : child) }));
  };

  const handleAddLevel1 = async (data: CategoryFormData) => {
    try {
      const created = await productCategoryApi.create({ ...data, sort: Number(data.sort) || 0, parentCode: null });
      setCategories(prev => [...prev, { code: created.code, label: created.label, sort: created.sort, status: created.status, remark: created.remark, children: [] }]);
    } catch { setToast({ message: '新增商品分类失败', type: 'error' }); return; }
    setShowAddLevel1(false);
    setToast({ message: `一级分类“${data.label}”已添加`, type: 'success' });
  };

  const handleAddLevel2 = async (data: CategoryFormData) => {
    if (!showAddLevel2) return;
    try {
      const created = await productCategoryApi.create({ ...data, sort: Number(data.sort) || 0, parentCode: showAddLevel2.parentCode });
      setCategories(prev => prev.map(parent => parent.code === showAddLevel2.parentCode ? { ...parent, children: [...parent.children, { code: created.code, label: created.label, sort: created.sort, status: created.status, remark: created.remark }] } : parent));
    } catch { setToast({ message: '新增子项失败', type: 'error' }); return; }
    setShowAddLevel2(null);
    setToast({ message: `二级分类“${data.label}”已添加`, type: 'success' });
  };

  const handleEditEntry = async (data: CategoryFormData) => {
    if (!editingEntry) return;
    const { level, code } = editingEntry;
    try {
      await productCategoryApi.update(code, { label: data.label, sort: Number(data.sort) || 0, remark: data.remark, status: data.status });
    } catch { setToast({ message: '更新商品分类失败', type: 'error' }); return; }
    setCategories(prev => prev.map(parent => {
      if (level === 0) {
        return parent.code === code ? { ...parent, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark } : parent;
      }
      return { ...parent, children: parent.children.map(child => child.code === code ? { ...child, label: data.label, sort: Number(data.sort) || 0, status: data.status, remark: data.remark } : child) };
    }));
    setEditingEntry(null);
    setToast({ message: `商品分类“${data.label}”已更新`, type: 'success' });
  };

  const handleDelete = (code: string, label: string, level: number) => {
    const onConfirm = async () => {
      try { await productCategoryApi.remove(code); }
      catch { setToast({ message: '删除失败，请确认分类下没有商品', type: 'error' }); return; }
      setCategories(prev => level === 0 ? prev.filter(parent => parent.code !== code) : prev.map(parent => ({ ...parent, children: parent.children.filter(child => child.code !== code) })));
      setDeleteTarget(null);
      setToast({ message: `已删除 "${label}"`, type: 'success' });
    };
    setDeleteTarget({ name: `“${label}”`, onConfirm });
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = normalizedSearch ? categories.filter(parent =>
    parent.label.toLowerCase().includes(normalizedSearch) || parent.children.some(child => child.label.toLowerCase().includes(normalizedSearch))) : categories;
  const childCount = categories.reduce((sum, parent) => sum + parent.children.length, 0);

  const EntryRow = ({ entry, level = 0 }: { entry: ProductCategory | ProductCategoryChild; level?: number }) => {
    const isParent = level === 0 && 'children' in entry && (entry as ProductCategory).children !== undefined;
    const children = isParent ? (entry as ProductCategory).children : [];
    const isExpanded = !collapsedRows.has(entry.code);
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
            <div className="flex items-center gap-2">
              {level === 0 && isParent && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">一级</span>}
              {level === 1 && <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground rounded font-medium">二级</span>}
              <span className={`text-sm font-normal ${level === 0 ? 'text-foreground' : 'text-foreground/80'}`}>{entry.label}</span>
              {isParent && children.length > 0 && <span className="text-xs text-muted-foreground ml-1">({children.length}个子项)</span>}
            </div>
          </td>
          <td className="px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <AntSwitch checked={entry.status === 'enabled'} onChange={() => toggleStatus(entry.code)} />
              <span className={`text-sm ${entry.status === 'enabled' ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}`}>{entry.status === 'enabled' ? '启用' : '禁用'}</span>
            </div>
          </td>
          <td className="px-6 py-3.5"><span className="text-sm text-muted-foreground">{entry.remark || '-'}</span></td>
          <td className={`app-table-action-column-manual px-6 py-3.5 ${level === 1 ? 'bg-secondary/10' : 'bg-white'} group-hover:bg-[#faf9ff]`}>
            <TableActions>
              {level === 0 && (
                <button onClick={() => setShowAddLevel2({ parentCode: entry.code, parentLabel: entry.label })} className="flex items-center gap-1 px-2 py-1.5 hover:bg-primary/10 rounded-lg text-xs text-primary font-medium transition-colors whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" />子项
                </button>
              )}
              <button onClick={() => setEditingEntry({ level, code: entry.code, data: { label: entry.label, sort: String(entry.sort), remark: entry.remark, status: entry.status } })} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(entry.code, entry.label, level)} className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </TableActions>
          </td>
        </tr>
        {isParent && isExpanded && children.map(child => <EntryRow key={child.code} entry={child as ProductCategory} level={1} />)}
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">商品分类</h1><p className="text-sm text-muted-foreground mt-0.5">维护商品的一级分类与二级子分类</p></div>
        <button onClick={() => setShowAddLevel1(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"><Plus className="h-4 w-4" />新增一级分类</button>
      </div>

      <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Tags className="h-5 w-5" /></div>
            <div><h2 className="text-base font-bold text-foreground">分类列表</h2><p className="mt-0.5 text-sm text-muted-foreground">{categories.length} 个一级分类 · {childCount} 个二级分类</p></div>
          </div>
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索分类名称" prefix={<Search className="h-4 w-4 text-muted-foreground" />} variant="filled" style={{ width: 260 }} allowClear />
        </div>
        {filteredCategories.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"><Tags className="h-12 w-12 opacity-20" /><p className="text-sm font-medium">{search ? '未找到匹配的商品分类' : '暂无商品分类'}</p><p className="text-sm text-muted-foreground/60">点击右上角“新增一级分类”开始添加</p></div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead><tr className="sticky top-0 z-10 border-b border-border bg-secondary/40"><th className="w-28 px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">排序</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">名称</th><th className="w-36 px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">状态</th><th className="px-6 py-3.5 text-left text-sm font-semibold text-muted-foreground">备注</th><th className="app-table-action-column-manual top-0 z-20 w-44 bg-[#f8f7ff] px-6 py-3.5 text-sm font-semibold text-muted-foreground">操作</th></tr></thead>
              <tbody>{filteredCategories.map(entry => <EntryRow key={entry.code} entry={entry} level={0} />)}</tbody>
            </table>
          </div>
        )}
      </div>

      {showAddLevel1 && <CategoryFormModal title="新增一级分类" onClose={() => setShowAddLevel1(false)} onSave={handleAddLevel1} />}
      {showAddLevel2 && <CategoryFormModal title={`为“${showAddLevel2.parentLabel}”添加二级分类`} onClose={() => setShowAddLevel2(null)} onSave={handleAddLevel2} />}
      {editingEntry && <CategoryFormModal title="编辑商品分类" initial={editingEntry.data} onClose={() => setEditingEntry(null)} onSave={handleEditEntry} />}
      {deleteTarget && <DeleteConfirmModal name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={deleteTarget.onConfirm} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProductCategoriesPage;
