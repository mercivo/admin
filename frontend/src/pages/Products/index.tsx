import React, { useState, useRef, useEffect } from 'react';
import { Empty, Input, Select, Checkbox } from 'antd';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  MoreHorizontal,
  List,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingCart,
  Tag,
  Package,
  Globe,
  AlertTriangle,
  Copy,
  Download,
  TrendingUp,
  Share2,
  Archive,
  Ban,
} from 'lucide-react';
import { StatusBadge, Toast } from '../../components/shared';
import { dictApi, productApi } from '../../services/api/index';
import { useNavigate } from 'react-router-dom';
import type { DictType, Product } from '../../types';
import { can } from '../../utils/permissions';

const productImageUrl = (image: string, width: number, height: number) => image?.startsWith('http') ? image : `https://images.unsplash.com/${image}?w=${width}&h=${height}&fit=crop&auto=format`;

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
};

// ─────────────── Product Preview Modal ───────────────

const ProductPreviewModal: React.FC<{ product: Product; onClose: () => void; onEdit: () => void }> = ({ product, onClose, onEdit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Eye className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{product.nameZh}</h3>
            <p className="text-xs text-muted-foreground">{product.nameEn}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Hero Image */}
        <div className="relative">
          <img
            src={productImageUrl(product.img, 800, 350)}
            alt={product.nameEn}
            className="w-full h-56 object-cover bg-secondary"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            {product.hot && <span className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-full font-bold shadow">热销</span>}
            <StatusBadge status={product.status} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Key Info Grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Tag, label: '商品编码', value: product.sku },
              { icon: ShoppingCart, label: '价格区间', value: product.price },
              { icon: Package, label: '库存', value: product.stock.toLocaleString() },
              { icon: Globe, label: '最小起订量', value: product.moq.toLocaleString() },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-secondary rounded-xl p-3.5 text-center">
                  <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{f.value}</div>
                </div>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded-xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">SEO 信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">SEO 标题</span><span className="text-foreground font-medium">{product.nameEn} - Mercivo</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SEO 描述</span><span className="text-foreground font-medium truncate max-w-40">High quality {product.nameEn.toLowerCase()}...</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">焦点关键词</span><span className="text-foreground font-medium">{product.nameEn.toLowerCase()}</span></div>
              </div>
            </div>
            <div className="border border-border rounded-xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">销售数据</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">本月询盘</span><span className="text-foreground font-medium">—</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">转化率</span><span className="text-emerald-600 font-medium">—</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">浏览量</span><span className="text-foreground font-medium">—</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20 flex-shrink-0">
        <button onClick={onEdit} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
          <Edit className="w-4 h-4" />编辑商品
        </button>
        <button className="py-2.5 px-4 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary flex items-center gap-2">
          <Share2 className="w-4 h-4" />分享
        </button>
        <button className="py-2.5 px-4 border border-border text-muted-foreground rounded-xl text-sm font-semibold hover:bg-secondary flex items-center gap-2">
          <Copy className="w-4 h-4" />复制
        </button>
      </div>
    </div>
  </div>
);

// ─────────────── Delete Confirmation Modal ───────────────

const DeleteConfirmModal: React.FC<{
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ product, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">确认删除商品</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
        确定要删除 <strong className="text-foreground">{product.nameZh}</strong>（商品编码：{product.sku}）吗？此操作不可撤销。
        </p>
        {product.status === 'published' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-left">
            该商品当前处于<strong>已发布</strong>状态，删除后将自动从独立站下架。
          </div>
        )}
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认删除</button>
      </div>
    </div>
  </div>
);

// ─────────────── Batch Operations Modal ───────────────

const BatchConfirmModal: React.FC<{
  count: number;
  action: 'offline' | 'export';
  onClose: () => void;
  onConfirm: () => void;
}> = ({ count, action, onClose, onConfirm }) => {
  const isOffline = action === 'offline';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isOffline ? 'bg-amber-100' : 'bg-primary/10'}`}>
            {isOffline ? <Ban className="w-6 h-6 text-amber-500" /> : <Download className="w-6 h-6 text-primary" />}
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {isOffline ? '批量下架商品' : '导出商品数据'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isOffline
              ? `确定要将选中的 ${count} 件商品批量下架吗？下架后商品将不在独立站展示。`
              : `确定要导出选中的 ${count} 件商品数据吗？将导出为 Excel 格式。`
            }
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold ${isOffline ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'}`}>
            {isOffline ? '确认下架' : '确认导出'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────── More Actions Dropdown ───────────────

const MoreActionsDropdown: React.FC<{
  product: Product;
  onClose: () => void;
  onPreview: () => void;
  onDelete: () => void;
}> = ({ product, onClose, onPreview, onDelete }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const actions = [
    { icon: Eye, label: '预览', onClick: onPreview },
    { icon: Edit, label: '编辑', onClick: () => { } },
    { icon: Copy, label: '复制', onClick: () => { } },
    { icon: Share2, label: '分享链接', onClick: () => { } },
    { icon: TrendingUp, label: '查看数据', onClick: onPreview },
    { icon: Archive, label: '归档', onClick: () => { } },
    { icon: Trash2, label: '删除', onClick: onDelete, danger: true },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-border z-30 py-1.5 overflow-hidden">
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <button
            key={i}
            onClick={() => { a.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left ${a.danger
              ? 'text-red-600 hover:bg-red-50'
              : 'text-foreground hover:bg-secondary'
              }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {a.label}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────── Products Page ───────────────

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Array<Product['id']>>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categories, setCategories] = useState<Array<{ id: string; label: string; codes: string[] }>>([]);

  // Modal states
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [batchAction, setBatchAction] = useState<'offline' | 'export' | null>(null);
  const [openDropdown, setOpenDropdown] = useState<Product['id'] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    productApi.list().then(setProducts).catch(() => { }).finally(() => setLoading(false));
    dictApi.getTree().then((types: DictType[]) => {
      const categoryDict = types.find(type => type.id === 'category');
      setCategories((categoryDict?.children || [])
        .filter(parent => parent.status === 'enabled')
        .map(parent => ({
          id: parent.code,
          label: parent.label,
          codes: [parent.code, ...parent.children.filter(child => child.status === 'enabled').map(child => child.code)],
        })));
    }).catch(() => setCategories([]));
  }, []);

  const toggle = (id: Product['id']) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const filtered = products.filter(
    p =>
      (category === 'all' || categories.find(item => item.id === category)?.codes.includes(p.category)) &&
      (statusFilter === 'all' || p.status === statusFilter) &&
      (p.nameZh.includes(search) ||
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.includes(search))
  );

  const handleBatchConfirm = async () => {
    if (batchAction === 'offline') {
      try {
        await Promise.all(selected.map(id => productApi.update(String(id), { status: 'draft' })));
        setProducts(prev => prev.map(product => selected.includes(product.id) ? { ...product, status: 'draft' } : product));
        setToast({ message: `已成功下架 ${selected.length} 件商品`, type: 'success' });
      } catch {
        setToast({ message: '批量下架失败，请重试', type: 'error' });
        return;
      }
    } else if (batchAction === 'export') {
      const items = products.filter(product => selected.includes(product.id));
      downloadCsv(`mercivo-products-${new Date().toISOString().slice(0, 10)}.csv`, [['商品编码', '中文名称', '英文名称', '价格', '库存', '最小起订量', '状态'], ...items.map(item => [item.sku, item.nameZh, item.nameEn, item.price, item.stock, item.moq, item.status])]);
      setToast({ message: `已导出 ${selected.length} 件商品`, type: 'success' });
    }
    setBatchAction(null);
    setSelected([]);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProduct) {
      try {
        await productApi.remove(String(deleteProduct.id));
        setProducts(prev => prev.filter(product => product.id !== deleteProduct.id));
        setToast({ message: `已删除 "${deleteProduct.nameZh}"`, type: 'success' });
      } catch {
        setToast({ message: '删除商品失败，请重试', type: 'error' });
        return;
      }
    }
    setDeleteProduct(null);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">商品管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {products.length} 件商品 · {products.filter(p => p.status === 'published').length} 件已发布
          </p>
        </div>
        {can('product.create') && <button
          onClick={() => navigate('/products/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />新建商品
        </button>}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {[{ id: 'all', label: '全部商品', codes: [] }, ...categories].map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${category === c.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 max-w-xs">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索商品名称或商品编码..."
              prefix={<Search className="w-4 h-4 text-muted-foreground" />}
              variant="filled"
              size="middle"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={val => setStatusFilter(val)}
            style={{ width: 140 }}
            size="middle"
            variant="filled"
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'published', label: '已发布' },
              { value: 'draft', label: '草稿' },
            ]}
          />
          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">已选 {selected.length} 项</span>
              <button
                onClick={() => setBatchAction('offline')}
                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"
              >
                批量下架
              </button>
              <button
                onClick={() => setBatchAction('export')}
                className="px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-muted"
              >
                导出
              </button>
            </div>
          )}
        </div>

        {viewMode === 'table' ? (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])}
                    />
                  </th>
                  {['商品', '商品编码', '价格区间', '库存', '最小起订量', '状态', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={8}><div className="flex min-h-72 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无商品数据" /></div></td></tr>}
                {filtered.map(product => (
                  <tr
                    key={product.id}
                    className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors group ${selected.includes(product.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <Checkbox checked={selected.includes(product.id)} onChange={() => toggle(product.id)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={productImageUrl(product.img, 48, 48)}
                            alt={product.nameEn}
                            className="w-11 h-11 rounded-xl object-cover bg-secondary"
                          />
                          {product.hot && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">🔥</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{product.nameZh}</div>
                          <div className="text-xs text-muted-foreground">{product.nameEn}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{product.sku}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">{product.price}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-foreground">{product.stock.toLocaleString()}</div>
                      {product.stock < 1000 && <div className="text-xs text-red-500 font-medium">库存预警</div>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{product.moq}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={product.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                        {can('product.edit') && <button
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>}
                        <button
                          onClick={() => setPreviewProduct(product)}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title="预览"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {can('product.delete') && <button
                          onClick={() => setDeleteProduct(product)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>}
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === product.id ? null : product.id)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                            title="更多"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openDropdown === product.id && (
                            <MoreActionsDropdown
                              product={product}
                              onClose={() => setOpenDropdown(null)}
                              onPreview={() => setPreviewProduct(product)}
                              onDelete={() => setDeleteProduct(product)}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4 p-5">
            {filtered.length === 0 && <div className="col-span-3 flex min-h-72 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无商品数据" /></div>}
            {filtered.map(product => (
              <div
                key={product.id}
                className="group border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => setPreviewProduct(product)}
              >
                <div className="relative">
                  <img
                    src={productImageUrl(product.img, 400, 200)}
                    alt={product.nameEn}
                    className="w-full h-36 object-cover bg-secondary"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/products/${product.id}/edit`); }}
                      className="p-2 bg-white rounded-xl shadow text-foreground hover:bg-primary hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setPreviewProduct(product); }}
                      className="p-2 bg-white rounded-xl shadow text-foreground hover:bg-primary hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {product.hot && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">热销</span>}
                    <StatusBadge status={product.status} />
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-foreground text-sm">{product.nameZh}</div>
                  <div className="text-xs text-muted-foreground mb-2">{product.nameEn}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">{product.price}</span>
                    <span className="text-xs text-muted-foreground">最小起订量 {product.moq}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">{product.sku} · 库存 {product.stock.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <span className="text-sm text-muted-foreground">共 {filtered.length} 件商品</span>
          {filtered.length > 0 && <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            {[1, 2, 3].map(p => (
              <button key={p} className={`w-8 h-8 text-xs rounded-lg font-semibold ${p === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>{p}</button>
            ))}
            <span className="text-muted-foreground px-1">...</span>
            <button className="w-8 h-8 text-xs rounded-lg font-semibold text-muted-foreground hover:bg-secondary">8</button>
            <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>}
        </div>
      </div>

      {/* Modals */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onEdit={() => { setPreviewProduct(null); navigate(`/products/${previewProduct.id}/edit`); }}
        />
      )}
      {deleteProduct && (
        <DeleteConfirmModal
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {batchAction && (
        <BatchConfirmModal
          count={selected.length}
          action={batchAction}
          onClose={() => setBatchAction(null)}
          onConfirm={handleBatchConfirm}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ProductsPage;
