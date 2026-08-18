export type Locale = 'zh-CN' | 'en-US';

export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const LOCALE_STORAGE_KEY = 'mercivo_locale';

export function getStoredLocale(): Locale {
  return DEFAULT_LOCALE;
}

// Chinese is the product source language. Keep every English UI translation here.
export const enUS: Record<string, string> = {
  '迈犀沃': 'MERCIVO', '外贸一体化智能平台': 'AI-powered global trade platform', 'AI 外贸一体化智能平台': 'AI-powered global trade platform',
  '经营管理': 'Business', '平台管理': 'Platform', '工作台': 'Workspace', '仪表盘': 'Dashboard',
  '外贸 ERP': 'Global Trade ERP', 'CRM 商机': 'CRM Opportunities', '独立站': 'Storefront', 'AI 赋能': 'AI Enablement', '系统管理': 'System',
  '商品管理': 'Products', '客户等级': 'Customer Tiers', '客户管理': 'Customers', '商机获取': 'Opportunities', '开发信': 'Outreach', '客户线索': 'Leads', '站点设计': 'Site Design', '智能体中心': 'AI Agents', '账号设置': 'Account Settings', '字典管理': 'Dictionary',
  '产品详情': 'Product Details', 'AI询盘助手': 'AI Inquiry Assistant', '设置': 'Settings', '查看前台': 'View Storefront', '退出登录': 'Sign Out', '敬请期待': 'Coming Soon',
  '搜索商品、客户、商机、开发信...': 'Search products, customers, opportunities...', '搜索平台功能、商户...': 'Search platform features and merchants...', '搜索商户名称或标识': 'Search merchant name or slug',
  '通知中心': 'Notifications', '全部标记已读': 'Mark all as read', '中文': 'Chinese', '英文': 'English', '系统管理员': 'System Administrator', '商户管理员': 'Merchant Administrator', '管理员账号': 'Administrator account',
  '欢迎回来': 'Welcome back', '创建商户账号': 'Create merchant account', '登录迈犀沃，继续管理外贸业务全流程': 'Sign in to continue managing your global trade workflow', '填写信息，即刻开启 14 天免费试用': 'Start your 14-day free trial',
  '登录': 'Sign In', '注册': 'Register', '手机号 / 系统管理员账号': 'Phone / system administrator account', '密码': 'Password', '请输入手机号或管理员账号': 'Enter phone number or administrator account', '请输入登录密码': 'Enter password', '安全登录': 'Secure Sign In', '系统管理员可使用专属账号登录': 'System administrators can use their dedicated account',
  '企业/店铺名称': 'Company / store name', '请输入商户名称': 'Enter merchant name', '手机号': 'Phone number', '用于登录和接收业务通知': 'Used for sign-in and business notifications', '登录密码': 'Password', '确认密码': 'Confirm password', '再次输入': 'Enter again', '图形验证码': 'Captcha', '验证码': 'Captcha code', '点击刷新验证码': 'Click to refresh captcha', '注册并创建商户': 'Register and Create Merchant', '注册即表示同意服务条款与隐私政策': 'By registering, you agree to the Terms and Privacy Policy', '注册成功': 'Registration successful',
  '让外贸增长，全程在线': 'Grow global trade, end to end', '商户智能增长工作台': 'Intelligent merchant growth workspace', 'AI 智能体': 'AI Agents', '独立站获客': 'Storefront Acquisition',
  '全商户运营概览': 'All-merchant Overview', '监控平台规模、业务使用量和商户运行状态': 'Monitor platform scale, usage, and merchant health', '数据刷新': 'Refresh Data', '刷新数据': 'Refresh Data', '刷新中...': 'Refreshing...',
  '商户总数': 'Total Merchants', '独立站总数': 'Total Sites', '商品总数': 'Total Products', '线索 / 账号': 'Leads / Accounts', '商户创建的全部站点': 'All merchant sites', '平台在管商品数据': 'Products managed on the platform', '累计线索与商户成员': 'Total leads and merchant users',
  '商户业务概览': 'Merchant Business Overview', '按商品与线索规模查看平台使用情况': 'View usage by product and lead volume', '平台运行状态': 'Platform Health', '正常商户': 'Active Merchants', '当前可正常访问': 'Currently accessible', '停用商户': 'Suspended Merchants', '已暂停平台权限': 'Platform access suspended',
  '商户管理': 'Merchant Management', '权限与配额': 'Permissions & Quotas', '商户账号与套餐': 'Merchant Accounts & Plans', '商户权限与配额': 'Merchant Permissions & Quotas', '维护商户状态、套餐和基础使用信息': 'Manage merchant status, plans, and usage', '统一配置商品、智能体、站点配额与功能权限': 'Configure product, agent, site quotas and features',
  '商品总配额': 'Total Product Quota', '智能体总配额': 'Total Agent Quota', '站点总配额': 'Total Site Quota', '全部': 'All', '正常': 'Active', '已停用': 'Suspended', '停用': 'Suspended', '商户信息': 'Merchant', '状态': 'Status', '套餐': 'Plan', '业务使用量': 'Usage', '创建时间': 'Created', '商户': 'Merchant', '商品配额': 'Product Quota', '智能体配额': 'Agent Quota', '站点配额': 'Site Quota', '功能权限': 'Features', 'AI 能力': 'AI Features', '自定义域名': 'Custom Domain',
  '刷新': 'Refresh', '搜索': 'Search', '新建': 'Create', '编辑': 'Edit', '删除': 'Delete', '保存': 'Save', '取消': 'Cancel', '确定': 'Confirm', '提交': 'Submit', '关闭': 'Close', '返回': 'Back', '查看全部': 'View All', '操作': 'Actions', '详情': 'Details', '导出': 'Export', '上传': 'Upload',
  '全部状态': 'All Statuses', '已发布': 'Published', '草稿': 'Draft', '新线索': 'New Lead', '已联系': 'Contacted', '已转化': 'Converted', '运行中': 'Running', '保存中...': 'Saving...', '加载中…': 'Loading…',
  '商品': 'Products', '线索': 'Leads', '成员': 'Users', '站点': 'Sites', '智能体': 'Agents', '客户': 'Customers', '邮箱': 'Email', '国家/地区': 'Country / Region', '意向产品': 'Interested Product', '来源': 'Source', '时间': 'Time', '名称': 'Name', '备注': 'Notes',
};

export const dynamicEnUS: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^(\d+) 家正常运营$/, count => `${count} active`],
  [/^共 (\d+) 家商户$/, count => `${count} merchants`],
  [/^(\d+)家商户$/, count => `${count} merchants`],
  [/^(\d+)站点$/, count => `${count} sites`], [/^(\d+)商品$/, count => `${count} products`], [/^(\d+)线索$/, count => `${count} leads`], [/^(\d+)成员$/, count => `${count} users`],
  [/^共 (\d+) 件商品 · (\d+) 件已发布$/, (all, published) => `${all} products · ${published} published`],
];
