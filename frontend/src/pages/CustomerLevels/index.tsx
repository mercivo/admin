import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Form, Input, InputNumber, Modal, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit3, Eye, EyeOff, KeyRound, Plus, Search, Tags, Trash2, UserCheck, Users } from 'lucide-react';
import { customerApi, workspaceApi } from '../../services/api/index';
import type { Customer, CustomerLevel, GuestPricingPolicy } from '../../services/api/index';
import { DateField } from '../../components/shared';

const emptyCustomer: Omit<Customer, 'id'> = { name: '', company: '', phone: '', email: '', country: '', level: '', status: 'active', orders: 0, totalAmount: 0, lastOrderAt: null, notes: '' };

const CustomerLevelsPage: React.FC = () => {
  const [items, setItems] = useState<Customer[]>([]);
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [currency, setCurrency] = useState('CNY');
  const [pricingPolicy, setPricingPolicy] = useState<GuestPricingPolicy['mode']>('base');
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState('all');
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [editingLevel, setEditingLevel] = useState<CustomerLevel | null | undefined>(undefined);
  const [form] = Form.useForm();
  const [levelForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    const [customersResult, levelsResult, settingsResult, pricingResult] = await Promise.allSettled([customerApi.list(), customerApi.levels(), workspaceApi.getSettings(), customerApi.pricingPolicy()]);
    if (customersResult.status === 'fulfilled') setItems(customersResult.value); else message.error('客户列表加载失败');
    if (levelsResult.status === 'fulfilled') setLevels(levelsResult.value); else message.error('客户等级加载失败');
    if (settingsResult.status === 'fulfilled') setCurrency(settingsResult.value.site.defaultCurrency || 'CNY');
    if (pricingResult.status === 'fulfilled') setPricingPolicy(pricingResult.value.mode);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const data = useMemo(() => items.filter(item => (level === 'all' || item.level === level) && `${item.name}${item.company}${item.phone}${item.email}`.toLowerCase().includes(keyword.toLowerCase())), [items, keyword, level]);
  const openEditor = (item: Customer | null) => { setEditing(item); form.setFieldsValue(item || emptyCustomer); };
  const saveCustomer = async () => {
    const values = await form.validateFields();
    try {
      const payload = { ...emptyCustomer, ...values };
      editing ? await customerApi.update(editing.id, payload) : await customerApi.create(payload);
      message.success(editing ? '客户已更新' : '客户已新增'); setEditing(undefined); await load();
    } catch { message.error('客户保存失败'); }
  };
  const removeCustomer = (item: Customer) => Modal.confirm({ title: '删除客户', content: `确定删除 ${item.name}（${item.company}）吗？`, okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await customerApi.remove(item.id); message.success('客户已删除'); await load(); } });
  const openLevelEditor = (item: CustomerLevel | null) => { setEditingLevel(item); levelForm.setFieldsValue(item || { name: '', note: '' }); };
  const saveLevel = async () => {
    const values = await levelForm.validateFields();
    try {
      editingLevel ? await customerApi.updateLevel(editingLevel.id, values) : await customerApi.createLevel(values);
      message.success(editingLevel ? '客户等级已更新' : '客户等级已新增'); setEditingLevel(undefined); await load();
    } catch { message.error('客户等级保存失败'); }
  };
  const removeLevel = (item: CustomerLevel) => Modal.confirm({ title: '删除客户等级', content: `删除“${item.name}”后，使用该等级的客户将变为未分级。`, okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await customerApi.removeLevel(item.id); setLevel('all'); message.success('客户等级已删除'); await load(); } });
  const changePricingPolicy = async (mode: GuestPricingPolicy['mode']) => {
    const previous = pricingPolicy;
    setPricingPolicy(mode);
    try { await customerApi.updatePricingPolicy(mode); message.success('游客价格策略已更新，重新发布站点后生效'); }
    catch { setPricingPolicy(previous); message.error('游客价格策略更新失败'); }
  };

  const columns: ColumnsType<Customer> = [
    { title: '客户账号', render: (_, row) => <div><div className="flex items-center gap-2"><b>{row.name}</b><Tag color={row.status === 'active' ? 'green' : 'default'}>{row.status === 'active' ? '可登录' : '已停用'}</Tag></div><div className="text-xs text-muted-foreground">{row.phone} · {row.company || '未填写企业'}</div></div> },
    { title: '国家', dataIndex: 'country', width: 90 },
    { title: '等级', dataIndex: 'level', width: 130, render: value => value ? <Tag color="blue">{levels.find(item => item.code === value)?.name || '未分级'}</Tag> : <span className="text-muted-foreground">未分级</span> },
    { title: '成交订单', dataIndex: 'orders', width: 100, render: value => `${value} 单` },
    { title: `累计成交额（${currency}）`, dataIndex: 'totalAmount', width: 150, render: value => <b>{Number(value).toLocaleString()}</b> },
    { title: '最近成交', dataIndex: 'lastOrderAt', width: 110, render: value => value || '—' },
    { title: '操作', width: 100, render: (_, row) => <div className="flex gap-1"><button onClick={() => openEditor(row)} title="编辑" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><Edit3 size={14} /></button><button onClick={() => removeCustomer(row)} title="删除" className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button></div> },
  ];

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-foreground">客户与价格等级</h1><p className="mt-0.5 text-sm text-muted-foreground">手机号唯一识别客户，登录后自动匹配其等级商品价</p></div>
      <button onClick={() => openEditor(null)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"><Plus className="h-4 w-4" />新增客户</button>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-foreground"><UserCheck className="h-4 w-4 text-primary" />1. 手机号识别客户</div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">同一站点手机号不可重复，前台输入手机号即可匹配客户。</p></div>
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-foreground"><Tags className="h-4 w-4 text-primary" />2. 匹配客户等级</div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">商品可为每个等级设置专属价；未设置时回退基础价。</p></div>
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-foreground">{pricingPolicy === 'hidden' ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}3. 游客价格策略</div><div className="mt-2 flex rounded-lg bg-white p-1 shadow-sm">{([{ value: 'base', label: '显示基础价' }, { value: 'hidden', label: '不显示价格' }] as const).map(option => <button key={option.value} onClick={() => void changePricingPolicy(option.value)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${pricingPolicy === option.value ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'}`}>{option.label}</button>)}</div></div>
    </div>

    <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 items-stretch gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="backdrop-blur-xl h-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4"><div><h2 className="text-sm font-bold text-foreground">客户等级</h2><p className="mt-0.5 text-xs text-muted-foreground">{levels.length} 个等级</p></div><button onClick={() => openLevelEditor(null)} title="新增客户等级" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Plus className="h-4 w-4" /></button></div>
        <div className="space-y-2 p-3"><button onClick={() => setLevel('all')} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors ${level === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}><span className="text-sm font-semibold">全部客户</span><span className="text-xs">{items.length}</span></button>{levels.length === 0 ? <div className="flex min-h-32 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无客户等级" /></div> : levels.map(item => <div key={item.id} onClick={() => setLevel(item.code)} className={`group cursor-pointer rounded-xl border p-3 transition-colors ${level === item.code ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-border hover:bg-secondary/30'}`}><div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-foreground">{item.name}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{item.note || '暂无备注'}</div></div><span className="text-xs text-muted-foreground">{items.filter(customer => customer.level === item.code).length}</span></div><div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={event => { event.stopPropagation(); openLevelEditor(item); }} title="编辑" className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit3 size={13} /></button><button onClick={event => { event.stopPropagation(); removeLevel(item); }} title="删除" className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button></div></div>)}</div>
      </aside>

      <section className="backdrop-blur-xl min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4"><div className="max-w-xs flex-1"><Input value={keyword} onChange={event => setKeyword(event.target.value)} prefix={<Search className="h-4 w-4 text-muted-foreground" />} placeholder="搜索手机号、客户、企业或邮箱..." variant="filled" size="middle" /></div><Select value={level} onChange={setLevel} style={{ width: 140 }} variant="filled" size="middle" options={[{ value: 'all', label: '全部等级' }, ...levels.map(item => ({ value: item.code, label: item.name }))]} /><span className="ml-auto text-xs text-muted-foreground">共 {data.length} 条</span></div>
        <Table loading={loading} rowKey="id" dataSource={data} columns={columns} scroll={{ x: 920 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关数据" /> }} />
      </section>
    </div>
    <Modal open={editing !== undefined} title={editing ? '编辑客户' : '新增客户'} onCancel={() => setEditing(undefined)} onOk={saveCustomer} okText="保存" cancelText="取消" width={620}><Form form={form} layout="vertical" className="pt-3"><div className="mb-4 rounded-xl bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">手机号是独立站客户的唯一关联标识。前台输入手机号后，系统会自动匹配该客户的价格等级，无需维护密码。</div><div className="grid grid-cols-2 gap-x-3"><Form.Item name="phone" label="客户手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^\+?[0-9\s()-]{6,24}$/, message: '请输入有效手机号' }]}><Input prefix={<KeyRound className="h-4 w-4 text-muted-foreground" />} placeholder="+86 138 0000 0000" /></Form.Item><Form.Item name="level" label="客户价格等级"><Select allowClear placeholder="未分级则展示基础价" options={levels.map(item => ({ value: item.code, label: item.name }))} /></Form.Item><Form.Item name="name" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}><Input /></Form.Item><Form.Item name="company" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}><Input /></Form.Item><Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}><Input /></Form.Item><Form.Item name="country" label="国家/地区"><Input /></Form.Item><Form.Item name="status" label="关联状态"><Select options={[{ value: 'active', label: '正常，可关联' }, { value: 'disabled', label: '停用，不匹配' }]} /></Form.Item><Form.Item name="orders" label="成交订单"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="totalAmount" label={`累计成交额（${currency}）`}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item><Form.Item name="lastOrderAt" label="最近成交日期"><DateField /></Form.Item></div><Form.Item name="notes" label="客户备注"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
    <Modal open={editingLevel !== undefined} title={editingLevel ? '编辑客户等级' : '新增客户等级'} onCancel={() => setEditingLevel(undefined)} onOk={saveLevel} okText="保存" cancelText="取消"><Form form={levelForm} layout="vertical" className="pt-3"><Form.Item name="name" label="等级名称" rules={[{ required: true, message: '请输入等级名称' }]}><Input maxLength={50} placeholder="请输入等级名称" /></Form.Item><Form.Item name="note" label="备注"><Input.TextArea maxLength={500} rows={4} placeholder="请输入备注" /></Form.Item></Form></Modal>
  </div>;
};

export default CustomerLevelsPage;
