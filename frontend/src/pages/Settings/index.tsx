import React, { useEffect, useState } from 'react';
import { Checkbox, Empty, Input, Modal, Select, Table } from 'antd';
import {
  User,
  Globe,
  Users,
  CreditCard,
  Save,
  Trash2,
  Mail,
  X,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Toast } from '../../components/shared';
import { siteApi, workspaceApi } from '../../services/api/index';
import type { PermissionItem, PlanItem, SiteDomain, SubscriptionOrder, TeamMember, WorkspaceSettings } from '../../services/api/index';
import { currentPermissions } from '../../utils/permissions';
import { useSearchParams } from 'react-router-dom';

const roleMap: Record<string, { label: string; cls: string }> = {
  admin: { label: '管理员', cls: 'bg-red-50 text-red-700 border-red-200' },
  editor: { label: '编辑者', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewer: { label: '观察者', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const DEFAULT_SEO = {
  title: '',
  description: '',
  keywords: '',
};

// ─────────────── Invite Modal ───────────────
const PermissionPicker: React.FC<{ catalog: PermissionItem[]; value: string[]; onChange: (value: string[]) => void }> = ({ catalog, value, onChange }) => {
  const toggle = (key: string, checked: boolean) => {
    const selected = new Set(value);
    const descendants = (parentKey: string): string[] => catalog.filter(item => item.parentKey === parentKey).flatMap(item => [item.key, ...descendants(item.key)]);
    if (checked) {
      selected.add(key);
      let current = catalog.find(item => item.key === key);
      while (current?.parentKey) { selected.add(current.parentKey); current = catalog.find(item => item.key === current?.parentKey); }
    } else {
      selected.delete(key);
      descendants(key).forEach(item => selected.delete(item));
    }
    onChange([...selected]);
  };
  const allSelected = catalog.length > 0 && catalog.every(item => value.includes(item.key));
  return <div>
    <div className="mb-3 flex items-center justify-between">
      <div><b className="text-sm">一级菜单 / 二级菜单 / 内部按钮</b><span className="ml-2 text-xs text-muted-foreground">已选 {value.length} 项</span></div>
      <button type="button" onClick={() => onChange(allSelected ? [] : catalog.map(item => item.key))} className="text-xs text-primary">{allSelected ? '取消全选' : '全选'}</button>
    </div>
    <div className="max-h-96 space-y-3 overflow-auto rounded-xl border border-border bg-secondary/20 p-4">
      {catalog.filter(item => item.level === 'primary').map(primary => (
        <div key={primary.key} className="rounded-xl border border-border bg-white p-4">
          <Checkbox checked={value.includes(primary.key)} onChange={event => toggle(primary.key, event.target.checked)}>
            <b className="text-sm">{primary.label}</b><span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">一级菜单</span>
          </Checkbox>
          <div className="mt-3 space-y-3 border-l-2 border-primary/10 pl-5">
            {catalog.filter(item => item.level === 'secondary' && item.parentKey === primary.key).map(secondary => (
              <div key={secondary.key}>
                <Checkbox checked={value.includes(secondary.key)} onChange={event => toggle(secondary.key, event.target.checked)}>
                  <span className="text-sm font-semibold">{secondary.label}</span><span className="ml-2 text-[10px] text-muted-foreground">二级菜单</span>
                </Checkbox>
                <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
                  {catalog.filter(item => item.level === 'button' && item.parentKey === secondary.key).map(button => (
                    <Checkbox key={button.key} checked={value.includes(button.key)} onChange={event => toggle(button.key, event.target.checked)}><span className="text-xs">{button.label}</span></Checkbox>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>;
};

const InviteModal: React.FC<{ catalog: PermissionItem[]; onClose: () => void; onInvite: (data: { name: string; email: string; password: string; role: string; permissions: string[] }) => void }> = ({ catalog, onClose, onInvite }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('editor');
  const [permissions, setPermissions] = useState<string[]>([]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[880px] mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">添加团队成员</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">成员姓名</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="请输入成员姓名" variant="filled" /></div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">邮箱地址</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱..." prefix={<Mail className="w-4 h-4 text-muted-foreground" />} variant="filled" size="middle" />
          </div>
          <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">初始登录密码</label><Input.Password value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 6 位，成员首次登录使用" variant="filled" /></div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">角色</label>
            <div className="grid grid-cols-3 gap-2">
              {['editor', 'viewer'].map(r => (
                <button key={r} onClick={() => setRole(r)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${role === r ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                  {roleMap[r].label}
                </button>
              ))}
            </div>
          </div>
          <PermissionPicker catalog={catalog} value={permissions} onChange={setPermissions} />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button disabled={!name.trim() || !email.trim() || password.length < 6} onClick={() => onInvite({ name: name.trim(), email: email.trim(), password, role, permissions })} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50">确认添加</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────── Delete Member Modal ───────────────
const DeleteMemberModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
        <h3 className="text-lg font-bold text-foreground mb-2">移除团队成员</h3>
        <p className="text-sm text-muted-foreground">确定要将 <strong className="text-foreground">{name}</strong> 从团队中移除吗？</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认移除</button>
      </div>
    </div>
  </div>
);

const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionItem[]>([]);
  const [seoConfig, setSeoConfig] = useState(DEFAULT_SEO);
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [domains, setDomains] = useState<SiteDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>(currentPermissions);
  const hasPermission = (permission: string) => effectivePermissions.includes(permission);
  const currentRole = (() => { try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}').role as string; } catch { return ''; } })();
  const canManageMembers = currentRole === 'admin' && hasPermission('settings.team');

  useEffect(() => {
    workspaceApi.getSettings().then(async currentWorkspace => {
      const granted = currentWorkspace.billing.permissions || [];
      const allowed = (permission: string) => granted.includes(permission);
      setWorkspace(currentWorkspace);
      setEffectivePermissions(granted);
      const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
      localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, permissions: granted }));
      const [team, permissions, seo, planItems, orderItems, siteDomains] = await Promise.all([
        allowed('menu.team') ? workspaceApi.listTeam() : Promise.resolve([]),
        allowed('menu.team') ? workspaceApi.teamPermissions() : Promise.resolve([]),
        allowed('menu.site.config') ? workspaceApi.getConfig<Partial<typeof DEFAULT_SEO>>('seo').catch(() => DEFAULT_SEO) : Promise.resolve(DEFAULT_SEO),
        workspaceApi.listPlans(),
        workspaceApi.listSubscriptionOrders(),
        allowed('site.domain') ? siteApi.domains(currentWorkspace.site.id) : Promise.resolve([]),
      ]);
      setMembers(team);
      setPermissionCatalog(permissions);
      setDomains(siteDomains);
      setSeoConfig({ ...DEFAULT_SEO, ...seo });
      setPlans(planItems);
      setOrders(orderItems);
    }).catch(() => setToast({ message: '设置数据加载失败', type: 'error' }));
  }, []);

  const saveAccount = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await workspaceApi.updateAccount(workspace.account);
      setWorkspace(updated);
      const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
      localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, name: updated.account.enterpriseName }));
      setToast({ message: '账号信息已保存', type: 'success' });
    } catch { setToast({ message: '账号信息保存失败', type: 'error' }); }
    finally { setSaving(false); }
  };

  const saveSite = async () => { if (!workspace) return; setSaving(true); try { await workspaceApi.updateSite(workspace.site); setToast({ message: '站点设置已保存', type: 'success' }); } catch { setToast({ message: '站点设置保存失败', type: 'error' }); } finally { setSaving(false); } };
  const addDomain = async () => {
    if (!workspace || !newDomain.trim()) return;
    setDomainSaving(true);
    try { const domain = await siteApi.addDomain(workspace.site.id, newDomain.trim()); setDomains(items => [domain, ...items]); setNewDomain(''); setToast({ message: '域名已添加，请按指引完成 DNS 验证', type: 'success' }); }
    catch { setToast({ message: '域名添加失败，请检查格式或域名是否已被绑定', type: 'error' }); }
    finally { setDomainSaving(false); }
  };
  const verifyDomain = async (domain: SiteDomain) => {
    try { await siteApi.verifyDomain(domain.id); setDomains(await siteApi.domains(domain.siteId)); setToast({ message: '域名验证成功，HTTPS 证书将在首次访问时自动签发', type: 'success' }); }
    catch { setToast({ message: '暂未检测到正确的 TXT 验证记录', type: 'error' }); }
  };

  const handleSeoSave = async () => {
    setSaving(true);
    try {
      await workspaceApi.updateConfig('seo', seoConfig);
      setToast({ message: '独立站 SEO 配置已保存，下次发布站点后生效', type: 'success' });
    } catch { setToast({ message: 'SEO 配置保存失败', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleInvite = async (data: { name: string; email: string; password: string; role: string; permissions: string[] }) => {
    try {
      const newMember = await workspaceApi.createMember(data);
      setMembers(prev => [...prev, newMember]);
    } catch { setToast({ message: '邀请失败，请检查邮箱是否已存在', type: 'error' }); return; }
    setShowInvite(false);
    setToast({ message: `成员 ${data.email} 已添加`, type: 'success' });
  };

  const handleDeleteMember = async () => {
    if (!deleteMember) return;
    try { await workspaceApi.deleteMember(deleteMember.id); }
    catch { setToast({ message: '移除成员失败', type: 'error' }); return; }
    setMembers(prev => prev.filter(m => m.id !== deleteMember.id));
    setToast({ message: `已移除 "${deleteMember.name}"`, type: 'success' });
    setDeleteMember(null);
  };

  const subscribe = (plan: PlanItem) => Modal.confirm({
    title: `确认订购${plan.name}`,
    content: `套餐价格 ¥${Number(plan.price).toLocaleString()}/${plan.billingCycle === 'year' ? '年' : '月'}。当前暂不接入支付，确认后将直接生效并生成订购记录。`,
    okText: '确认订购', cancelText: '取消',
    onOk: async () => {
      try {
        const order = await workspaceApi.subscribePlan(plan.id);
        const currentWorkspace = await workspaceApi.getSettings();
        setWorkspace(currentWorkspace); setEffectivePermissions(currentWorkspace.billing.permissions || []); setOrders(items => [order, ...items]);
        const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
        localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, plan: currentWorkspace.billing.plan, permissions: currentWorkspace.billing.permissions }));
        setToast({ message: `${plan.name}已生效`, type: 'success' });
      } catch { setToast({ message: '套餐订购失败', type: 'error' }); }
    },
  });

  const tabs: Array<{ id: string; label: string; icon: React.ElementType; permission?: string }> = [
    { id: 'account', label: '账号信息', icon: User, permission: 'menu.settings' },
    { id: 'site', label: '基础设置', icon: Globe, permission: 'menu.site.config' },
    { id: 'seo', label: 'SEO 优化', icon: Search, permission: 'menu.site.config' },
    { id: 'team', label: '成员与权限', icon: Users, permission: 'menu.team' },
    { id: 'billing', label: '套餐账单', icon: CreditCard },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));
  const sectionTabs = activeTab === 'site' || activeTab === 'seo'
    ? tabs.filter(tab => tab.id === 'site' || tab.id === 'seo')
    : tabs.filter(tab => tab.id === activeTab);
  const pageMeta: Record<string, { title: string; description: string }> = {
    account: { title: '账号设置', description: '维护商户主体与管理员账号信息' },
    site: { title: '站点配置', description: '统一管理独立站基础信息与搜索引擎优化' },
    seo: { title: '站点配置', description: '统一管理独立站基础信息与搜索引擎优化' },
    team: { title: '成员与权限', description: '管理团队成员、角色与功能权限' },
    billing: { title: '套餐账单', description: '查看套餐额度、订购方案与历史记录' },
  };
  const allowedTabIds = tabs.map(tab => tab.id).join(',');
  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) setActiveTab(tabs[0]?.id || '');
  }, [activeTab, allowedTabIds]);
  useEffect(() => {
    if (requestedTab !== activeTab && tabs.some(tab => tab.id === requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab, allowedTabIds]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{pageMeta[activeTab]?.title || '设置'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{pageMeta[activeTab]?.description || '管理商户配置'}</p>
      </div>

      {sectionTabs.length > 1 && <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {sectionTabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSearchParams(t.id === 'account' ? {} : { tab: t.id }); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>}

      <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-6">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{workspace?.account.enterpriseName.slice(0, 2) || '--'}</div>
              <div>
                <h3 className="font-bold text-foreground">{workspace?.account.enterpriseName || '加载中...'}</h3>
                <p className="text-sm text-muted-foreground">{workspace?.account.phone || '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">管理员 · 加入于 {workspace?.account.joinedAt ? new Date(workspace.account.joinedAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">企业名称</label><Input value={workspace?.account.enterpriseName || ''} onChange={e => workspace && setWorkspace({ ...workspace, account: { ...workspace.account, enterpriseName: e.target.value } })} variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">邮箱</label><Input type="email" value={workspace?.account.email || ''} onChange={e => workspace && setWorkspace({ ...workspace, account: { ...workspace.account, email: e.target.value } })} placeholder="未设置" variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">手机号</label><Input value={workspace?.account.phone || ''} onChange={e => workspace && setWorkspace({ ...workspace, account: { ...workspace.account, phone: e.target.value } })} variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">时区</label><Select value="Asia/Shanghai" disabled style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'Asia/Shanghai', label: '北京时间 (UTC+8 / Asia/Shanghai)' }]} /></div>
            </div>
            <button onClick={saveAccount} disabled={saving || !workspace} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-60">
              <Save className="w-4 h-4" />{saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">站点名称</label><Input value={workspace?.site.name || ''} onChange={e => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, name: e.target.value } })} variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">站点描述</label><Input value={workspace?.site.description || ''} onChange={e => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, description: e.target.value } })} placeholder="请输入站点描述" variant="filled" size="middle" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">默认语言</label><Select value={workspace?.site.defaultLanguage} onChange={defaultLanguage => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, defaultLanguage } })} style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }]} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">默认货币</label><Select value={workspace?.site.defaultCurrency} onChange={defaultCurrency => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, defaultCurrency } })} style={{ width: '100%' }} size="middle" variant="filled" options={[{ value: 'CNY', label: '人民币（CNY）' }, { value: 'USD', label: '美元（USD）' }, { value: 'EUR', label: '欧元（EUR）' }]} /></div>
            </div>
            <button onClick={saveSite} disabled={saving || !workspace} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-60"><Save className="w-4 h-4" />{saving ? '保存中...' : '保存修改'}</button>
            {hasPermission('site.domain') && <div className="border-t border-border pt-6">
              <div className="mb-4"><h3 className="font-bold text-foreground">自定义域名</h3><p className="mt-1 text-xs text-muted-foreground">绑定企业自己的域名。完成 TXT 所有权验证和 CNAME 解析后，系统将自动提供 HTTPS。</p></div>
              <div className="flex max-w-2xl gap-2"><Input value={newDomain} onChange={event => setNewDomain(event.target.value)} onPressEnter={() => void addDomain()} placeholder="例如：www.example.com" variant="filled" /><button disabled={domainSaving || !newDomain.trim()} onClick={() => void addDomain()} className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{domainSaving ? '添加中…' : '添加域名'}</button></div>
              <div className="mt-4 space-y-3">
                {domains.length === 0 && <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center text-sm text-muted-foreground">尚未绑定自定义域名</div>}
                {domains.map(domain => <div key={domain.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><b className="text-sm">{domain.hostname}</b>{domain.isPrimary && <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">主域名</span>}<span className={`rounded px-2 py-0.5 text-[10px] font-bold ${domain.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{domain.status === 'active' ? '已验证' : '待验证'}</span></div><div className="mt-1 text-xs text-muted-foreground">{domain.status === 'active' ? 'DNS 已验证 · HTTPS 将自动签发和续期' : '请先添加以下 DNS 记录，再点击验证'}</div></div><div className="flex gap-2">{domain.status !== 'active' && <button onClick={() => void verifyDomain(domain)} className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5">立即验证</button>}<button onClick={() => Modal.confirm({ title: '移除该域名？', content: `移除后 ${domain.hostname} 将无法继续访问当前站点。`, okText: '确认移除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await siteApi.removeDomain(domain.id); setDomains(items => items.filter(item => item.id !== domain.id)); } })} className="rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">移除</button></div></div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">{[domain.status !== 'active' ? domain.verificationRecord : null, domain.routingRecord].filter(Boolean).map(record => <button key={`${record!.type}:${record!.name}`} onClick={() => navigator.clipboard.writeText(`${record!.type} ${record!.name} ${record!.value}`)} className="rounded-lg bg-secondary/50 p-3 text-left hover:bg-secondary"><div className="text-[10px] font-bold uppercase text-muted-foreground">{record!.type} 记录 · 点击复制</div><div className="mt-1 truncate font-mono text-xs">{record!.name}</div><div className="mt-1 truncate font-mono text-xs text-primary">{record!.value}</div></button>)}</div>
                </div>)}
              </div>
            </div>}
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-foreground">独立站搜索引擎优化</h3>
              <p className="mt-1 text-xs text-muted-foreground">设置搜索结果中展示的标题、描述和关键词，留空时使用站点基础信息。</p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">SEO 标题</label><span className="text-xs text-muted-foreground">{seoConfig.title.length}/60</span></div>
                <Input value={seoConfig.title} maxLength={60} onChange={e => setSeoConfig(v => ({ ...v, title: e.target.value }))} placeholder="品牌名｜核心产品与服务" variant="filled" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">SEO 描述</label><span className="text-xs text-muted-foreground">{seoConfig.description.length}/160</span></div>
                <Input.TextArea value={seoConfig.description} maxLength={160} rows={3} onChange={e => setSeoConfig(v => ({ ...v, description: e.target.value }))} placeholder="概括企业优势、主营产品、服务市场与询盘行动引导" variant="filled" />
              </div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">关键词</label><Input value={seoConfig.keywords} onChange={e => setSeoConfig(v => ({ ...v, keywords: e.target.value }))} placeholder="关键词之间用英文逗号分隔" variant="filled" /></div>
            </div>
            <button onClick={handleSeoSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"><Save className="h-4 w-4" />{saving ? '保存中...' : '保存 SEO 配置'}</button>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold text-foreground">团队成员</h3><p className="text-xs text-muted-foreground mt-0.5">已使用 {members.length}/{workspace?.billing.limits.members ?? '—'} 个成员名额，含商户管理员</p></div>
              <button disabled={!canManageMembers || !workspace || members.length >= workspace.billing.limits.members} title={!canManageMembers ? '仅商户管理员可以添加成员' : workspace && members.length >= workspace.billing.limits.members ? '成员名额已用完，请升级套餐或联系系统管理员' : ''} onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><Mail className="w-4 h-4" />添加成员</button>
            </div>
            <div className="space-y-2">
              {members.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无团队成员" className="py-10" />}
              {members.map(m => {
                const r = roleMap[m.role];
                return (
                  <div key={m.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${m.color}`}>{m.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{m.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${r.cls}`}>{r.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.email || m.phone || '未设置联系方式'} · 加入于 {new Date(m.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select size="small" value={m.role} disabled={m.role === 'admin' || !canManageMembers} options={[{ value: 'editor', label: '编辑者' }, { value: 'viewer', label: '观察者' }]} onChange={async role => { try { const updated = await workspaceApi.updateMember(m.id, { role }); setMembers(items => items.map(item => item.id === m.id ? updated : item)); setToast({ message: '成员权限已更新', type: 'success' }); } catch { setToast({ message: '成员权限更新失败', type: 'error' }); } }} />
                      {m.role !== 'admin' && canManageMembers && <button onClick={() => setEditingMember({ ...m, permissions: [...(m.permissions || [])] })} className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">配置权限</button>}
                      {m.role !== 'admin' && canManageMembers && <button onClick={() => setDeleteMember({ id: m.id, name: m.name })} className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div><h3 className="text-lg font-bold text-foreground">当前套餐：{plans.find(item => item.code === workspace?.billing.plan)?.name || workspace?.billing.plan?.toUpperCase() || '—'}</h3><p className="mt-1 text-sm text-muted-foreground">套餐状态：{workspace?.billing.status === 'active' ? '正常' : '已停用'}{workspace?.billing.expiresAt ? ` · 到期时间 ${new Date(workspace.billing.expiresAt).toLocaleDateString()}` : ''}</p></div>
            <div className="grid grid-cols-3 gap-4"><div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">商品配额</div><div className="mt-1 text-2xl font-bold text-foreground">{workspace?.billing.limits.products ?? '—'}</div></div><div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">智能体配额</div><div className="mt-1 text-2xl font-bold text-foreground">{workspace?.billing.limits.agents ?? '—'}</div></div><div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">成员额度</div><div className="mt-1 text-2xl font-bold text-foreground">{workspace?.billing.limits.members ?? '—'}</div></div></div>
            <div><h3 className="mb-3 font-bold text-foreground">可订购套餐</h3><div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{plans.map(plan => <div key={plan.id} className={`rounded-2xl border p-5 ${workspace?.billing.plan === plan.code ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="flex items-start justify-between"><div><div className="font-bold text-foreground">{plan.name}</div><div className="mt-1 text-xs text-muted-foreground">{plan.description || '适用于外贸企业在线获客'}</div></div>{workspace?.billing.plan === plan.code && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">当前</span>}</div><div className="mt-4"><span className="text-2xl font-bold text-foreground">¥{Number(plan.price).toLocaleString()}</span><span className="text-xs text-muted-foreground">/{plan.billingCycle === 'year' ? '年' : '月'}</span></div><div className="mt-4 space-y-1 text-xs text-muted-foreground"><div>{plan.maxProducts} 件商品</div><div>{plan.maxAgents} 个智能体</div><div>{plan.maxMembers} 位团队成员</div></div><button disabled={workspace?.billing.plan === plan.code} onClick={() => subscribe(plan)} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:bg-secondary disabled:text-muted-foreground">{workspace?.billing.plan === plan.code ? '当前套餐' : '立即订购'}</button></div>)}</div></div>
            <div><h3 className="mb-3 font-bold text-foreground">订购记录</h3><Table size="small" rowKey="id" dataSource={orders} pagination={false} locale={{ emptyText: '暂无订购记录' }} columns={[{ title: '订单号', dataIndex: 'orderNo' }, { title: '套餐', dataIndex: 'planName' }, { title: '金额', render: (_, row) => `¥${Number(row.amount).toLocaleString()}` }, { title: '支付', render: () => '暂不需支付' }, { title: '生效时间', dataIndex: 'effectiveAt', render: value => new Date(value).toLocaleString('zh-CN') }]} /></div>
          </div>
        )}
      </div>

      {showInvite && <InviteModal catalog={permissionCatalog} onClose={() => setShowInvite(false)} onInvite={handleInvite} />}
      <Modal open={!!editingMember} title={`配置成员权限${editingMember ? ` · ${editingMember.name}` : ''}`} width={880} okText="保存权限" cancelText="取消" onCancel={() => setEditingMember(null)} onOk={async () => { if (!editingMember) return; try { const updated = await workspaceApi.updateMember(editingMember.id, { permissions: editingMember.permissions || [] }); setMembers(items => items.map(item => item.id === updated.id ? updated : item)); setEditingMember(null); setToast({ message: '成员权限已更新', type: 'success' }); } catch { setToast({ message: '成员权限更新失败', type: 'error' }); } }}>{editingMember && <div className="space-y-3 pt-3"><div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">成员权限不能超出当前商户由套餐或系统管理员授予的权限范围。</div><PermissionPicker catalog={permissionCatalog} value={editingMember.permissions || []} onChange={permissions => setEditingMember({ ...editingMember, permissions })} /></div>}</Modal>
      {deleteMember && <DeleteMemberModal name={deleteMember.name} onClose={() => setDeleteMember(null)} onConfirm={handleDeleteMember} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default SettingsPage;
