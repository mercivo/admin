import React, { useEffect, useRef, useState } from 'react';
import { Empty, Form, Input, InputNumber, Select, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit3, KeyRound, Plus, Search, Trash2, Users } from 'lucide-react';
import { customerApi } from '../../services/api/index';
import type { Customer, CustomerLevel } from '../../services/api/index';
import { AppModal, AppTable, createActionColumn, modalFormClassName, ModalFormGrid, PageContent, PageHeader, TableActionButton, TableActions } from '../../components/shared';
import { can } from '../../utils/permissions';
import { useTablePagination } from '../../hooks/useTablePagination';

const emptyCustomer = { name: '', phone: '', email: '', country: '', level: undefined, status: 'active' as const, notes: '' };

const CustomerLevelsPage: React.FC = () => {
  const canCreateCustomer = can('customer.create');
  const canEditCustomer = can('customer.edit');
  const canDeleteCustomer = can('customer.delete');
  const canManageLevels = can('customer.level.manage');
  const [items, setItems] = useState<Customer[]>([]);
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({});
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState('all');
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [editingLevel, setEditingLevel] = useState<CustomerLevel | null | undefined>(undefined);
  const [form] = Form.useForm();
  const [levelForm] = Form.useForm();
  const pagination = useTablePagination();
  const previousKeyword = useRef(keyword);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await customerApi.list({ page: pagination.current, pageSize: pagination.pageSize, keyword: keyword || undefined, level: level === 'all' ? undefined : level });
      setItems(result.items); setLevelCounts(result.summary.levelCounts); setTotalCustomers(result.summary.totalCustomers); pagination.reconcile(result.total);
    } catch { message.error('客户列表加载失败'); }
    setLoading(false);
  };
  const loadSettings = async () => {
    setLevels(await customerApi.levels());
  };
  useEffect(() => { void loadSettings().catch(() => message.error('客户设置加载失败')); }, []);
  useEffect(() => {
    const delay = previousKeyword.current === keyword ? 0 : 250;
    previousKeyword.current = keyword;
    if (!delay) { void loadCustomers(); return; }
    const timer = window.setTimeout(() => void loadCustomers(), delay);
    return () => window.clearTimeout(timer);
  }, [pagination.current, pagination.pageSize, keyword, level]);
  useEffect(() => { pagination.reset(); }, [keyword, level]);
  const openEditor = (item: Customer | null) => {
    setEditing(item);
    form.setFieldsValue(item ? { name: item.name, email: item.email, phone: item.phone || '', level: item.level || undefined, country: item.country, status: item.status, notes: item.notes || '' } : emptyCustomer);
  };
  const saveCustomer = async () => {
    const values = await form.validateFields();
    try {
      const payload = {
        name: String(values.name || '').trim(),
        email: String(values.email || '').trim(),
        phone: String(values.phone || '').trim() || null,
        level: String(values.level || ''),
        country: String(values.country || '').trim(),
        status: values.status || 'active',
        notes: String(values.notes || '').trim(),
      };
      editing ? await customerApi.update(editing.id, payload) : await customerApi.create(payload);
      message.success(editing ? '客户已更新' : '客户已新增'); setEditing(undefined); await loadCustomers();
    } catch { message.error('客户保存失败'); }
  };
  const removeCustomer = (item: Customer) => AppModal.confirm({ title: '删除客户', content: `确定删除客户“${item.name}”吗？`, okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await customerApi.remove(item.id); message.success('客户已删除'); await loadCustomers(); } });
  const openLevelEditor = (item: CustomerLevel | null) => { setEditingLevel(item); levelForm.setFieldsValue(item ? { ...item, discountRate: item.discountRate == null ? null : Number(item.discountRate) } : { name: '', discountRate: null, note: '' }); };
  const saveLevel = async () => {
    const values = await levelForm.validateFields();
    try {
      const payload = { ...values, discountRate: values.discountRate == null ? null : Number(values.discountRate) };
      editingLevel ? await customerApi.updateLevel(editingLevel.id, payload) : await customerApi.createLevel(payload);
      message.success(editingLevel ? '客户等级已更新' : '客户等级已新增'); setEditingLevel(undefined); await Promise.all([loadSettings(), loadCustomers()]);
    } catch { message.error('客户等级保存失败'); }
  };
  const removeLevel = (item: CustomerLevel) => AppModal.confirm({ title: '删除客户等级', content: `删除“${item.name}”后，使用该等级的客户将变为未分级。`, okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await customerApi.removeLevel(item.id); setLevel('all'); message.success('客户等级已删除'); await Promise.all([loadSettings(), loadCustomers()]); } });
  const renderDiscountPolicy = (levelCode: string) => {
    const discountRate = levels.find(item => item.code === levelCode)?.discountRate;
    if (discountRate == null) return '-';
    const percentage = Number(discountRate);
    const discount = Number((percentage / 10).toFixed(2));
    return `${percentage}%（${discount}折）`;
  };

  const columns: ColumnsType<Customer> = [
    { title: '客户名称', dataIndex: 'name' },
    { title: '邮箱', dataIndex: 'email', render: value => value || '-' },
    { title: '手机号', dataIndex: 'phone', render: value => value || '-' },
    { title: '客户等级', dataIndex: 'level', width: 130, render: value => value ? <Tag color="blue">{levels.find(item => item.code === value)?.name || '未分级'}</Tag> : <span className="text-muted-foreground">未分级</span> },
    { title: '折扣政策', dataIndex: 'level', width: 150, render: value => renderDiscountPolicy(value) },
    { title: '国家', dataIndex: 'country', width: 100, render: value => value || '-' },
    { title: '客户状态', dataIndex: 'status', width: 110, render: value => <Tag color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? '启用' : '停用'}</Tag> },
    createActionColumn<Customer>({ actions: 2, render: (_, row) => <TableActions>{canEditCustomer && <TableActionButton onClick={() => openEditor(row)} title="编辑" tone="primary"><Edit3 size={15} /></TableActionButton>}{canDeleteCustomer && <TableActionButton onClick={() => removeCustomer(row)} title="删除" tone="danger"><Trash2 size={15} /></TableActionButton>}</TableActions> }),
  ];

  return <PageContent>
    <PageHeader title="客户管理" description="手机号唯一识别客户，登录后自动匹配其等级商品价" action={canCreateCustomer ? <button onClick={() => openEditor(null)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"><Plus className="h-4 w-4" />新增客户</button> : undefined}/>

    <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 items-stretch gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="backdrop-blur-xl h-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4"><div><h2 className="text-sm font-bold text-foreground">客户等级</h2><p className="mt-0.5 text-xs text-muted-foreground">{levels.length} 个等级</p></div>{canManageLevels && <button onClick={() => openLevelEditor(null)} title="新增客户等级" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Plus className="h-4 w-4" /></button>}</div>
        <div className="space-y-2 p-3"><button onClick={() => setLevel('all')} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors ${level === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}><span className="text-sm font-normal">全部客户</span><span className="text-xs">{totalCustomers}</span></button>{levels.length === 0 ? <div className="flex min-h-32 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无客户等级" /></div> : levels.map(item => <div key={item.id} onClick={() => setLevel(item.code)} className={`group cursor-pointer rounded-xl border p-3 transition-colors ${level === item.code ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-border hover:bg-secondary/30'}`}><div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div data-testid="customer-level-name" className="truncate text-sm font-normal text-foreground">{item.name}</div><span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{levelCounts[item.code] || 0}</span></div><div className="mt-0.5 truncate text-xs text-muted-foreground">{item.discountRate == null ? '无折扣规则' : `${Number(item.discountRate)}% 参考价`}{item.note ? ` · ${item.note}` : ''}</div></div></div>{canManageLevels && <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={event => { event.stopPropagation(); openLevelEditor(item); }} title="编辑" className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit3 size={13} /></button><button onClick={event => { event.stopPropagation(); removeLevel(item); }} title="删除" className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button></div>}</div>)}</div>
      </aside>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4"><div className="max-w-xs flex-1"><Input value={keyword} onChange={event => setKeyword(event.target.value)} prefix={<Search className="h-4 w-4 text-muted-foreground" />} placeholder="搜索客户名称、手机号或邮箱..." variant="filled" size="middle" /></div><Select value={level} onChange={setLevel} style={{ width: 140 }} variant="filled" size="middle" options={[{ value: 'all', label: '全部等级' }, ...levels.map(item => ({ value: item.code, label: item.name }))]} /><span className="ml-auto text-xs text-muted-foreground">共 {pagination.total} 条</span></div>
        <AppTable loading={loading} rowKey="id" dataSource={items} columns={columns} scroll={{ x: 1070 }} pagination={pagination.config} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关数据" /> }} />
      </section>
    </div>
    <AppModal open={editing !== undefined} title={editing ? '编辑客户' : '新增客户'} onCancel={() => setEditing(undefined)} onOk={saveCustomer} okText="保存" cancelText="取消" width={620}><Form form={form} layout="vertical" className={modalFormClassName}><ModalFormGrid><Form.Item name="name" label="客户名称" rules={[{ required: true, whitespace: true, message: '请输入客户名称' }]}><Input placeholder="客户名称" variant="filled" size="middle" /></Form.Item><Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}><Input placeholder="邮箱" variant="filled" size="middle" /></Form.Item><Form.Item name="phone" label="手机号" rules={[{ pattern: /^\+?[0-9\s()-]{6,24}$/, message: '请输入有效手机号' }]}><Input prefix={<KeyRound className="h-4 w-4 text-muted-foreground" />} placeholder="手机号" variant="filled" size="middle" /></Form.Item><Form.Item name="level" label="客户等级"><Select allowClear placeholder="客户等级" variant="filled" size="middle" options={levels.map(item => ({ value: item.code, label: item.name }))} /></Form.Item><Form.Item name="country" label="国家"><Input placeholder="国家" variant="filled" size="middle" /></Form.Item><Form.Item name="status" label="客户状态"><Select placeholder="客户状态" variant="filled" size="middle" options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '停用' }]} /></Form.Item></ModalFormGrid><Form.Item name="notes" label="客户备注" className="mb-0"><Input.TextArea rows={3} placeholder="客户备注" variant="filled" /></Form.Item></Form></AppModal>
    <AppModal open={editingLevel !== undefined} centered width={520} title={editingLevel ? '编辑客户等级' : '新增客户等级'} onCancel={() => setEditingLevel(undefined)} onOk={saveLevel} okText="确认" cancelText="取消"><Form form={levelForm} layout="vertical" className={modalFormClassName}><Form.Item name="name" label="等级名称" rules={[{ required: true, whitespace: true, message: '请输入等级名称' }]}><Input maxLength={50} placeholder="等级名称" variant="filled" size="middle" /></Form.Item><Form.Item name="discountRate" label="折扣政策" rules={[{ type: 'number', min: 0.01, message: '请输入大于 0 的百分比' }]}><InputNumber min={0.01} precision={2} addonAfter="%" placeholder="不配置" variant="filled" size="middle" style={{ width: '100%' }} /></Form.Item><Form.Item name="note" label="备注" className="mb-0"><Input.TextArea maxLength={500} rows={3} placeholder="可选备注" variant="filled" /></Form.Item></Form></AppModal>
  </PageContent>;
};

export default CustomerLevelsPage;
