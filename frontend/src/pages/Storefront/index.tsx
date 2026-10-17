import React, { useEffect, useRef, useState } from 'react';
import { Button, Descriptions, Empty, Input, Select, Tag, Tree, Upload, message, type UploadProps } from 'antd';
import { ArrowRight, CheckCircle2, Copy, Eye, Globe2, Heart, ImagePlus, Languages, Link2, MessageSquareText, PackageCheck, Plus, Search, Settings2, ShieldCheck, Trash2, UserCheck, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { AppModal, AppTable, createActionColumn, LeadStatusTag, leadStatusMeta, PageContent, PageHeader, ProductGallery, ProductTableCell, productBadgeLabels, StatusBadge, TableActionButton, TableActions } from '../../components/shared';
import { productApi, siteApi, storefrontManageApi, workspaceApi, type SiteDomain, type SiteVersion, type StorefrontLead, type StorefrontOverview, type WorkspaceSettings } from '../../services/api/index';
import type { Product, ProductCategory } from '../../types';
import { useTablePagination } from '../../hooks/useTablePagination';
import { can } from '../../utils/permissions';
import { ANTD_LOCALE_OPTIONS, DEFAULT_ANTD_LOCALE, antdLocaleLabel, normalizeAntdLocale } from '../../config/antdLocales';

const card = 'rounded-2xl border border-border bg-card shadow-sm';
const languageOptions = ANTD_LOCALE_OPTIONS.map(option => ({ ...option, searchText: `${option.label} ${option.nativeLabel} ${option.value}` }));
const selectableLanguageOptions = languageOptions.filter(option => !['en_GB', 'zh_HK'].includes(option.value));
const preferredLanguageLocale = (value?: string) => ({ en_GB: 'en_US', zh_HK: 'zh_TW' }[normalizeAntdLocale(value)] || normalizeAntdLocale(value));
const localeOption = (option: typeof ANTD_LOCALE_OPTIONS[number], selected = false) => <span className="flex min-w-0 items-center gap-2"><span className={`grid h-7 min-w-14 place-items-center rounded-md px-1.5 font-mono text-[10px] ${selected ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{option.value}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-foreground">{option.label}</span><span className="block truncate text-[10px] text-muted-foreground">{option.nativeLabel}</span></span></span>;
const SettingsField = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => <label data-settings-field className={`block space-y-1.5 ${className}`.trim()}><span data-settings-label className="block text-xs font-normal text-muted-foreground">{label}</span>{children}</label>;
const leadStatus = leadStatusMeta;
type LeadAction = 'follow' | 'start' | 'convert' | 'close';

const Leads = () => {
  const pagination = useTablePagination();
  const [items, setItems] = useState<StorefrontLead[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<StorefrontLead | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLead, setActionLead] = useState<{ lead: StorefrontLead; action: LeadAction } | null>(null);
  const [actionDraft, setActionDraft] = useState({ assigneeUserId: '', note: '', closeReason: '' });
  const [assignees, setAssignees] = useState<Array<{ userId: string; name: string; role: string }>>([]);
  const [createDraft, setCreateDraft] = useState({ name: '', contact: '', requirements: '' });
  const [overview, setOverview] = useState<StorefrontOverview>();
  const load = () => storefrontManageApi.leads({ page: pagination.current, pageSize: pagination.pageSize, keyword: keyword || undefined, status: status || undefined }).then(result => { setItems(result.items); pagination.reconcile(result.total); });
  useEffect(() => { void load(); }, [pagination.current, pagination.pageSize, status]);
  const loadOverview = () => storefrontManageApi.overview().then(setOverview).catch(() => setOverview(undefined));
  useEffect(() => { void loadOverview(); }, []);
  const open = (lead: StorefrontLead) => setSelected(lead);
  const openAction = async (lead: StorefrontLead, action: LeadAction) => {
    let defaultAssignee = lead.assignedToUserId || '';
    if (action === 'follow') {
      const result = await storefrontManageApi.leadAssignees();
      setAssignees(result.members);
      defaultAssignee ||= result.currentUserId;
    }
    setActionDraft({ assigneeUserId: defaultAssignee, note: '', closeReason: '' });
    setActionLead({ lead, action });
  };
  const submitAction = async () => {
    if (!actionLead) return;
    const { lead, action } = actionLead;
    if (action === 'follow' && !actionDraft.assigneeUserId) { message.error('请选择跟进成员'); return; }
    if (action !== 'close' && !actionDraft.note.trim()) { message.error('请填写备注信息'); return; }
    if (action === 'close' && !actionDraft.closeReason.trim()) { message.error('请填写关闭原因'); return; }
    const status: StorefrontLead['status'] = action === 'follow' || action === 'start' ? 'following' : action === 'convert' ? 'converted' : 'closed';
    const updated = await storefrontManageApi.updateLead(lead.id, { status, note: actionDraft.note.trim() || undefined, assigneeUserId: action === 'follow' ? actionDraft.assigneeUserId : undefined, closeReason: action === 'close' ? actionDraft.closeReason.trim() : undefined });
    setItems(rows => rows.map(row => row.id === updated.id ? updated : row));
    setActionLead(null);
    message.success(action === 'follow' || action === 'start' ? '线索已进入跟进阶段' : action === 'convert' ? '线索已标记为转化' : '线索已关闭');
    await loadOverview();
  };
  const metrics = [
    { label: '累计线索', value: overview?.leads.total || 0, note: `新线索 ${overview?.leads.new || 0} 条`, icon: MessageSquareText, tone: 'bg-violet-50 text-violet-600' },
    { label: '跟进中', value: overview?.leads.following || 0, note: '正在推进的询盘', icon: ArrowRight, tone: 'bg-amber-50 text-amber-600' },
    { label: '已转化', value: overview?.leads.converted || 0, note: '已确认有效商机', icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600' },
  ];
  return <PageContent>
    <PageHeader title="线索池" description="独立站询盘自动同步，也可手工新建，按新建、跟进、转化三阶段推进" action={can('storefront.lead.manage') ? <Button type="primary" icon={<Plus size={15}/>} onClick={() => { setCreateDraft({ name: '', contact: '', requirements: '' }); setCreating(true); }}>新建线索</Button> : undefined}/>
    <div className="grid gap-4 md:grid-cols-3">{metrics.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className={`${card} p-5`}><div className="flex items-start justify-between"><div><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div><div className="mt-2 text-xs text-muted-foreground">{note}</div></div><span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={20}/></span></div></article>)}</div>
    <section className={`${card} overflow-hidden`}><div className="flex flex-wrap gap-3 border-b border-border p-4"><Input value={keyword} onChange={event => setKeyword(event.target.value)} onPressEnter={() => { pagination.reset(); void load(); }} prefix={<Search size={15}/>} placeholder="搜索联系人、联系方式或采购需求" allowClear className="max-w-sm"/><Select value={status} onChange={value => { setStatus(value); pagination.reset(); }} className="w-36" options={[{ value: '', label: '全部状态' }, ...Object.entries(leadStatus).map(([value, item]) => ({ value, label: item.label }))]}/><Button onClick={() => { pagination.reset(); void load(); }}>查询</Button></div><AppTable rowKey="id" dataSource={items} pagination={pagination.config} onRow={record => ({ onClick: () => open(record), className: 'cursor-pointer' })} columns={[{ title: '联系人', dataIndex: 'name', render: value => <span className="font-normal">{value || '-'}</span> }, { title: '联系方式', render: (_, row) => row.contact || row.email || row.phone || '-' }, { title: '跟进人', dataIndex: 'assignedToName', render: value => value || '-' }, { title: '来源', render: (_, row) => row.sourcePage ? '独立站询盘' : '手工新建' }, { title: '采购需求', dataIndex: 'requirements', ellipsis: true, render: value => value || '-' }, { title: '状态', dataIndex: 'status', render: value => <LeadStatusTag status={value}/> }, { title: '提交时间', dataIndex: 'createdAt', render: value => value ? new Date(value).toLocaleString('zh-CN') : '-' }, createActionColumn<StorefrontLead>({ actions: 3, render: (_, row) => <TableActions><TableActionButton title="查看详情" onClick={event => { event.stopPropagation(); open(row); }}><Eye size={15}/></TableActionButton>{can('storefront.lead.assign') && row.status === 'new' && <TableActionButton title="跟进并指派" tone="primary" onClick={event => { event.stopPropagation(); void openAction(row, 'follow'); }}><UserCheck size={15}/></TableActionButton>}{!can('storefront.lead.assign') && can('storefront.lead.manage') && row.status === 'new' && <TableActionButton title="开始跟进" tone="primary" onClick={event => { event.stopPropagation(); void openAction(row, 'start'); }}><ArrowRight size={15}/></TableActionButton>}{can('storefront.lead.manage') && row.status === 'following' && <TableActionButton title="标记转化" tone="success" onClick={event => { event.stopPropagation(); void openAction(row, 'convert'); }}><CheckCircle2 size={15}/></TableActionButton>}{can('storefront.lead.manage') && ['new', 'following'].includes(row.status) && <TableActionButton title="关闭线索" tone="danger" onClick={event => { event.stopPropagation(); void openAction(row, 'close'); }}><XCircle size={15}/></TableActionButton>}</TableActions> })]}/></section>
    <AppModal open={creating} title="新建线索" description="填写核心询盘信息，新线索将进入待跟进阶段" width={620} onCancel={() => setCreating(false)} okText="创建线索" onOk={async () => { const values = Object.values(createDraft).map(value => value.trim()); if (values.some(value => !value)) { message.error('请完整填写联系人、联系方式和采购需求'); return; } await storefrontManageApi.createLead(createDraft); message.success('线索已创建'); setCreating(false); pagination.reset(); await Promise.all([load(), loadOverview()]); }}><div className="grid gap-4 md:grid-cols-2"><SettingsField label="联系人 *"><Input value={createDraft.name} onChange={event => setCreateDraft({ ...createDraft, name: event.target.value })} placeholder="请输入联系人姓名"/></SettingsField><SettingsField label="联系方式 *"><Input value={createDraft.contact} onChange={event => setCreateDraft({ ...createDraft, contact: event.target.value })} placeholder="手机号或邮箱，不限制格式"/></SettingsField><SettingsField label="采购需求 *" className="md:col-span-2"><Input.TextArea rows={5} value={createDraft.requirements} onChange={event => setCreateDraft({ ...createDraft, requirements: event.target.value })} placeholder="请填写产品、数量、规格、交期等采购需求"/></SettingsField></div></AppModal>
    <AppModal open={!!actionLead} title={actionLead?.action === 'follow' ? '跟进并指派' : actionLead?.action === 'start' ? '开始跟进' : actionLead?.action === 'convert' ? '标记转化' : '关闭线索'} description={actionLead ? `${actionLead.lead.name || '-'} · ${actionLead.lead.contact || actionLead.lead.email || actionLead.lead.phone || '-'}` : undefined} width={560} onCancel={() => setActionLead(null)} okText={actionLead?.action === 'follow' || actionLead?.action === 'start' ? '开始跟进' : actionLead?.action === 'convert' ? '确认转化' : '确认关闭'} onOk={submitAction}>{actionLead && <div className="space-y-4">{actionLead.action === 'follow' && <><SettingsField label="指派成员 *"><Select className="w-full" value={actionDraft.assigneeUserId || undefined} onChange={assigneeUserId => setActionDraft({ ...actionDraft, assigneeUserId })} placeholder="请选择跟进成员" options={assignees.map(member => ({ value: member.userId, label: member.name }))}/></SettingsField><p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">可指派给项目内任意成员；普通成员无需、也不能指派给管理员。被指派成员需要拥有“跟进和处理线索”权限，才能继续跟进、标记转化或关闭线索。</p></>}{actionLead.action !== 'close' && <SettingsField label="备注信息 *"><Input.TextArea rows={4} value={actionDraft.note} onChange={event => setActionDraft({ ...actionDraft, note: event.target.value })} placeholder={actionLead.action === 'convert' ? '填写转化结果或商机说明' : '填写跟进计划或首次沟通信息'}/></SettingsField>}{actionLead.action === 'close' && <SettingsField label="关闭原因 *"><Input.TextArea rows={4} value={actionDraft.closeReason} onChange={event => setActionDraft({ ...actionDraft, closeReason: event.target.value })} placeholder="请填写关闭线索的原因"/></SettingsField>}</div>}</AppModal>
    <AppModal open={!!selected} title={`线索详情${selected?.name ? ` · ${selected.name}` : ''}`} description="查看线索来源、联系人和跟进处理信息" width={900} className="sales-detail-modal" footer={null} onCancel={() => setSelected(null)}>{selected && <Descriptions bordered size="small" column={2} items={[{ key: 'name', label: '联系人', children: selected.name || '-' }, { key: 'status', label: '状态', children: <LeadStatusTag status={selected.status}/> }, { key: 'contact', label: '联系方式', children: selected.contact || selected.email || selected.phone || '-' }, { key: 'company', label: '公司', children: selected.company || '-' }, { key: 'source', label: '来源', children: selected.sourcePage ? '独立站询盘' : '手工新建' }, { key: 'product', label: '关联商品', children: selected.productName || '-' }, { key: 'assignee', label: '跟进人', children: selected.assignedToName || '-' }, { key: 'createdAt', label: '提交时间', children: selected.createdAt ? new Date(selected.createdAt).toLocaleString('zh-CN') : '-' }, { key: 'requirements', label: '采购需求', children: <div className="whitespace-pre-wrap">{selected.requirements || '-'}</div>, span: 2 }, { key: 'note', label: '跟进备注', children: <div className="whitespace-pre-wrap">{selected.note || '-'}</div>, span: 2 }, ...(selected.status === 'closed' ? [{ key: 'closeReason', label: '关闭原因', children: <div className="whitespace-pre-wrap">{selected.closeReason || '-'}</div>, span: 2 }] : [])]}/>}</AppModal>
  </PageContent>;
};

const ProductPool = () => {
  const pagination = useTablePagination();
  const [items, setItems] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allProductCount, setAllProductCount] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [preview, setPreview] = useState<Product | null>(null);
  const selectedCategoryCodes = category === 'all' ? [] : categories.flatMap(parent => parent.code === category ? [parent.code, ...parent.children.map(child => child.code)] : parent.children.some(child => child.code === category) ? [category] : []);
  const load = () => storefrontManageApi.products({ page: pagination.current, pageSize: pagination.pageSize, keyword: keyword || undefined, category: selectedCategoryCodes.length ? selectedCategoryCodes.join(',') : undefined }).then(result => { setItems(result.items); setCounts(result.categoryCounts); setCategories(result.categories); setAllProductCount(result.summary.totalProducts); pagination.reconcile(result.total); });
  useEffect(() => { void load(); }, [pagination.current, pagination.pageSize, category]);
  const categoryCount = (code: string) => { const parent = categories.find(item => item.code === code); const codes = parent ? [parent.code, ...parent.children.map(child => child.code)] : [code]; return codes.reduce((sum, item) => sum + (counts[item] || 0), 0); };
  const categoryLabel = (code: string) => categories.find(parent => parent.code === code)?.label || categories.flatMap(parent => parent.children).find(child => child.code === code)?.label || '未分类';
  const categoryTreeData = categories.map(parent => ({ key: parent.code, title: <span className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate text-sm" title={parent.label}>{parent.label}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{categoryCount(parent.code)}</span></span>, children: parent.children.map(child => ({ key: child.code, title: <span className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate text-sm" title={child.label}>{child.label}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{counts[child.code] || 0}</span></span> })) }));
  return <PageContent>
    <PageHeader title="商品池" description="只读查看 ERP 已同步的商品与分类，请在 ERP 商品管理中维护"/>
    <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 items-stretch gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="product-category-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl"><div className="shrink-0 border-b border-border px-4 py-4"><h2 className="text-sm font-bold">商品分类</h2><p className="mt-0.5 text-xs text-muted-foreground">只读分类 · {categories.length} 个一级分类</p></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"><button type="button" onClick={() => { setCategory('all'); pagination.reset(); }} className={`mb-1 flex h-[31px] w-full items-center justify-between rounded-lg px-3 text-left ${category === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}><span className="text-sm">全部商品</span><span className="text-xs tabular-nums">{allProductCount}</span></button>{categories.length ? <Tree blockNode defaultExpandAll selectedKeys={category === 'all' ? [] : [category]} treeData={categoryTreeData} onSelect={keys => { setCategory(String(keys[0] || 'all')); pagination.reset(); }} className="product-category-tree bg-transparent [&_.ant-tree-node-selected]:bg-primary/10! [&_.ant-tree-node-selected]:text-primary!"/> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已同步商品分类"/>}</div></aside>
      <section className={`${card} min-w-0 overflow-hidden`}><div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4"><Input value={keyword} onChange={event => setKeyword(event.target.value)} onPressEnter={() => { pagination.reset(); void load(); }} prefix={<Search size={15}/>} placeholder="搜索商品名称或商品编码..." allowClear className="max-w-xs"/><Button onClick={() => { pagination.reset(); void load(); }}>查询</Button><span className="ml-auto rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">商品与分类仅供查看</span></div><AppTable rowKey="id" dataSource={items} scroll={{ x: 1000 }} pagination={pagination.config} onRow={record => ({ onClick: () => setPreview(record), className: 'cursor-pointer' })} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已同步商品"/> }} columns={[{ title: '商品', width: 250, render: (_, row) => <ProductTableCell product={row} categoryName={categoryLabel(row.category)}/> }, { title: '商品编码', dataIndex: 'sku', width: 140, render: value => <span className="font-mono text-xs text-muted-foreground">{value || '-'}</span> }, { title: '库存', dataIndex: 'stock', width: 90, align: 'right' }, { title: '最小起订量', dataIndex: 'moq', width: 110, align: 'right' }, { title: '点赞数', dataIndex: 'likeCount', width: 90, align: 'right', render: value => <span className="inline-flex items-center gap-1 text-muted-foreground"><Heart size={14}/>{Number(value) || 0}</span> }, { title: '状态', dataIndex: 'status', width: 100, render: value => <StatusBadge status={value}/> }, { title: '最后同步', dataIndex: 'updatedAt', width: 170, render: value => value ? new Date(value).toLocaleString('zh-CN') : '-' }, createActionColumn<Product>({ actions: 1, render: (_, row) => <TableActions><TableActionButton title="查看商品" onClick={event => { event.stopPropagation(); setPreview(row); }}><Eye size={15}/></TableActionButton></TableActions> }) ]}/></section>
    </div>
    <AppModal open={!!preview} title="商品详情" description="查看 ERP 同步的商品展示信息" footer={<Button onClick={() => setPreview(null)}>关闭</Button>} onCancel={() => setPreview(null)} width={900} className="storefront-product-detail-modal">{preview && <div className="space-y-5"><div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]"><div><ProductGallery images={preview.images} fallbackImage={preview.img} alt={preview.nameZh || '-'}/><div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">该数据由 ERP 商品管理同步</div></div><div className="min-w-0 space-y-4"><div><div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={preview.status}/>{preview.badge && <Tag color="gold">{productBadgeLabels[preview.badge] || preview.badge}</Tag>}{preview.hot && <Tag color="red">热门商品</Tag>}</div><h3 className="text-xl font-semibold text-foreground">{preview.nameZh || '-'}</h3></div><div className="flex flex-wrap items-center gap-2">{(preview.tags || []).length ? preview.tags!.map(tag => <Tag key={tag}>{tag}</Tag>) : <span className="text-sm text-muted-foreground">-</span>}<span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-600"><Heart size={15} fill="currentColor"/>{Number(preview.likeCount) || 0}</span></div><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">{[['商品编码', preview.sku], ['商品分类', categoryLabel(preview.category)], ['库存', preview.stock], ['最小起订量', preview.moq], ['最后同步', preview.updatedAt ? new Date(preview.updatedAt).toLocaleString('zh-CN') : '-']].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-secondary/30 p-3"><span className="text-xs text-muted-foreground">{label}</span><div className="mt-1 break-words font-normal text-foreground">{value ?? '-'}</div></div>)}</div></div></div><section className="rounded-2xl border border-border p-5"><h4 className="mb-3 text-sm font-semibold">商品说明</h4>{preview.description ? <div data-testid="storefront-product-description" className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: preview.description }}/> : <div className="text-sm text-muted-foreground">-</div>}</section></div>}</AppModal>
  </PageContent>;
};

const ReleaseHistory = () => {
  const [items, setItems] = useState<SiteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const siteId = String(JSON.parse(localStorage.getItem('mercivo_user') || '{}').siteId || '');
    void (siteId ? siteApi.versions(siteId) : Promise.resolve([])).then(setItems).finally(() => setLoading(false));
  }, []);
  return <PageContent>
    <PageHeader title="发版历史" description="查看独立站每次发布的版本、时间、发版人与备注"/>
    <section className={`${card} overflow-hidden`}>
      <AppTable loading={loading} rowKey="id" dataSource={items} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无发版记录"/> }} columns={[
        { title: '版本号', dataIndex: 'version', render: value => <Tag color="purple">v{value}</Tag> },
        { title: '发版日期', dataIndex: 'publishedAt', render: value => value ? new Date(value).toLocaleString('zh-CN') : '-' },
        { title: '发版人', dataIndex: 'publishedBy', render: value => value || '-' },
        { title: '发版备注', dataIndex: 'releaseNote', render: value => value || '-' },
      ]}/>
    </section>
  </PageContent>;
};

const StorefrontSettings = () => {
  const [workspace, setWorkspace] = useState<WorkspaceSettings>();
  const [languages, setLanguages] = useState<string[]>([]);
  const [seo, setSeo] = useState({ title: '', description: '', keywords: '' });
  const [domains, setDomains] = useState<SiteDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const savedSiteInfo = useRef('');
  const savedLanguages = useRef('');
  const savedSeo = useRef('');
  const siteInfoEditable = can('settings.site');
  const languagesEditable = can('settings.site');
  const seoEditable = can('settings.site');
  const domainEditable = can('site.domain');
  const siteInfoValue = workspace ? { name: workspace.site.name, description: workspace.site.description, logoUrl: workspace.site.logoUrl || '' } : null;
  const languagesValue = workspace ? { defaultLanguage: workspace.site.defaultLanguage, supportedLanguages: languages } : null;

  useEffect(() => {
    void Promise.all([workspaceApi.getSettings(), workspaceApi.getConfig<typeof seo>('seo')])
      .then(async ([settings, seoValue]) => {
        const normalizedDefault = preferredLanguageLocale(settings.site.defaultLanguage);
        const nextLanguages = [...new Set((settings.site.supportedLanguages?.length ? settings.site.supportedLanguages : [DEFAULT_ANTD_LOCALE]).map(preferredLanguageLocale))];
        settings.site.defaultLanguage = nextLanguages.includes(normalizedDefault) ? normalizedDefault : nextLanguages[0];
        settings.site.supportedLanguages = nextLanguages;
        const nextSeo = { title: seoValue.title || '', description: seoValue.description || '', keywords: seoValue.keywords || '' };
        savedSiteInfo.current = JSON.stringify({ name: settings.site.name, description: settings.site.description, logoUrl: settings.site.logoUrl || '' });
        savedLanguages.current = JSON.stringify({ defaultLanguage: settings.site.defaultLanguage, supportedLanguages: nextLanguages });
        savedSeo.current = JSON.stringify(nextSeo);
        setWorkspace(settings); setLanguages(nextLanguages); setSeo(nextSeo); setSaveState('saved');
        if (domainEditable) setDomains(await siteApi.domains(settings.site.id));
      })
      .catch(() => { setSaveState('error'); message.error('站点设置加载失败'); });
  }, []);

  useEffect(() => {
    if (!siteInfoEditable || saveState === 'loading' || !siteInfoValue || JSON.stringify(siteInfoValue) === savedSiteInfo.current) return;
    const value = siteInfoValue;
    const timer = window.setTimeout(async () => {
      setSaveState('saving');
      try { await workspaceApi.updateSiteInfo(value); savedSiteInfo.current = JSON.stringify(value); setSaveState('saved'); }
      catch { setSaveState('error'); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace?.site.name, workspace?.site.description, workspace?.site.logoUrl, siteInfoEditable]);

  useEffect(() => {
    if (!languagesEditable || saveState === 'loading' || !languagesValue || JSON.stringify(languagesValue) === savedLanguages.current) return;
    const value = languagesValue;
    const timer = window.setTimeout(async () => {
      setSaveState('saving');
      try { await workspaceApi.updateSiteLanguages(value); savedLanguages.current = JSON.stringify(value); setSaveState('saved'); }
      catch { setSaveState('error'); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace?.site.defaultLanguage, languages, languagesEditable]);

  useEffect(() => {
    if (!seoEditable || saveState === 'loading' || JSON.stringify(seo) === savedSeo.current) return;
    const value = seo;
    const timer = window.setTimeout(async () => {
      setSaveState('saving');
      try { const saved = await workspaceApi.updateConfig<typeof seo>('seo', value); savedSeo.current = JSON.stringify(saved); setSeo(saved); setSaveState('saved'); }
      catch { setSaveState('error'); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [seo, seoEditable]);

  const addDomain = async () => {
    if (!workspace || !newDomain.trim()) return;
    setDomainSaving(true);
    try { const domain = await siteApi.addDomain(workspace.site.id, newDomain.trim()); setDomains(items => [domain, ...items]); setNewDomain(''); message.success('域名已添加，请完成 DNS 解析后验证'); }
    catch { message.error('域名添加失败，请检查格式或是否已被绑定'); }
    finally { setDomainSaving(false); }
  };
  const verifyDomain = async (domain: SiteDomain) => {
    try { await siteApi.verifyDomain(domain.id); setDomains(await siteApi.domains(domain.siteId)); message.success('域名验证成功'); }
    catch { message.error('暂未检测到正确的 TXT 验证记录'); }
  };
  const removeDomain = (domain: SiteDomain) => AppModal.confirm({ title: '移除该域名？', content: `移除后 ${domain.hostname} 将无法继续访问当前站点。`, okText: '确认移除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await siteApi.removeDomain(domain.id); setDomains(items => items.filter(item => item.id !== domain.id)); message.success('域名已移除'); } });
  const uploadBrandLogo: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!(file instanceof File) || !workspace) return;
    setLogoUploading(true);
    try { const uploaded = await productApi.uploadSiteLogo(file); setWorkspace({ ...workspace, site: { ...workspace.site, logoUrl: uploaded.url } }); onSuccess?.(uploaded); message.success('品牌 Logo 已上传'); }
    catch (error) { onError?.(error instanceof Error ? error : new Error('上传失败')); message.error('品牌 Logo 上传失败'); }
    finally { setLogoUploading(false); }
  };
  const validateBrandLogo: UploadProps['beforeUpload'] = file => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { message.error('仅支持 JPG、PNG、WebP 或 GIF 图片'); return Upload.LIST_IGNORE; }
    if (file.size > 500 * 1024) { message.error('Logo 图片不能超过 500KB'); return Upload.LIST_IGNORE; }
    return true;
  };
  const section = 'storefront-settings-card h-full rounded-2xl border border-border bg-card p-4 font-normal shadow-sm';
  const heading = (icon: React.ReactNode, title: string, description: string) => <div className="mb-4 flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div><div><h2 className="text-sm font-normal">{title}</h2><p className="mt-0.5 text-xs font-normal text-muted-foreground">{description}</p></div></div>;
  return <PageContent>
    <PageHeader title="站点设置" description="修改后自动保存" action={<span className={`text-xs ${saveState === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>{saveState === 'saving' ? '正在保存…' : saveState === 'error' ? '自动保存失败，请重试' : saveState === 'saved' ? '已自动保存' : '加载中…'}</span>}/>
    <div className="grid items-stretch gap-4 xl:grid-cols-2">
      {can('page.site.settings') && <section className={`${section} flex flex-col`}>{heading(<Globe2 size={19}/>, '站点信息', '维护前台品牌信息与品牌形象')}<div className="flex flex-1 flex-col gap-4">
        <SettingsField label="站点名称"><Input placeholder="站点名称" disabled={!siteInfoEditable} value={workspace?.site.name || ''} onChange={event => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, name: event.target.value } })}/></SettingsField>
        <SettingsField label="站点描述"><Input placeholder="站点描述" disabled={!siteInfoEditable} value={workspace?.site.description || ''} onChange={event => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, description: event.target.value } })}/></SettingsField>
        {workspace && <SettingsField label="品牌 Logo"><Upload data-testid="brand-logo-upload" accept="image/jpeg,image/png,image/webp,image/gif" listType="picture-card" maxCount={1} disabled={!siteInfoEditable || logoUploading} beforeUpload={validateBrandLogo} customRequest={uploadBrandLogo} fileList={workspace.site.logoUrl ? [{ uid: 'brand-logo', name: '品牌 Logo', status: 'done', url: workspace.site.logoUrl }] : []} onRemove={() => { setWorkspace({ ...workspace, site: { ...workspace.site, logoUrl: '' } }); return true; }}>{!workspace.site.logoUrl && <div className="flex flex-col items-center gap-1 text-muted-foreground"><ImagePlus size={22}/><span className="text-xs">{logoUploading ? '上传中…' : '上传 Logo'}</span><span className="text-[10px]">500KB 以内</span></div>}</Upload><p className="mt-2 text-[11px] leading-5 text-muted-foreground">推荐尺寸：288 × 72 px（约 4:1）；建议使用透明背景 PNG 或 WebP，文件不超过 500KB。</p></SettingsField>}
      </div></section>}
      {can('page.site.settings') && <section className={`${section} flex flex-col`}>{heading(<Settings2 size={19}/>, 'SEO 优化', '配置搜索引擎展示文案')}<div className="flex flex-1 flex-col gap-4">
        <SettingsField label="SEO 标题"><Input placeholder="SEO 标题" disabled={!seoEditable} maxLength={60} value={seo.title} onChange={event => setSeo({ ...seo, title: event.target.value })}/></SettingsField>
        <SettingsField label="SEO 描述" className="flex min-h-24 flex-1 flex-col"><Input.TextArea placeholder="SEO 描述" disabled={!seoEditable} maxLength={160} className="min-h-24 flex-1 resize-none" value={seo.description} onChange={event => setSeo({ ...seo, description: event.target.value })}/></SettingsField>
        <SettingsField label="关键词"><Input placeholder="关键词" disabled={!seoEditable} value={seo.keywords} onChange={event => setSeo({ ...seo, keywords: event.target.value })}/></SettingsField>
      </div></section>}
      {can('page.site.settings') && <section className={`${section} xl:col-span-2`}>{heading(<Languages size={19}/>, '多语言配置', '维护独立站可用语言并设置默认语言')}<div data-testid="language-search-container" style={{ marginBottom: 12 }}><Select aria-label="添加支持语言" placeholder="搜索并添加语言" disabled={!languagesEditable} className="w-full max-w-sm" showSearch optionFilterProp="searchText" value={undefined} options={selectableLanguageOptions.filter(option => !languages.includes(option.value)).map(option => ({ ...option, label: `${option.label} (${option.value})` }))} optionRender={option => localeOption(ANTD_LOCALE_OPTIONS.find(item => item.value === option.value)!)} onChange={value => { if (value) setLanguages(current => [...current, value]); }}/></div><div data-testid="language-table" className="overflow-hidden rounded-xl border border-border"><div className="grid grid-cols-[minmax(0,1fr)_120px_56px] bg-secondary/35 px-4 py-2 text-xs text-muted-foreground"><span>语言</span><span className="text-center">默认</span><span/></div>{languages.map(code => { const option = ANTD_LOCALE_OPTIONS.find(item => item.value === code); const isDefaultLanguage = workspace?.site.defaultLanguage === code; return <div data-testid="selected-language-row" key={code} className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px_56px] items-center border-t border-border px-4 first:border-t-0"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 min-w-16 place-items-center rounded-md bg-primary/10 px-2 font-mono text-[11px] text-primary">{code}</span><div className="min-w-0"><div className="truncate text-sm font-medium">{option?.label || code}</div><div className="truncate text-xs text-muted-foreground">{option?.nativeLabel || code}</div></div></div><div className="text-center"><input type="radio" name="default-site-language" aria-label={`设 ${code} 为默认语言`} disabled={!languagesEditable} checked={isDefaultLanguage} onChange={() => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, defaultLanguage: code } })}/></div><button type="button" aria-label={`删除语言 ${code}`} title={isDefaultLanguage ? '默认语言不可删除' : undefined} disabled={!languagesEditable || languages.length === 1 || isDefaultLanguage} onClick={() => { if (!workspace || languages.length === 1 || isDefaultLanguage) return; const next = languages.filter(item => item !== code); setLanguages(next); setWorkspace({ ...workspace, site: { ...workspace.site, supportedLanguages: next } }); }} className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-35"><Trash2 size={15}/></button></div>; })}</div></section>}
      {domainEditable && <section className={`${section} xl:col-span-2`}>{heading(<Link2 size={19}/>, '自定义域名', '完成所有权验证和解析后，系统自动提供 HTTPS')}<div className="flex max-w-2xl items-end gap-2"><SettingsField label="自定义域名" className="flex-1"><Input placeholder="自定义域名" value={newDomain} onChange={event => setNewDomain(event.target.value)} onPressEnter={() => void addDomain()}/></SettingsField><Button type="primary" loading={domainSaving} disabled={!newDomain.trim()} onClick={() => void addDomain()}>添加域名</Button></div><div className="mt-4 space-y-3">{domains.length === 0 && <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center text-sm text-muted-foreground">尚未绑定自定义域名</div>}{domains.map(domain => <article key={domain.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{domain.hostname}</b>{domain.isPrimary && <Tag color="blue">主域名</Tag>}<Tag color={domain.status === 'active' ? 'green' : 'gold'}>{domain.status === 'active' ? '已验证' : '待验证'}</Tag></div><p className="mt-1 text-xs text-muted-foreground">{domain.status === 'active' ? 'DNS 已验证 · HTTPS 将自动签发和续期' : '请添加下方 DNS 记录，再执行验证'}</p></div><div className="flex gap-2">{domain.status !== 'active' && <Button size="small" icon={<ShieldCheck size={14}/>} onClick={() => void verifyDomain(domain)}>立即验证</Button>}<Button size="small" danger type="text" icon={<Trash2 size={14}/>} onClick={() => removeDomain(domain)}>移除</Button></div></div><div className="mt-4 grid gap-2 md:grid-cols-2">{[domain.status !== 'active' ? domain.verificationRecord : null, domain.routingRecord].filter(Boolean).map(record => <button type="button" key={`${record!.type}:${record!.name}`} onClick={() => { void navigator.clipboard.writeText(`${record!.type} ${record!.name} ${record!.value}`); message.success('DNS 记录已复制'); }} className="group rounded-lg bg-secondary/50 p-3 text-left hover:bg-secondary"><div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground"><span>{record!.type} 记录</span><Copy size={13}/></div><div className="mt-1 truncate font-mono text-xs">{record!.name}</div><div className="mt-1 truncate font-mono text-xs text-primary">{record!.value}</div></button>)}</div></article>)}</div></section>}
    </div>
  </PageContent>;
};

const StorefrontPage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  if (module === 'leads') return <Leads/>;
  if (module === 'products') return <ProductPool/>;
  if (module === 'releases') return <ReleaseHistory/>;
  if (module === 'settings') return <StorefrontSettings/>;
  return null;
};

export default StorefrontPage;
