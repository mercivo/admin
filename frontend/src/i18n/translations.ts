export type Locale = 'zh-CN' | 'en-US';

export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const LOCALE_STORAGE_KEY = 'mercivo_locale';

export function getStoredLocale(): Locale {
  return DEFAULT_LOCALE;
}

// Chinese is the product source language. Keep active English UI translations here.
export const enUS: Record<string, string> = {
  '迈犀沃': 'MERCIVO',
  '外贸 ERP 与独立站平台': 'Global Trade ERP & Storefront Platform',
  '经营管理': 'Business', '平台管理': 'Platform', '工作台': 'Workspace', '仪表盘': 'Dashboard', '经营概览': 'Business Overview',
  'ERP 管理': 'ERP Management', '独立站': 'Storefront', '系统管理': 'System',
  '商品管理': 'Products', '商品分类': 'Product Categories', '客户等级': 'Customer Tiers', '客户管理': 'Customers', '站点设计': 'Site Design', '账号设置': 'Account Settings', '团队管理': 'Team',
  '产品详情': 'Product Details', '设置': 'Settings', '查看前台': 'View Storefront', '退出登录': 'Sign Out',
  '搜索商品、客户...': 'Search products and customers...', '搜索平台功能、商户...': 'Search platform features and merchants...', '搜索商户名称或标识': 'Search merchant name or slug',
  '通知中心': 'Notifications', '全部标记已读': 'Mark all as read', '中文': 'Chinese', '英文': 'English',
  '系统管理员': 'System Administrator', '商户管理员': 'Merchant Administrator', '管理员账号': 'Administrator account',
  '欢迎回来': 'Welcome back', '创建商户账号': 'Create merchant account', '登录迈犀沃，继续管理外贸业务全流程': 'Sign in to manage your global trade business', '填写信息，即刻开启 14 天免费试用': 'Start your 14-day free trial',
  '登录': 'Sign In', '注册': 'Register', '手机号 / 系统管理员账号': 'Phone / system administrator account', '密码': 'Password', '请输入手机号或管理员账号': 'Enter phone number or system administrator account', '请输入登录密码': 'Enter password', '安全登录': 'Secure Sign In', '系统管理员可使用专属账号登录': 'System administrators can use their dedicated account',
  '企业/店铺名称': 'Company / store name', '请输入商户名称': 'Enter merchant name', '手机号': 'Phone number', '用于登录和接收业务通知': 'Used for sign-in and business notifications', '登录密码': 'Password', '确认密码': 'Confirm password', '再次输入': 'Enter again',
  '图形验证码': 'Captcha', '验证码': 'Captcha code', '点击刷新验证码': 'Click to refresh captcha', '注册并创建商户': 'Register and Create Merchant', '注册即表示同意服务条款与隐私政策': 'By registering, you agree to the Terms and Privacy Policy', '注册成功': 'Registration successful',
  '刷新': 'Refresh', '搜索': 'Search', '新建': 'Create', '编辑': 'Edit', '删除': 'Delete', '保存': 'Save', '取消': 'Cancel', '确定': 'Confirm', '提交': 'Submit', '关闭': 'Close', '返回': 'Back', '查看全部': 'View All', '操作': 'Actions', '详情': 'Details', '导出': 'Export', '上传': 'Upload',
  '全部状态': 'All Statuses', '已发布': 'Published', '草稿': 'Draft', '保存中...': 'Saving...', '加载中…': 'Loading…',
  '商品': 'Products', '成员': 'Users', '站点': 'Sites', '客户': 'Customers', '邮箱': 'Email', '国家/地区': 'Country / Region', '来源': 'Source', '时间': 'Time', '名称': 'Name', '备注': 'Notes',
};

export const dynamicEnUS: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^(\d+) 家正常运营$/, count => `${count} active`],
  [/^共 (\d+) 家商户$/, count => `${count} merchants`],
  [/^(\d+)家商户$/, count => `${count} merchants`],
  [/^(\d+)站点$/, count => `${count} sites`],
  [/^(\d+)商品$/, count => `${count} products`],
  [/^(\d+)成员$/, count => `${count} users`],
  [/^共 (\d+) 件商品 · (\d+) 件已发布$/, (all, published) => `${all} products · ${published} published`],
];
