const ACTION_CATALOG = [
  { group: '工作台', key: 'menu.dashboard', label: '查看仪表盘', type: 'menu' },
  { group: '外贸ERP', key: 'menu.products', label: '商品管理', type: 'menu' },
  { group: '外贸ERP', key: 'product.create', label: '新建商品', type: 'button' },
  { group: '外贸ERP', key: 'product.edit', label: '编辑商品', type: 'button' },
  { group: '外贸ERP', key: 'product.delete', label: '删除商品', type: 'button' },
  { group: '外贸ERP', key: 'product.publish', label: '发布商品', type: 'button' },
  { group: '外贸ERP', key: 'menu.customers', label: '客户管理', type: 'menu' },
  { group: '外贸ERP', key: 'customer.create', label: '新建客户', type: 'button' },
  { group: '外贸ERP', key: 'customer.edit', label: '编辑客户', type: 'button' },
  { group: '外贸ERP', key: 'customer.delete', label: '删除客户', type: 'button' },
  { group: 'CRM', key: 'menu.opportunities', label: '商机管理', type: 'menu' },
  { group: 'CRM', key: 'opportunity.create', label: '新建商机', type: 'button' },
  { group: 'CRM', key: 'opportunity.edit', label: '编辑商机', type: 'button' },
  { group: 'CRM', key: 'opportunity.delete', label: '删除商机', type: 'button' },
  { group: 'CRM', key: 'menu.outreach', label: '开发信', type: 'menu' },
  { group: 'CRM', key: 'outreach.create', label: '创建开发信任务', type: 'button' },
  { group: 'CRM', key: 'outreach.edit', label: '编辑开发信任务', type: 'button' },
  { group: 'CRM', key: 'outreach.schedule', label: '设置发送计划', type: 'button' },
  { group: 'CRM', key: 'outreach.delete', label: '删除开发信任务', type: 'button' },
  { group: '独立站', key: 'menu.site', label: '站点设计', type: 'menu' },
  { group: '独立站', key: 'site.publish', label: '发布/回滚站点', type: 'button' },
  { group: '独立站', key: 'site.domain', label: '管理自定义域名', type: 'button' },
  { group: '独立站', key: 'menu.leads', label: '客户线索', type: 'menu' },
  { group: '独立站', key: 'lead.assign', label: '分配线索', type: 'button' },
  { group: '独立站', key: 'lead.convert', label: '线索转客户', type: 'button' },
  { group: '独立站', key: 'lead.delete', label: '删除线索', type: 'button' },
  { group: '独立站', key: 'lead.export', label: '导出线索', type: 'button' },
  { group: 'AI赋能', key: 'menu.agents', label: '智能体中心', type: 'menu' },
  { group: 'AI赋能', key: 'agent.create', label: '新建智能体', type: 'button' },
  { group: 'AI赋能', key: 'agent.edit', label: '编辑/启停智能体', type: 'button' },
  { group: 'AI赋能', key: 'agent.delete', label: '删除智能体', type: 'button' },
  { group: 'AI赋能', key: 'agent.knowledge', label: '管理知识库', type: 'button' },
  { group: '系统管理', key: 'menu.settings', label: '账号设置', type: 'menu' },
  { group: '账号设置', key: 'settings.account', label: '账号信息', type: 'button' },
  { group: '独立站', key: 'menu.site.config', label: '站点配置', type: 'menu' },
  { group: '站点配置', key: 'settings.site', label: '编辑基础设置', type: 'button' },
  { group: '站点配置', key: 'settings.seo', label: '编辑 SEO', type: 'button' },
  { group: '系统管理', key: 'menu.team', label: '成员与权限', type: 'menu' },
  { group: '成员与权限', key: 'settings.team', label: '管理成员权限', type: 'button' },
  { group: '系统管理', key: 'menu.dictionary', label: '字典管理', type: 'menu' },
  { group: '系统管理', key: 'dictionary.manage', label: '编辑字典', type: 'button' },
] as const;

const LEVEL_ONE_CATALOG = [
  { group: '工作台', key: 'group.workspace', label: '工作台', type: 'menu', level: 'primary', parentKey: null },
  { group: '外贸ERP', key: 'group.erp', label: '外贸 ERP', type: 'menu', level: 'primary', parentKey: null },
  { group: 'CRM', key: 'group.crm', label: 'CRM 获客', type: 'menu', level: 'primary', parentKey: null },
  { group: '独立站', key: 'group.site', label: '独立站', type: 'menu', level: 'primary', parentKey: null },
  { group: 'AI赋能', key: 'group.ai', label: 'AI 赋能', type: 'menu', level: 'primary', parentKey: null },
  { group: '系统管理', key: 'group.system', label: '系统管理', type: 'menu', level: 'primary', parentKey: null },
] as const;

const MENU_PARENTS: Record<string, string> = {
  'menu.dashboard': 'group.workspace', 'menu.products': 'group.erp', 'menu.customers': 'group.erp',
  'menu.opportunities': 'group.crm', 'menu.outreach': 'group.crm',
  'menu.site': 'group.site', 'menu.leads': 'group.site', 'menu.agents': 'group.ai',
  'menu.site.config': 'group.site',
  'menu.settings': 'group.system', 'menu.team': 'group.system', 'menu.dictionary': 'group.system',
};
const BUTTON_PARENTS: Record<string, string> = {
  product: 'menu.products', customer: 'menu.customers', opportunity: 'menu.opportunities', outreach: 'menu.outreach', site: 'menu.site', lead: 'menu.leads', agent: 'menu.agents',
  settings: 'menu.settings', dictionary: 'menu.dictionary',
};
const CUSTOM_BUTTON_PARENTS: Record<string, string> = {
  'settings.site': 'menu.site.config',
  'settings.seo': 'menu.site.config',
  'settings.team': 'menu.team',
};

export const PERMISSION_CATALOG = [
  ...LEVEL_ONE_CATALOG,
  ...ACTION_CATALOG.map(item => ({
    ...item,
    level: item.type === 'menu' ? 'secondary' as const : 'button' as const,
    parentKey: item.type === 'menu' ? MENU_PARENTS[item.key] : (CUSTOM_BUTTON_PARENTS[item.key] || BUTTON_PARENTS[item.key.split('.')[0]]),
  })),
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map(item => item.key);

export function withPermissionParents(permissions: string[]) {
  const selected = new Set(permissions);
  for (const key of [...selected]) {
    let current = PERMISSION_CATALOG.find(item => item.key === key);
    while (current?.parentKey) {
      selected.add(current.parentKey);
      current = PERMISSION_CATALOG.find(item => item.key === current?.parentKey);
    }
  }
  const known = new Set<string>(ALL_PERMISSIONS);
  return [...selected].filter(key => known.has(key));
}

const TRIAL_UNAVAILABLE_PERMISSIONS = new Set([
  'site.publish', 'site.domain', 'lead.assign', 'lead.convert', 'lead.delete', 'lead.export',
  'agent.create', 'agent.edit', 'agent.delete', 'agent.knowledge',
]);

export const TRIAL_PERMISSIONS = ALL_PERMISSIONS.filter(key => !TRIAL_UNAVAILABLE_PERMISSIONS.has(key));
