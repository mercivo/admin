export type PermissionLevel = 'primary' | 'secondary' | 'page' | 'button';
export type PermissionType = 'menu' | 'page' | 'button';

export interface PermissionCatalogItem {
  group: string;
  key: string;
  label: string;
  type: PermissionType;
  level: PermissionLevel;
  parentKey: string | null;
}

const primary = (key: string, label: string): PermissionCatalogItem => ({ group: label, key, label, type: 'menu', level: 'primary', parentKey: null });
const secondary = (group: string, key: string, label: string, parentKey: string): PermissionCatalogItem => ({ group, key, label, type: 'menu', level: 'secondary', parentKey });
const page = (group: string, key: string, label: string, parentKey: string): PermissionCatalogItem => ({ group, key, label, type: 'page', level: 'page', parentKey });
const button = (group: string, key: string, label: string, parentKey: string): PermissionCatalogItem => ({ group, key, label, type: 'button', level: 'button', parentKey });

export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  primary('menu.dashboard', '经营概览'),
  page('经营概览', 'page.dashboard', '经营概览页面', 'menu.dashboard'),
  primary('group.products', '商品管理'),
  secondary('商品管理', 'menu.products', '商品列表', 'group.products'),
  page('商品管理', 'page.products', '商品管理页面', 'menu.products'),
  button('商品管理', 'product.create', '新建商品', 'menu.products'),
  button('商品管理', 'product.edit', '编辑商品', 'menu.products'),
  button('商品管理', 'product.delete', '删除商品', 'menu.products'),
  button('商品管理', 'product.publish', '发布商品', 'menu.products'),
  secondary('商品管理', 'menu.product-categories', '商品分类', 'group.products'),
  page('商品分类', 'page.product-categories', '商品分类页面', 'menu.product-categories'),
  button('商品分类', 'product-category.manage', '管理商品分类', 'menu.product-categories'),
  primary('group.sales', '销售管理'),
  secondary('销售管理', 'menu.customers', '客户管理', 'group.sales'),
  page('客户管理', 'page.customers', '客户管理页面', 'menu.customers'),
  button('客户管理', 'customer.create', '新建客户', 'menu.customers'),
  button('客户管理', 'customer.edit', '编辑客户', 'menu.customers'),
  button('客户管理', 'customer.delete', '删除客户', 'menu.customers'),
  button('客户管理', 'customer.level.manage', '管理客户等级', 'menu.customers'),

  primary('group.inventory', '库存管理'),
  secondary('库存管理', 'menu.inventory.stocks', '库存查询', 'group.inventory'),
  page('库存查询', 'page.inventory.stocks', '库存查询页面', 'menu.inventory.stocks'),
  button('库存查询', 'inventory.ledger.view', '查看库存流水', 'menu.inventory.stocks'),
  secondary('库存管理', 'menu.inventory.counts', '库存盘点', 'group.inventory'),
  page('库存盘点', 'page.inventory.counts', '库存盘点页面', 'menu.inventory.counts'),
  button('库存盘点', 'inventory.count.create', '创建和录入盘点', 'menu.inventory.counts'),
  button('库存盘点', 'inventory.count.complete', '开始、完成和取消盘点', 'menu.inventory.counts'),
  secondary('库存管理', 'menu.inventory.transfers', '库存调拨', 'group.inventory'),
  page('库存调拨', 'page.inventory.transfers', '库存调拨页面', 'menu.inventory.transfers'),
  button('库存调拨', 'inventory.transfer.create', '创建并发出调拨', 'menu.inventory.transfers'),
  button('库存调拨', 'inventory.transfer.receive', '调拨收货', 'menu.inventory.transfers'),
  secondary('库存管理', 'menu.inventory.warehouses', '仓库管理', 'group.inventory'),
  page('仓库管理', 'page.inventory.warehouses', '仓库管理页面', 'menu.inventory.warehouses'),
  button('仓库管理', 'inventory.warehouse.manage', '管理仓库', 'menu.inventory.warehouses'),

  primary('group.site', '独立站'),
  secondary('独立站', 'menu.site', '站点设计', 'group.site'),
  page('站点设计', 'page.site.editor', '站点设计页面', 'menu.site'),
  button('站点设计', 'site.edit', '保存站点内容', 'menu.site'),
  button('站点设计', 'site.publish', '发布/回滚站点', 'menu.site'),
  page('站点设计', 'page.site.settings', '基础设置页面', 'menu.site'),
  page('站点设计', 'page.site.seo', 'SEO 设置页面', 'menu.site'),
  button('站点设计', 'settings.site', '编辑基础设置', 'menu.site'),
  button('站点设计', 'settings.seo', '编辑 SEO', 'menu.site'),
  button('站点设计', 'site.domain', '管理自定义域名', 'menu.site'),

  primary('group.system', '系统管理'),
  secondary('系统管理', 'menu.settings', '账号设置', 'group.system'),
  page('账号设置', 'page.settings.account', '账号信息页面', 'menu.settings'),
  button('账号设置', 'settings.account', '编辑账号信息', 'menu.settings'),
  secondary('系统管理', 'menu.team', '成员与权限', 'group.system'),
  page('成员与权限', 'page.settings.team', '成员与权限页面', 'menu.team'),
  button('成员与权限', 'settings.team', '管理成员权限', 'menu.team'),
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
  const known = new Set(ALL_PERMISSIONS);
  return ALL_PERMISSIONS.filter(key => selected.has(key) && known.has(key));
}

const TRIAL_UNAVAILABLE_PERMISSIONS = new Set([
  'site.publish', 'site.domain',
  'inventory.count.create', 'inventory.count.complete',
  'inventory.transfer.create', 'inventory.transfer.receive',
  'inventory.warehouse.manage',
]);
export const TRIAL_PERMISSIONS = ALL_PERMISSIONS.filter(key => !TRIAL_UNAVAILABLE_PERMISSIONS.has(key));
