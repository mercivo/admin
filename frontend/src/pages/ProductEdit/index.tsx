import React, { useEffect, useState } from 'react';
import { Input, InputNumber, Select, Checkbox, Tooltip } from 'antd';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  X,
  ExternalLink,
  AlertTriangle,
  CircleHelp,
  Info,
} from 'lucide-react';
import { AppEditableTable, AppModal, ProductImage, QuotaUsage, RichTextEditor, StatusBadge, TableActionButton } from '../../components/shared';
import Toast, { ToastType } from '../../components/shared/Toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerApi, productApi, productCategoryApi, workspaceApi } from '../../services/api/index';
import type { CustomerLevel, GuestPricingPolicy } from '../../services/api/index';
import type { Product, ProductCategory } from '../../types';
import { DEFAULT_CURRENCY_CONFIG, type CurrencyConfig } from '../../config/sales';

type ProductVariant = { id?: string; specification: string; option: string; stock: number; surcharge: number; surcharges?: Record<string, number> };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean).slice(0, 20);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean).slice(0, 20);
  } catch { /* 兼容旧数据中的逗号分隔标签 */ }
  return value.split(/[,，]/).map(item => item.trim()).filter(Boolean).slice(0, 20);
};

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
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ code: string; label: string }>>([]);
  const [form, setForm] = useState<Partial<Product>>({
    nameZh: '', description: '', sku: '', price: '0.00', basePrice: 0,
    stock: 0, moq: 0, category: '', img: '', hot: false, badge: '', likeCount: 0,
    status: 'pending', tags: [],
    levelPrices: {},
  });
  const [deleteVariantIndex, setDeleteVariantIndex] = useState<number | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [currency, setCurrency] = useState('CNY');
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [customerLevels, setCustomerLevels] = useState<CustomerLevel[]>([]);
  const [guestPricingMode, setGuestPricingMode] = useState<GuestPricingPolicy['mode']>('base');
  const [productQuota, setProductQuota] = useState<{ used: number; limit: number } | null>(null);

  const priceRange = () => {
    const basePrice = Math.max(0, Number(form.currencyPrices?.[currency]?.basePrice) || 0);
    if (!variants.length) return basePrice.toFixed(2);
    const values = variants.map(item => basePrice + Math.max(0, Number(item.surcharges?.[currency]) || 0));
    const min = Math.min(...values).toFixed(2);
    const max = Math.max(...values).toFixed(2);
    return min === max ? min : `${min}～${max}`;
  };

  const referencePrice = (level: CustomerLevel) => {
    const basePrice = Math.max(0, Number(form.currencyPrices?.[currency]?.basePrice) || 0);
    return level.discountRate == null ? basePrice : basePrice * Number(level.discountRate) / 100;
  };

  useEffect(() => {
    Promise.all([workspaceApi.getSettings(), workspaceApi.getConfig<Partial<CurrencyConfig>>('currency').catch(() => DEFAULT_CURRENCY_CONFIG)]).then(([settings, currencyConfig]) => {
      const resolved = { ...DEFAULT_CURRENCY_CONFIG, ...currencyConfig, currencies: currencyConfig.currencies?.length ? currencyConfig.currencies : DEFAULT_CURRENCY_CONFIG.currencies } as CurrencyConfig;
      setCurrencyConfig(resolved); setCurrency(resolved.defaultCurrency || settings.site.defaultCurrency || 'CNY');
      setProductQuota({ used: settings.billing.usage.products, limit: settings.billing.limits.products });
    }).catch(() => undefined);
    productCategoryApi.list().then((categories: ProductCategory[]) => {
      const options = categories.flatMap(parent => [
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
      const images = product.images?.length ? product.images.slice(0, 10) : product.img ? [product.img] : [];
      setForm({ ...product, img: images[0] || '', images, tags: normalizeTags(product.tags), currencyPrices: product.currencyPrices || { [currencyConfig.defaultCurrency]: { basePrice: Number(product.basePrice) || 0, levelPrices: product.levelPrices || {} } } });
      setTagInput('');
      setVariants(product.variants || []);
      setPublishToSite(product.status === 'published');
    }).catch(() => {
      showToast('商品加载失败，请返回列表重试', 'error');
    });
  }, [id]);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleSave = () => {
    if (!id && productQuota && productQuota.used >= productQuota.limit) {
      showToast('商品额度已用完，请升级套餐或联系管理员', 'error');
      return;
    }
    if (publishToSite) {
      AppModal.confirm({
        title: '确认同步',
        content: '保存后，商品将立即进入独立站商品池并更新前台展示。请确认所有信息填写正确。',
        okText: '保存并同步',
        onOk: doSave,
      });
    } else {
      void doSave();
    }
  };

  const doSave = async () => {
    setSaving(true);
    if (!form.category) {
      setSaving(false);
      showToast('请先在商品分类中添加并启用分类', 'error');
      return;
    }
    const payload: Partial<Product> = {
      status: publishToSite ? 'published' as const : 'pending' as const,
      nameZh: form.nameZh || '未命名商品',
      sku: form.sku || `PRODUCT-${Date.now()}`, basePrice: Number(form.currencyPrices?.[currencyConfig.defaultCurrency]?.basePrice) || 0, currencyPrices: form.currencyPrices || {}, variants, tags: form.tags || [],
      moq: Number(form.moq) || 0,
      category: form.category, img: form.images?.[0] || form.img || '', images: (form.images || (form.img ? [form.img] : [])).slice(0, 10), hot: form.badge === 'hot' || form.badge === 'bestseller', badge: form.badge || '', likeCount: Math.max(0, Number(form.likeCount) || 0),
      description: form.description || '',
      levelPrices: form.currencyPrices?.[currencyConfig.defaultCurrency]?.levelPrices || {},
    };
    try {
      if (id) await productApi.update(id, payload);
      else await productApi.create(payload);
      showToast(publishToSite ? '商品已保存并同步到独立站' : '商品已保存，暂未同步到独立站', 'success');
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
    const surcharges = Object.fromEntries(currencyConfig.currencies.filter(item => item.enabled).map(item => [item.code, 0]));
    setVariants(prev => [...prev, { specification: '', option: '', stock: 0, surcharge: 0, surcharges }]);
    showToast('规格已添加', 'success');
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || (form.tags || []).includes(tag)) return;
    setForm(current => ({ ...current, tags: [...(current.tags || []), tag].slice(0, 20) }));
    setTagInput('');
  };

  const uploadImages = async (files?: FileList | null) => {
    if (!files?.length) return;
    const currentImages = form.images || (form.img ? [form.img] : []);
    const selected = Array.from(files).slice(0, Math.max(0, 10 - currentImages.length));
    if (!selected.length) {
      showToast('每个商品最多上传 10 张图片', 'error');
      return;
    }
    if (selected.some(file => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE)) {
      showToast('请选择 5MB 以内的 JPG、PNG、WebP 或 GIF 图片', 'error');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(selected.map(file => productApi.uploadImage(file)));
      setForm(current => {
        const existing = current.images || (current.img ? [current.img] : []);
        const images = [...existing, ...uploaded.map(item => item.url)].slice(0, 10);
        return { ...current, img: images[0] || '', images };
      });
      showToast(`${uploaded.length} 张商品图片上传成功`, 'success');
    } catch {
      showToast('图片上传失败，请检查图片格式或存储配置', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => setForm(current => {
    const images = (current.images || (current.img ? [current.img] : [])).filter((_, imageIndex) => imageIndex !== index);
    return { ...current, img: images[0] || '', images };
  });

  const uploadDescriptionImage = async (file: File) => {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) {
      showToast('请选择 5MB 以内的 JPG、PNG、WebP 或 GIF 图片', 'error');
      throw new Error('Invalid image');
    }
    try {
      const uploaded = await productApi.uploadImage(file);
      showToast('描述图片上传成功', 'success');
      return uploaded.url;
    } catch (error) {
      showToast('描述图片上传失败，请检查图片格式或存储配置', 'error');
      throw error;
    }
  };

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
          <StatusBadge status={publishToSite ? 'published' : 'pending'} />
        </div>
        <div className="flex items-center gap-2">
          {!id && productQuota && <QuotaUsage label="商品配额" used={productQuota.used} limit={productQuota.limit} onExhaustedClick={()=>navigate('/settings?tab=billing')}/>}
          <button disabled={!id} onClick={() => id && navigate(`/products/${id}`)} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50">
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
                  className={`px-5 py-3.5 text-sm font-normal relative transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-normal text-foreground mb-1.5">商品名称</label>
                    <Input value={form.nameZh} onChange={e => setForm(v => ({ ...v, nameZh: e.target.value }))} variant="filled" size="middle" />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-foreground mb-1.5">商品描述</label>
                    <RichTextEditor value={form.description || ''} onChange={description => setForm(current => ({ ...current, description }))} onUploadImage={uploadDescriptionImage} />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-foreground mb-2">商品图片（最多 10 张，第一张为主图）</label>
                    <div className="grid grid-cols-4 gap-3">
                      {(form.images || (form.img ? [form.img] : [])).map((image, index) => <div key={`${image}-${index}`} className={`relative overflow-hidden rounded-xl bg-white ${index === 0 ? 'ring-2 ring-primary' : 'border border-border'}`}><ProductImage image={image} width={480} height={480} alt={`商品图片 ${index + 1}`} className="aspect-square w-full bg-white" />{index === 0 && <div className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs font-normal text-white">主图</div>}<button type="button" aria-label={`删除第 ${index + 1} 张商品图片`} onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"><Trash2 className="h-4 w-4" /></button></div>)}
                      {(form.images || (form.img ? [form.img] : [])).length < 10 && <label className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                        <input data-testid="product-image-input" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} className="hidden" onChange={event => { void uploadImages(event.target.files); event.target.value = ''; }} />
                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">{uploading ? '上传中…' : '上传图片'}</span>
                        <span className="mt-1 text-[10px] text-muted-foreground">JPG/PNG/WebP/GIF，≤5MB</span>
                      </label>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="space-y-5">
                  <div className="flex gap-2">{currencyConfig.currencies.filter(item => item.enabled).map(item => <button type="button" key={item.code} onClick={() => setCurrency(item.code)} className={`rounded-lg px-3 py-2 text-sm ${currency === item.code ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{item.code} · {item.symbol}</button>)}</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: '商品编码', key: 'sku', value: form.sku || '', mono: true },
                      { label: '库存数量', key: 'stock', value: String(variants.reduce((sum, item) => sum + (Number(item.stock) || 0), 0)), disabled: true },
                      { label: '最小起订量', key: 'moq', value: String(form.moq ?? 0) },
                      { label: `基础单价（${currency}）`, key: 'basePrice', value: String(form.currencyPrices?.[currency]?.basePrice ?? ''), number: true },
                      { label: `价格区间（${currency}）`, key: 'price', value: priceRange(), disabled: true },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-normal text-muted-foreground mb-1.5 uppercase tracking-wide">{f.label}</label>
                        {f.number ? <InputNumber value={f.value === '' ? null : Number(f.value)} min={0} precision={2} onChange={value => setForm(current => ({ ...current, currencyPrices: { ...(current.currencyPrices || {}), [currency]: { basePrice: Number(value) || 0, levelPrices: current.currencyPrices?.[currency]?.levelPrices || {} } } }))} variant="filled" size="middle" style={{ width: '100%' }} /> : <Input value={f.value} disabled={f.disabled} onChange={e => setForm(v => ({
                          ...v,
                          [f.key]: f.key === 'stock' || f.key === 'moq' ? Number(e.target.value) : e.target.value,
                        }))} variant="filled" size="middle" style={f.mono ? { fontFamily: 'monospace' } : undefined} />}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-normal text-foreground">规格表（尺寸 × 颜色）</label>
                      <button onClick={handleAddVariant} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="w-3 h-3" />添加规格行</button>
                    </div>
                    <AppEditableTable rowKey={(_, index) => index} dataSource={variants} emptyText="暂无规格数据，请添加规格行" columns={[{ title: '规格' }, { title: '选项' }, { title: '库存', width: 120 }, { title: `额外加价（${currency}）`, width: 180 }, { title: '', width: 56, className: 'text-center' }]} renderRow={(variant, i) => [<Input value={variant.specification} placeholder="如：尺寸" onChange={e => setVariants(items => items.map((item, index) => index === i ? { ...item, specification: e.target.value } : item))} variant="borderless" size="small" />, <Input value={variant.option} placeholder="如：L" onChange={e => setVariants(items => items.map((item, index) => index === i ? { ...item, option: e.target.value } : item))} variant="borderless" size="small" />, <InputNumber value={variant.stock} disabled min={0} precision={0} variant="borderless" size="small" />, <InputNumber value={variant.surcharges?.[currency] ?? 0} min={0} precision={2} onChange={value => setVariants(items => items.map((item, index) => index === i ? { ...item, surcharges: { ...(item.surcharges || {}), [currency]: Number(value) || 0 }, surcharge: currency === currencyConfig.defaultCurrency ? Number(value) || 0 : item.surcharge } : item))} variant="borderless" size="small" />, <TableActionButton title="删除规格" tone="danger" onClick={() => setDeleteVariantIndex(i)}><Trash2 size={15}/></TableActionButton>]}/>
                    <p className="mt-2 text-xs text-muted-foreground">最终规格价格 = 基础单价 + 额外加价；规格库存由库存管理模块汇总，不可在商品页直接修改。</p>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="flex gap-2">{currencyConfig.currencies.filter(item => item.enabled).map(item => <button type="button" key={item.code} onClick={() => setCurrency(item.code)} className={`rounded-lg px-3 py-2 text-sm ${currency === item.code ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{item.code} · {item.symbol}</button>)}</div>
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-normal text-foreground">客户等级专属价</h3>
                        <Tooltip title="客户通过手机号匹配价格等级；等级价留空时使用基础价，规格额外加价会继续叠加。" placement="top">
                          <button type="button" aria-label="查看等级价规则" className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"><CircleHelp className="h-4 w-4" /></button>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip title={guestPricingMode === 'hidden' ? '游客当前不显示价格，识别客户手机号后显示对应价格。' : '游客当前展示商品基础价。'} placement="top">
                          <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-normal text-muted-foreground"><Info className="h-3 w-3" />游客：{guestPricingMode === 'hidden' ? '不显示价格' : '基础价'}</span>
                        </Tooltip>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-normal text-primary">基础价 {currency} {Number(form.currencyPrices?.[currency]?.basePrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {customerLevels.length ? <div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-4 py-3 text-left text-xs font-normal text-muted-foreground">客户等级</th><th className="w-64 px-4 py-3 text-left text-xs font-normal text-muted-foreground">专属价（{currency}）</th><th className="w-52 px-4 py-3 text-left text-xs font-normal text-muted-foreground">参考价（{currency}）</th></tr></thead><tbody>{customerLevels.map(level => <tr key={level.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><div className="flex items-center gap-2 font-normal text-foreground"><span>{level.name}</span>{level.note && <Tooltip title={level.note} placement="topLeft"><button type="button" aria-label={`查看${level.name}说明`} className="text-muted-foreground transition hover:text-primary"><Info className="h-3.5 w-3.5" /></button></Tooltip>}</div></td><td className="px-4 py-3"><InputNumber value={form.currencyPrices?.[currency]?.levelPrices?.[level.code]} min={0} precision={2} placeholder={`默认 ${Number(form.currencyPrices?.[currency]?.basePrice || 0).toFixed(2)}`} onChange={value => setForm(current => { const price = current.currencyPrices?.[currency] || { basePrice: 0, levelPrices: {} }; const levelPrices = { ...price.levelPrices }; if (value === null) delete levelPrices[level.code]; else levelPrices[level.code] = Number(value); return { ...current, currencyPrices: { ...(current.currencyPrices || {}), [currency]: { ...price, levelPrices } } }; })} variant="filled" style={{ width: '100%' }} /></td><td className="px-4 py-3"><div className="font-normal text-foreground">{referencePrice(level).toFixed(2)}</div><div className="mt-0.5 text-xs text-muted-foreground">{level.discountRate == null ? '无规则，按原价' : `${Number(level.discountRate)}%`}</div></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center"><p className="text-sm font-normal text-foreground">尚未创建客户等级</p><Link to="/customer" className="mt-3 inline-block text-xs font-normal text-primary hover:underline">前往客户管理</Link></div>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sidebar Sync Card */}
        <div className="flex flex-col gap-4">
          <div className="order-2 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5 space-y-4">
            <h3 className="font-normal text-foreground text-sm">同步设置</h3>
            <div className="space-y-3">
              {[
                { label: '同步状态', value: publishToSite ? 'published' : 'pending', badge: true },
                { label: '可见性', value: publishToSite ? '公开' : '仅后台可见' },
                { label: '最后更新', value: form.updatedAt ? new Date(form.updatedAt).toLocaleDateString('zh-CN') : '尚未保存' },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  {f.badge ? <StatusBadge status={f.value as 'published' | 'pending'} /> : <span className="text-xs font-normal text-foreground">{f.value}</span>}
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={publishToSite} onChange={e => setPublishToSite(e.target.checked)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-normal text-foreground">同步到独立站</div>
                  <div className="text-xs text-muted-foreground mt-0.5">保存后立即同步到独立站商品池</div>
                </div>
              </label>
            </div>
            <button disabled={saving || (!id && !!productQuota && productQuota.used >= productQuota.limit)} title={!id && productQuota && productQuota.used >= productQuota.limit ? '商品额度已用完，请升级套餐或联系管理员' : ''} onClick={handleSave} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-normal hover:bg-primary/90 shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? '保存中...' : publishToSite ? '保存并同步' : '保存'}
            </button>
            <button onClick={() => navigate('/products')} className="w-full py-2.5 border border-border text-muted-foreground rounded-xl text-sm font-normal hover:bg-secondary transition-colors">
              取消
            </button>
          </div>

          <div className="order-1 backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-5">
            <h3 className="font-normal text-foreground text-sm mb-3">商品分类</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-normal text-muted-foreground mb-2 block">分类</label>
                <Select value={form.category || undefined} onChange={value => setForm(current => ({ ...current, category: value }))} placeholder="请选择商品分类" style={{ width: '100%' }} size="middle" variant="filled" options={categories.map(item => ({ value: item.code, label: item.label }))} />
                {categories.length === 0 && <p className="mt-1.5 text-xs text-amber-600">请先前往商品分类添加分类项</p>}
              </div>
              <div>
                  <label className="text-xs font-normal text-muted-foreground mb-2 block">标签</label>
                    <div className="mb-2 flex gap-1 flex-wrap">
                      {(form.tags || []).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-normal flex items-center gap-1">
                          {t}<button type="button" onClick={() => setForm(current => ({ ...current, tags: (current.tags || []).filter(tag => tag !== t) }))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onPressEnter={addTag} placeholder="输入标签后按回车" variant="filled" size="middle" suffix={<button type="button" onClick={addTag} className="text-xs font-normal text-primary">添加</button>} />
              </div>
              <div>
                <label className="text-xs font-normal text-muted-foreground mb-2 block">商品标记</label>
                <Select value={form.badge || ''} onChange={(badge: Product['badge']) => setForm(current => ({ ...current, badge }))} style={{ width: '100%' }} variant="filled" options={[{ value: '', label: '无标记' }, { value: 'new', label: '新品' }, { value: 'hot', label: '爆品' }, { value: 'bestseller', label: '热销' }, { value: 'recommended', label: '推荐' }]} />
              </div>
              <div>
                <label className="text-xs font-normal text-muted-foreground mb-2 block">点赞数量</label>
                <InputNumber value={Number(form.likeCount) || 0} min={0} precision={0} onChange={likeCount => setForm(current => ({ ...current, likeCount: Number(likeCount) || 0 }))} variant="filled" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Delete Variant Confirmation Modal */}
      {deleteVariantIndex !== null && (
        <AppModal open title="删除规格" onCancel={() => setDeleteVariantIndex(null)} onOk={() => handleDeleteVariant(deleteVariantIndex)} okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }} width={440}>
            <div className="py-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-normal text-foreground mb-1">确认删除此规格？</p>
                  <p className="text-sm text-muted-foreground">删除后不可恢复，该规格的库存数据将一并移除。</p>
                </div>
              </div>
            </div>
        </AppModal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ProductEditPage;
