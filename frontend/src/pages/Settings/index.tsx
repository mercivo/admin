import React, { useCallback, useEffect, useState } from 'react';
import { Empty, Input, Select, Table } from 'antd';
import {
  User,
  Globe,
  Users,
  CreditCard,
  Save,
  Trash2,
  Mail,
  Phone,
  AlertCircle,
  Search,
} from 'lucide-react';
import { AdminLoadError, AdminPageSkeleton, AppModal, ModalForm, ModalFormField, ModalFormGrid, PermissionTreePicker, QuotaUsage, Toast } from '../../components/shared';
import { siteApi, workspaceApi } from '../../services/api/index';
import type { PermissionItem, PlanItem, SiteDomain, SubscriptionOrder, TeamMember, WorkspaceSettings } from '../../services/api/index';
import { currentPermissions } from '../../utils/permissions';
import { useSearchParams } from 'react-router-dom';
import { ANTD_LOCALE_OPTIONS, antdLocaleLabel } from '../../config/antdLocales';

const roleMap: Record<string, { label: string; cls: string }> = {
  admin: { label: '管理员', cls: 'bg-red-50 text-red-700 border-red-200' },
  member: { label: '成员', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const DEFAULT_SEO = {
  title: '',
  description: '',
  keywords: '',
};

// ─────────────── Invite Modal ───────────────
const InviteModal: React.FC<{ catalog: PermissionItem[]; onClose: () => void; onInvite: (data: { name: string; email?: string; phone: string; password: string; permissions: string[] }) => void }> = ({ catalog, onClose, onInvite }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  return (
    <AppModal open title="添加团队成员" width={880} onCancel={onClose} onOk={() => onInvite({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim(), password, permissions })} okText="确认添加" cancelText="取消" okButtonProps={{ disabled: !name.trim() || !/^\+?[1-9]\d{7,14}$/.test(phone.trim()) || password.length < 8 }}>
        <ModalForm>
          <ModalFormGrid>
          <ModalFormField label="成员姓名" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="请输入成员姓名" variant="filled" /></ModalFormField>
          <ModalFormField label="邮箱地址（选填）">
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱" prefix={<Mail className="w-4 h-4 text-muted-foreground" />} variant="filled" size="middle" />
          </ModalFormField>
          <ModalFormField label="手机号（登录账号）" required><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" prefix={<Phone className="w-4 h-4 text-muted-foreground" />} variant="filled" /></ModalFormField>
          <ModalFormField label="初始登录密码" required><Input.Password value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 8 位，成员首次登录使用" variant="filled" /></ModalFormField>
          </ModalFormGrid>
          <ModalFormField label="功能权限" composite><PermissionTreePicker catalog={catalog} value={permissions} onChange={setPermissions} title="" /></ModalFormField>
        </ModalForm>
    </AppModal>
  );
};

// ─────────────── Delete Member Modal ───────────────
const DeleteMemberModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <AppModal open title="移除团队成员" width={440} onCancel={onClose} onOk={onConfirm} okText="确认移除" cancelText="取消" okButtonProps={{ danger: true }}>
      <div className="py-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
        <p className="text-sm text-muted-foreground">确定要将 <strong className="text-foreground">{name}</strong> 从团队中移除吗？</p>
      </div>
  </AppModal>
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
  const [workspaceLoad, setWorkspaceLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tabLoad, setTabLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const hasPermission = (permission: string) => effectivePermissions.includes(permission);
  const currentRole = (() => { try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}').role as string; } catch { return ''; } })();
  const canManageMembers = currentRole === 'admin' && hasPermission('settings.team');

  const loadWorkspace = useCallback(() => {
    setWorkspaceLoad('loading');
    workspaceApi.getSettings().then(currentWorkspace => {
      setWorkspace(currentWorkspace);
      setEffectivePermissions(currentPermissions());
      setWorkspaceLoad('ready');
    }).catch(() => { setWorkspaceLoad('error'); setToast({ message: '设置数据加载失败', type: 'error' }); });
  }, []);
  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    setTabLoad('loading');
    if (activeTab === 'team') {
      void workspaceApi.listTeam().then(value => { setMembers(value); setTabLoad('ready'); }).catch(() => { setTabLoad('error'); setToast({ message: '成员列表加载失败', type: 'error' }); });
    } else if (activeTab === 'billing') {
      void Promise.all([workspaceApi.listPlans(), workspaceApi.listSubscriptionOrders()])
        .then(([planItems, orderItems]) => { setPlans(planItems); setOrders(orderItems); setTabLoad('ready'); })
        .catch(() => { setTabLoad('error'); setToast({ message: '套餐账单加载失败', type: 'error' }); });
    } else if (activeTab === 'seo') {
      void workspaceApi.getConfig<Partial<typeof DEFAULT_SEO>>('seo').then(seo => { setSeoConfig({ ...DEFAULT_SEO, ...seo }); setTabLoad('ready'); }).catch(() => setTabLoad('error'));
    } else setTabLoad('ready');
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'site' && workspace && hasPermission('site.domain')) {
      setTabLoad('loading');
      void siteApi.domains(workspace.site.id).then(value => { setDomains(value); setTabLoad('ready'); }).catch(() => { setTabLoad('error'); setToast({ message: '域名列表加载失败', type: 'error' }); });
    }
  }, [activeTab, workspace?.site.id]);

  const ensurePermissionCatalog = async () => {
    if (permissionCatalog.length) return permissionCatalog;
    const items = await workspaceApi.teamPermissions();
    setPermissionCatalog(items);
    return items;
  };
  const openInvite = async () => {
    try { await ensurePermissionCatalog(); setShowInvite(true); }
    catch { setToast({ message: '权限选项加载失败', type: 'error' }); }
  };
  const openMemberPermissions = async (member: TeamMember) => {
    try { await ensurePermissionCatalog(); setEditingMember({ ...member, permissions: [...(member.permissions || [])] }); }
    catch { setToast({ message: '权限选项加载失败', type: 'error' }); }
  };

  const saveAccount = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await workspaceApi.updateAccount(workspace.account);
      setWorkspace(updated);
      const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
      localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, name: updated.account.enterpriseName }));
      if (updated.account.role === 'member') {
        const user = JSON.parse(localStorage.getItem('mercivo_user') || '{}');
        localStorage.setItem('mercivo_user', JSON.stringify({ ...user, name: updated.account.memberName }));
        window.dispatchEvent(new Event('mercivo-user-updated'));
      }
      setToast({ message: '账号信息已保存', type: 'success' });
    } catch { setToast({ message: '账号信息保存失败', type: 'error' }); }
    finally { setSaving(false); }
  };

  const saveSite = async () => { if (!workspace) return; setSaving(true); try { const updates: Promise<unknown>[] = []; if (hasPermission('settings.site')) updates.push(workspaceApi.updateSiteInfo(workspace.site)); if (hasPermission('settings.site')) updates.push(workspaceApi.updateSiteLanguages(workspace.site)); await Promise.all(updates); setToast({ message: '站点设置已保存', type: 'success' }); } catch { setToast({ message: '站点设置保存失败', type: 'error' }); } finally { setSaving(false); } };
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

  const handleInvite = async (data: { name: string; email?: string; phone: string; password: string; permissions: string[] }) => {
    try {
      const newMember = await workspaceApi.createMember(data);
      setMembers(prev => [...prev, newMember]);
      setWorkspace(current => current ? { ...current, billing: { ...current.billing, usage: { ...current.billing.usage, members: current.billing.usage.members + 1 } } } : current);
    } catch { setToast({ message: '添加失败，请检查手机号或邮箱是否已存在', type: 'error' }); return; }
    workspaceApi.getSettings().then(setWorkspace).catch(() => undefined);
    setShowInvite(false);
    setToast({ message: `成员 ${data.name} 已添加`, type: 'success' });
  };

  const handleDeleteMember = async () => {
    if (!deleteMember) return;
    try { await workspaceApi.deleteMember(deleteMember.id); }
    catch { setToast({ message: '移除成员失败', type: 'error' }); return; }
    workspaceApi.getSettings().then(setWorkspace).catch(() => undefined);
    setMembers(prev => prev.filter(m => m.id !== deleteMember.id));
    setWorkspace(current => current ? { ...current, billing: { ...current.billing, usage: { ...current.billing.usage, members: Math.max(0, current.billing.usage.members - 1) } } } : current);
    setToast({ message: `已移除 "${deleteMember.name}"`, type: 'success' });
    setDeleteMember(null);
  };

  const subscribe = (plan: PlanItem) => AppModal.confirm({
    title: `${plan.name}暂不支持在线订购`,
    content: '当前尚未接入在线支付体系，如需开通或变更套餐，请联系系统管理员。',
    okText: '我知道了',
    cancelButtonProps: { style: { display: 'none' } },
  });

  const tabs: Array<{ id: string; label: string; icon: React.ElementType; permission?: string }> = [
    { id: 'account', label: '账号信息', icon: User },
    { id: 'site', label: '基础设置', icon: Globe, permission: 'page.site.settings' },
    { id: 'seo', label: 'SEO 优化', icon: Search, permission: 'page.site.settings' },
    { id: 'team', label: '成员与权限', icon: Users, permission: 'page.settings.team' },
    { id: 'billing', label: '套餐账单', icon: CreditCard },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));
  const sectionTabs = activeTab === 'site' || activeTab === 'seo'
    ? tabs.filter(tab => tab.id === 'site' || tab.id === 'seo')
    : tabs.filter(tab => tab.id === activeTab);
  const pageMeta: Record<string, { title: string; description: string }> = {
    account: { title: '账号信息', description: '维护商户主体与当前账号信息' },
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

      {workspaceLoad === 'loading' ? <AdminPageSkeleton variant="settings"/> : workspaceLoad === 'error' ? <AdminLoadError title="设置数据加载失败" onRetry={loadWorkspace}/> : tabLoad === 'loading' ? <AdminPageSkeleton variant="settings"/> : tabLoad === 'error' ? <AdminLoadError title={`${pageMeta[activeTab]?.title || '设置'}加载失败`} onRetry={() => { setTabLoad('idle'); setActiveTab(''); window.setTimeout(() => setActiveTab(requestedTab || 'account'), 0); }}/> : <>
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/60 shadow-sm p-6">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{(workspace?.account.role === 'member' ? workspace.account.memberName : workspace?.account.enterpriseName)?.slice(-2) || '-'}</div>
              <div>
                <h3 className="font-bold text-foreground">{(workspace?.account.role === 'member' ? workspace.account.memberName : workspace?.account.enterpriseName) || '加载中...'}</h3>
                <p className="text-sm text-muted-foreground">{workspace?.account.phone || '-'}</p>
                <p className="text-xs text-muted-foreground mt-1">{workspace?.account.role === 'member' ? '成员' : '管理员'} · 加入于 {workspace?.account.joinedAt ? new Date(workspace.account.joinedAt).toLocaleDateString() : '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {workspace?.account.role === 'member' && <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">成员姓名</label><Input value={workspace.account.memberName || ''} onChange={e => setWorkspace({ ...workspace, account: { ...workspace.account, memberName: e.target.value } })} variant="filled" size="middle" /></div>}
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">企业名称</label><Input disabled={workspace?.account.role === 'member'} value={workspace?.account.enterpriseName || ''} onChange={e => workspace && setWorkspace({ ...workspace, account: { ...workspace.account, enterpriseName: e.target.value } })} variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">邮箱</label><Input type="email" value={workspace?.account.email || ''} onChange={e => workspace && setWorkspace({ ...workspace, account: { ...workspace.account, email: e.target.value } })} placeholder="未设置" variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">手机号</label><Input disabled value={workspace?.account.phone || ''} variant="filled" size="middle" /></div>
            </div>
            <button onClick={saveAccount} disabled={saving || !workspace} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-60">
              <Save className="w-4 h-4" />{saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">站点名称</label><Input disabled={!hasPermission('settings.site')} value={workspace?.site.name || ''} onChange={e => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, name: e.target.value } })} variant="filled" size="middle" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">站点描述</label><Input disabled={!hasPermission('settings.site')} value={workspace?.site.description || ''} onChange={e => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, description: e.target.value } })} placeholder="请输入站点描述" variant="filled" size="middle" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">默认语言</label><Select disabled={!hasPermission('settings.site')} showSearch optionFilterProp="label" value={workspace?.site.defaultLanguage} onChange={defaultLanguage => workspace && setWorkspace({ ...workspace, site: { ...workspace.site, defaultLanguage } })} style={{ width: '100%' }} size="middle" variant="filled" options={ANTD_LOCALE_OPTIONS.filter(option => (workspace?.site.supportedLanguages || [workspace?.site.defaultLanguage]).includes(option.value)).map(option => ({ value: option.value, label: antdLocaleLabel(option.value) }))} /></div>
            </div>
            {(hasPermission('settings.site') || hasPermission('settings.site')) && <button onClick={saveSite} disabled={saving || !workspace} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-60"><Save className="w-4 h-4" />{saving ? '保存中...' : '保存修改'}</button>}
            {hasPermission('site.domain') && <div className="border-t border-border pt-6">
              <div className="mb-4"><h3 className="font-bold text-foreground">自定义域名</h3><p className="mt-1 text-xs text-muted-foreground">绑定企业自己的域名。完成 TXT 所有权验证和 CNAME 解析后，系统将自动提供 HTTPS。</p></div>
              <div className="flex max-w-2xl gap-2"><Input value={newDomain} onChange={event => setNewDomain(event.target.value)} onPressEnter={() => void addDomain()} placeholder="例如：www.example.com" variant="filled" /><button disabled={domainSaving || !newDomain.trim()} onClick={() => void addDomain()} className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{domainSaving ? '添加中…' : '添加域名'}</button></div>
              <div className="mt-4 space-y-3">
                {domains.length === 0 && <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center text-sm text-muted-foreground">尚未绑定自定义域名</div>}
                {domains.map(domain => <div key={domain.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><b className="text-sm">{domain.hostname}</b>{domain.isPrimary && <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">主域名</span>}<span className={`rounded px-2 py-0.5 text-[10px] font-bold ${domain.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{domain.status === 'active' ? '已验证' : '待验证'}</span></div><div className="mt-1 text-xs text-muted-foreground">{domain.status === 'active' ? 'DNS 已验证 · HTTPS 将自动签发和续期' : '请先添加以下 DNS 记录，再点击验证'}</div></div><div className="flex gap-2">{domain.status !== 'active' && <button onClick={() => void verifyDomain(domain)} className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5">立即验证</button>}<button onClick={() => AppModal.confirm({ title: '移除该域名？', content: `移除后 ${domain.hostname} 将无法继续访问当前站点。`, okText: '确认移除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { await siteApi.removeDomain(domain.id); setDomains(items => items.filter(item => item.id !== domain.id)); } })} className="rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">移除</button></div></div>
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
            {hasPermission('settings.site') && <button onClick={handleSeoSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"><Save className="h-4 w-4" />{saving ? '保存中...' : '保存 SEO 配置'}</button>}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold text-foreground">团队成员</h3><p className="text-xs text-muted-foreground mt-0.5">成员额度按整个租户计算，包含商户管理员</p></div>
              <div className="flex items-center gap-3">{workspace && <QuotaUsage label="成员配额" used={workspace.billing.usage.members} limit={workspace.billing.limits.members} onExhaustedClick={()=>{setActiveTab('billing');setSearchParams({tab:'billing'});}}/>}<button disabled={!canManageMembers || !workspace || workspace.billing.usage.members >= workspace.billing.limits.members} title={!canManageMembers ? '仅商户管理员可以添加成员' : workspace && workspace.billing.usage.members >= workspace.billing.limits.members ? '成员名额已用完，请升级套餐或联系系统管理员' : ''} onClick={() => void openInvite()} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Mail className="w-4 h-4" />添加成员</button></div>
            </div>
            <div className="space-y-2">
              {members.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无团队成员" className="py-10" />}
              {members.map(m => {
                const r = roleMap[m.role] || roleMap.member;
                return (
                  <div key={m.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-secondary/20 transition-colors">
                    <div data-testid="team-member-avatar" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{m.name.slice(-2) || '-'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{m.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${r.cls}`}>{r.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">手机号 {m.phone || '-'} · 邮箱 {m.email || '-'} · 加入于 {new Date(m.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.role !== 'admin' && canManageMembers && <button onClick={() => void openMemberPermissions(m)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">配置权限</button>}
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
            <div><h3 className="text-lg font-bold text-foreground">当前套餐：{plans.find(item => item.code === workspace?.billing.plan)?.name || workspace?.billing.plan?.toUpperCase() || '-'}</h3><p className="mt-1 text-sm text-muted-foreground">套餐状态：{workspace?.billing.status === 'active' ? '正常' : '已停用'}{workspace?.billing.expiresAt ? ` · 到期时间 ${new Date(workspace.billing.expiresAt).toLocaleDateString()}` : ''}</p></div>
            {workspace && <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><QuotaUsage label="商品配额" used={workspace.billing.usage.products} limit={workspace.billing.limits.products} className="min-w-0"/><QuotaUsage label="成员配额" used={workspace.billing.usage.members} limit={workspace.billing.limits.members} className="min-w-0"/><QuotaUsage label="仓库配额" used={workspace.billing.usage.warehouses} limit={workspace.billing.limits.warehouses} className="min-w-0"/></div>}
            <div><h3 className="mb-3 font-bold text-foreground">可订购套餐</h3><div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{plans.map(plan => <div key={plan.id} className={`rounded-2xl border p-5 ${workspace?.billing.plan === plan.code ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="flex items-start justify-between"><div><div className="font-bold text-foreground">{plan.name}</div><div className="mt-1 text-xs text-muted-foreground">{plan.description || '适用于外贸 ERP 与品牌独立站'}</div></div>{workspace?.billing.plan === plan.code && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">当前</span>}</div><div className="mt-4"><span className="text-2xl font-bold text-foreground">¥{Number(plan.price).toLocaleString()}</span><span className="text-xs text-muted-foreground">/{plan.billingCycle === 'year' ? '年' : '月'}</span></div><div className="mt-4 space-y-1 text-xs text-muted-foreground"><div>{plan.maxProducts} 件商品</div><div>1 个独立站（租户固定）</div><div>{plan.maxMembers} 位团队成员</div><div>{plan.maxWarehouses} 个仓库</div></div><button disabled={workspace?.billing.plan === plan.code} onClick={() => subscribe(plan)} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:bg-secondary disabled:text-muted-foreground">{workspace?.billing.plan === plan.code ? '当前套餐' : '立即订购'}</button></div>)}</div></div>
            <div><h3 className="mb-3 font-bold text-foreground">订购记录</h3><Table size="small" rowKey="id" dataSource={orders} pagination={false} locale={{ emptyText: '暂无订购记录' }} columns={[{ title: '订单号', dataIndex: 'orderNo' }, { title: '套餐', dataIndex: 'planName' }, { title: '金额', render: (_, row) => `¥${Number(row.amount).toLocaleString()}` }, { title: '支付', render: () => '暂不需支付' }, { title: '生效时间', dataIndex: 'effectiveAt', render: value => new Date(value).toLocaleString('zh-CN') }]} /></div>
          </div>
        )}
      </div>
      </>}

      {showInvite && <InviteModal catalog={permissionCatalog} onClose={() => setShowInvite(false)} onInvite={handleInvite} />}
      <AppModal open={!!editingMember} title={`配置成员${editingMember ? ` · ${editingMember.name}` : ''}`} width={880} okText="保存" cancelText="取消" onCancel={() => setEditingMember(null)} onOk={async () => { if (!editingMember) return; try { const updated = await workspaceApi.updateMember(editingMember.id, { name: editingMember.name, email: editingMember.email || '', phone: editingMember.phone || undefined, permissions: editingMember.permissions || [] }); setMembers(items => items.map(item => item.id === updated.id ? updated : item)); setEditingMember(null); setToast({ message: '成员信息与权限已更新', type: 'success' }); } catch { setToast({ message: '成员信息或权限更新失败', type: 'error' }); } }}>{editingMember && <ModalForm><ModalFormGrid><ModalFormField label="成员姓名" required><Input value={editingMember.name} onChange={event => setEditingMember({ ...editingMember, name: event.target.value })}/></ModalFormField><ModalFormField label="手机号（登录账号）" required><Input value={editingMember.phone || ''} onChange={event => setEditingMember({ ...editingMember, phone: event.target.value })}/></ModalFormField><ModalFormField label="邮箱（选填）"><Input value={editingMember.email || ''} onChange={event => setEditingMember({ ...editingMember, email: event.target.value })}/></ModalFormField></ModalFormGrid><ModalFormField label="功能权限" composite><PermissionTreePicker catalog={permissionCatalog} value={editingMember.permissions || []} onChange={permissions => setEditingMember({ ...editingMember, permissions })} title="" /></ModalFormField></ModalForm>}</AppModal>
      {deleteMember && <DeleteMemberModal name={deleteMember.name} onClose={() => setDeleteMember(null)} onConfirm={handleDeleteMember} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default SettingsPage;
