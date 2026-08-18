import React, { useEffect, useState } from 'react';
import { Input, InputNumber, Select, Checkbox, Tooltip } from 'antd';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  X,
  ExternalLink,
  AlertTriangle,
  CircleHelp,
  Info,
} from 'lucide-react';
import { RichTextEditor, StatusBadge } from '../../components/shared';
import Toast, { ToastType } from '../../components/shared/Toast';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi, dictApi, productApi, workspaceApi } from '../../services/api/index';
import type { CustomerLevel, GuestPricingPolicy } from '../../services/api/index';
import type { DictType, Product } from '../../types';

const IMGS = ['photo-1542601906990-b4d3fb778b09', 'photo-1553062407-98eeb64c6a62', 'photo-1584917865442-de89df76afd3'];
type ProductVariant = { specification: string; option: string; stock: number; surcharge: number };

const TABS = [
  { id: 'basic', label: '基本信息' },
  { id: 'specs', label: '规格库存' },
  { id: 'pricing', label: '客户等级价' },
];

const ProductEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('basic');
  const [publishToSite, setPublishToSite] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ code: string; label: string }>>([]);
  const [form, setForm] = useState<Partial<Product>>({
    nameZh: '', nameEn: '', description: '', sku: '', price: '0.00', basePrice: 0,
    stock: 0, moq: 0, category: '', img: IMGS[0], hot: false, badge: '', likeCount: 0,
    status: 'draft', tags: [], seoTitle: '', seoDescription: '',
    levelPrices: {},
  });
  const [deleteVariantIndex, setDeleteVariantIndex] = useState<number | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [currency, setCurrency] = useState('CNY');
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [customerLevels, setCustomerLevels] = useState<CustomerLevel[]>([]);
  const [guestPricingMode, setGuestPricingMode] = useState<GuestPricingPolicy['mode']>('base');

  const priceRange = () => {
    const basePrice = Math.max(0, Number(form.basePrice) || 0);
    if (!variants.length) return basePrice.toFixed(2);
    const values = variants.map(item => basePrice + Math.max(0, Number(item.surcharge) || 0));
    const min = Math.min(...values).toFixed(2);
    const max = Math.max(...values).toFixed(2);
    return min === max ? min : `${min}–${max}`;
  };

  useEffect(() => {
    workspaceApi.getSettings().then(settings => {
      setCurrency(settings.site.defaultCurrency || 'CNY');
    }).catch(() => undefined);
    dictApi.getTree().then((types: DictType[]) => {
      const categoryDict = types.find(type => type.id === 'category');
      const options = (categoryDict?.children || []).flatMap(parent => [
        ...(parent.status === 'enabled' ? [{ code: parent.code, label: parent.label }] : []),
        ...parent.children.filter(child => child.status === 'enabled').map(child => ({ code: child.code, label: `${parent.label} / ${child.label}` })),
      ]);
      setCategories(options);
      setForm(current => ({ ...current, category: current.category || options[0]?.code || '' }));
    }).catch(() => setCategories([]));
    customerApi.levels().then(setCustomerLevels).catch(() => setCustomerLevels([]));
    customerApi.pricingPolicy().then(policy => setGuestPricingMode(policy.mode)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    productApi.getById(id).then(product => {
      setForm(product);
      setVariants(product.variants || []);
      setPublishToSite(product.status === 'published');
    }).catch(() => {
      showToast('商品加载失败，请返回列表重试', 'error');
    });
  }, [id]);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleSave = () => {
    if (publishToSite) {
      setSaveConfirmOpen(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setSaveConfirmOpen(false);
    setSaving(true);
    if (!form.category) {
      setSaving(false);
      showToast('请先在字典管理中添加并启用商品分类', 'error');
      return;
    }
    const payload: Partial<Product> = {
      status: publishToSite ? 'published' as const : 'draft' as const,
      nameZh: form.nameZh || '未命名商品', nameEn: form.nameEn || form.nameZh || '未命名商品',
      sku: form.sku || `PRODUCT-${Date.now()}`, basePrice: Number(form.basePrice) || 0, variants, tags: form.tags || [],
      stock: variants.reduce((sum, item) => sum + (Number(item.stock) || 0), 0), moq: Number(form.moq) || 0,
      category: form.category, img: form.img || IMGS[0], hot: form.badge === 'hot' || form.badge === 'bestseller', badge: form.badge || '', likeCount: Math.max(0, Number(form.likeCount) || 0),
      description: form.description || '', seoTitle: form.seoTitle || '', seoDescription: form.seoDescription || '',
      levelPrices: form.levelPrices || {},
    };
    try {
      if (id) await productApi.update(id, payload);
      else await productApi.create(payload);
      showToast(publishToSite ? '商品已保存并发布成功' : '草稿已保存成功', 'success');
      window.setTimeout(() => navigate('/products'), 500);
    } catch {
      showToast('商品保存失败，请检查填写内容', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    setDeleteVariantIndex(null);
    showToast('规格已删除', 'success');
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, { specification: '', option: '', stock: 0, surcharge: 0 }]);
    showToast('规格已添加', 'success');
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || (form.tags || []).includes(tag)) return;
    setForm(current => ({ ...current, tags: [...(current.tags || []), tag].slice(0, 20) }));
    setTagInput('');
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await productApi.uploadImage(file);
      setForm(current => ({ ...current, img: uploaded.url }));
      showToast('商品图片上传成功', 'success');
    } catch {
      showToast('图片上传失败，请检查图片格式或存储配置', 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadDescriptionImage = async (file: File) => {
    try {
      const uploaded = await productApi.uploadImage(file);
      showToast('描述图片上传成功', 'success');
      return uploaded.url;
    } catch (error) {
      showToast('描述图片上传失败，请检查图片格式或存储配置', 'error');
      throw error;
    }
  };

  const totalStock = variants.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const warningStock = Math.max((Number(form.moq) || 0) * 10, 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" />返回商品列表
          </button>
          <span className="text-border">/</span>
          <h1 className="text-xl font-bold text-foreground">{id ? '编辑商品' : '新建商品'}</h1>
          <StatusBadge status={publishToSite ? 'published' : 'draft'} />
        </div>
        <div className="flex gap-2">
          <button disabled={!id} onClick={() => id && navigate(`/products/${id}`)} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50">
            <ExternalLink className="w-3.5 h-3.5" />预览前台
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Main Form */}
        <div className="col-span-2 space-y-4">
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm overflow-hidden">
            <div className="flex border-b border-border bg-secondary/20">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3.5 text-sm font-medium relative transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">商品名称</label>
                    <Input value={form.nameZh} onChange={e => setForm(v => ({ ...v, nameZh: e.target.value, nameEn: e.target.value }))} variant="filled" size="middle" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">商品描述</label>
                    <RichTextEditor value={form.description || ''} onChange={description => setForm(current => ({ ...current, description }))} onUploadImage={uploadDescriptionImage} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">商品图片（拖拽排序）</label>
                    <div className="grid grid-cols-4 gap-3">
                      {form.img && <div className="relative overflow-hidden rounded-xl ring-2 ring-primary"><img src={form.img.startsWith('http') ? form.img : `https://images.unsplash.com/${form.img}?w=240&h=240&fit=crop&auto=format`} alt="商品主图" className="aspect-square w-full object-cover" /><div className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-white">主图</div><button type="button" aria-label="删除商品图片" onClick={() => setForm(current => ({ ...current, img: '' }))} className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"><Trash2 className="h-4 w-4" /></button></div>}
                      <label className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                        <input data-testid="product-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} className="hidden" onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ''; }} />
                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">{uploading ? '上传中…' : '上传图片'}</span>
                        <span className="mt-1 text-[10px] text-muted-foreground">JPG/PNG/WebP/GIF，≤5MB</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: '商品编码', key: 'sku', value: form.sku || '', mono: true },
                      { label: '库存数量', key: 'stock', value: String(variants.reduce((sum, item) => sum + (Number(item.stock) || 0), 0)), disabled: true },
                      { label: '最小起订量', key: 'moq', value: String(form.moq ?? 0) },
                      { label: `基础单价（${currency}）`, key: 'basePrice', value: String(form.basePrice ?? 0), number: true },
                      { label: `价格区间（${currency}）`, key: 'price', value: priceRange(), disabled: true },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{f.label}</label>
                        {f.number ? <InputNumber value={Number(f.value)} min={0} precision={2} onChange={value => setForm(current => ({ ...current, basePrice: Number(value) || 0 }))} variant="filled" size="middle" style={{ width: '100%' }} /> : <Input value={f.value} disabled={f.disabled} onChange={e => setForm(v => ({
                          ...v,
                          [f.key]: f.key === 'stock' || f.key === 'moq' ? Number(e.target.value) : e.target.value,
                        }))} variant="filled" size="middle" style={f.mono ? { fontFamily: 'monospace' } : undefined} />}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-foreground">规格表（尺寸 × 颜色）</label>
                      <button onClick={handleAddVariant} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="w-3 h-3" />添加规格行</button>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary/40 border-b border-border">
                            {['规格', '选项', '库存', `额外加价（${currency}）`, ''].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((variant, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                              <td className="px-4 py-2.5"><Input value={variant.specification} placeholder="如：尺寸" onChange={e => setVariants(items => items.map((item, index) => index === i ? { ...item, specification: e.target.value } : item))} variant="borderless" size="small" style={{ fontWeight: 500 }} /></td>
                              <td className="px-4 py-2.5"><Input value={variant.option} placeholder="如：L" onChange={e => setVariants(items => items.map((item, index) => index === i ? { ...item, option: e.target.value } : item))} variant="borderless" size="small" /></td>
                              <td className="px-4 py-2.5"><InputNumber value={variant.stock} min={0} precision={0} onChange={value => setVariants(items => items.map((item, index) => index === i ? { ...item, stock: Number(value) || 0 } : item))} variant="borderless" size="small" /></td>
                              <td className="px-4 py-2.5"><InputNumber value={variant.surcharge} min={0} precision={2} onChange={value => setVariants(items => items.map((item, index) => index === i ? { ...item, surcharge: Number(value) || 0 } : item))} variant="borderless" size="small" /></td>
                              <td className="px-4 py-2.5"><button onClick={() => setDeleteVariantIndex(i)} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">最终规格价格 = 基础单价 + 额外加价；价格区间和总库存自动计算，不可手动修改。</p>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">客户等级专属价</h3>
                        <Tooltip title="客户通过手机号匹配价格等级；等级价留空时使用基础价，规格额外加价会继续叠加。" placement="top">
                          <button type="button" aria-label="查看等级价规则" className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"><CircleHelp className="h-4 w-4" /></button>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip title={guestPricingMode === 'hidden' ? '游客当前不显示价格，识别客户手机号后显示对应价格。' : '游客当前展示商品基础价。'} placement="top">
                          <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Info className="h-3 w-3" />游客：{guestPricingMode === 'hidden' ? '不显示价格' : '基础价'}</span>
                        </Tooltip>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">基础价 {currency} {Number(form.basePrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {customerLevels.length ? <div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">客户等级</th><th className="w-64 px-4 py-3 text-left text-xs font-semibold text-muted-foreground">专属价（{currency}）</th></tr></thead><tbody>{customerLevels.map(level => <tr key={level.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><div className="flex items-center gap-2 font-semibold text-foreground"><span>{level.name}</span>{level.note && <Tooltip title={level.note} placement="topLeft"><button type="button" aria-label={`查看${level.name}说明`} className="text-muted-foreground transition hover:text-primary"><Info className="h-3.5 w-3.5" /></button></Tooltip>}</div></td><td className="px-4 py-3"><InputNumber value={form.levelPrices?.[level.code]} min={0} precision={2} placeholder={`默认 ${Number(form.basePrice || 0).toFixed(2)}`} onChange={value => setForm(current => { const prices = { ...(current.levelPrices || {}) }; if (value === null) delete prices[level.code]; else prices[level.code] = Number(value); return { ...current, levelPrices: prices }; })} variant="filled" style={{ width: '100%' }} /></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center"><p className="text-sm font-semibold text-foreground">尚未创建客户等级</p><button onClick={() => navigate('/customers')} className="mt-3 text-xs font-semibold text-primary hover:underline">前往客户管理</button></div>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sidebar Publish Card */}
        <div className="flex flex-col gap-4">
          <div className="order-2 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm">发布设置</h3>
            <div className="space-y-3">
              {[
                { label: '发布状态', value: publishToSite ? 'published' : 'draft', badge: true },
                { label: '可见性', value: publishToSite ? '公开' : '仅后台可见' },
                { label: '最后更新', value: form.updatedAt ? new Date(form.updatedAt).toLocaleDateString('zh-CN') : '尚未保存' },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  {f.badge ? <StatusBadge status={f.value as 'published' | 'draft'} /> : <span className="text-xs font-semibold text-foreground">{f.value}</span>}
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={publishToSite} onChange={e => setPublishToSite(e.target.checked)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-foreground">同步到独立站</div>
                  <div className="text-xs text-muted-foreground mt-0.5">保存后立即更新前台展示</div>
                </div>
              </label>
            </div>
            <button disabled={saving} onClick={handleSave} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm disabled:opacity-60">
              {saving ? '保存中...' : publishToSite ? '保存并发布' : '保存草稿'}
            </button>
            <button onClick={() => navigate('/products')} className="w-full py-2.5 border border-border text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              取消
            </button>
          </div>

          <div className="order-1 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
            <h3 className="font-bold text-foreground text-sm mb-3">商品分类</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">分类</label>
                <Select value={form.category || undefined} onChange={value => setForm(current => ({ ...current, category: value }))} placeholder="请选择商品分类" style={{ width: '100%' }} size="middle" variant="filled" options={categories.map(item => ({ value: item.code, label: item.label }))} />
                {categories.length === 0 && <p className="mt-1.5 text-xs text-amber-600">请先前往字典管理添加商品分类项</p>}
              </div>
              <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">标签</label>
                    <div className="mb-2 flex gap-1 flex-wrap">
                      {(form.tags || []).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1">
                          {t}<button onClick={() => setForm(current => ({ ...current, tags: (current.tags || []).filter(tag => tag !== t) }))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onPressEnter={addTag} placeholder="输入标签后按回车" variant="filled" size="middle" suffix={<button onClick={addTag} className="text-xs font-semibold text-primary">添加</button>} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">商品标记</label>
                <Select value={form.badge || ''} onChange={(badge: Product['badge']) => setForm(current => ({ ...current, badge }))} style={{ width: '100%' }} variant="filled" options={[{ value: '', label: '无标记' }, { value: 'new', label: '新品' }, { value: 'hot', label: '爆品' }, { value: 'bestseller', label: '热销' }, { value: 'recommended', label: '推荐' }]} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">点赞数量</label>
                <InputNumber value={Number(form.likeCount) || 0} min={0} precision={0} onChange={likeCount => setForm(current => ({ ...current, likeCount: Number(likeCount) || 0 }))} variant="filled" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <div className={`order-3 ${totalStock <= warningStock ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'} rounded-2xl border p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-4 w-4 ${totalStock <= warningStock ? 'text-amber-600' : 'text-emerald-600'}`} />
              <span className={`text-xs font-bold ${totalStock <= warningStock ? 'text-amber-700' : 'text-emerald-700'}`}>库存提醒</span>
            </div>
            <p className={`text-xs ${totalStock <= warningStock ? 'text-amber-700' : 'text-emerald-700'}`}>当前库存 {totalStock.toLocaleString()} 件，预警值 {warningStock.toLocaleString()} 件。{totalStock <= warningStock ? '库存偏低，请及时补货。' : '当前库存充足。'}</p>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {saveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSaveConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">确认发布</h3>
              <button onClick={() => setSaveConfirmOpen(false)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">即将发布到独立站</p>
                  <p className="text-sm text-muted-foreground">保存后，商品将立即更新到前台展示。请确认所有信息填写正确。</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
              <button onClick={() => setSaveConfirmOpen(false)} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
              <button onClick={doSave} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">确认发布</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Variant Confirmation Modal */}
      {deleteVariantIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteVariantIndex(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">删除规格</h3>
              <button onClick={() => setDeleteVariantIndex(null)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">确认删除此规格？</p>
                  <p className="text-sm text-muted-foreground">删除后不可恢复，该规格的库存数据将一并移除。</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
              <button onClick={() => setDeleteVariantIndex(null)} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
              <button onClick={() => handleDeleteVariant(deleteVariantIndex)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProductEditPage;
