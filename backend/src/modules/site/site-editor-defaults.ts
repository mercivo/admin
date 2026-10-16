const section = (page: string, type: string, value: Record<string, unknown> = {}) => ({ id: `${page}-${type}`, type, visible: true, title: type, ...value });
export const DEFAULT_HERO_TRUST_ITEMS = [{ id: 'quality', title: '品质保障', description: '严格质检与稳定品质' }, { id: 'service', title: '专业服务', description: '一对一采购咨询' }, { id: 'customization', title: '灵活定制', description: '支持品牌与包装定制' }, { id: 'reputation', title: '全球口碑', description: '服务海外品牌客户' }];

const page = (pageId: string, middle: Array<Record<string, any>>) => {
  const sections: Array<Record<string, any>> = [
    section(pageId, 'header', { eyebrow: '全球交付 · 品质承诺 · 专业定制', title: '品牌名称' }),
    ...middle,
    section(pageId, 'footer', { title: '企业名称', subtitle: '为全球客户提供高品质产品与专业采购服务。', showSocials: true, showContact: true }),
  ];
  const targets = sections.filter(item => ['products', 'text', 'form'].includes(item.type));
  const navItems = targets.map(item => ({ id: `${pageId}-nav-${item.type}`, label: ({ products: '产品列表', text: '文本内容', form: '询盘表单' } as Record<string, string>)[item.type], targetId: item.id }));
  sections[0].navItems = navItems;
  sections[sections.length - 1].navItems = navItems.map(item => ({ ...item, id: `${item.id}-footer` }));
  return { sections };
};

export const defaultSiteEditorConfig = () => ({
  status: 'draft', version: 1, page: 'home', themeColor: '#7C6EF5',
  pages: {
    home: page('home', [
      section('home', 'hero', { eyebrow: 'Premium collection 2026', title: '为您的品牌打造高品质产品', subtitle: '工厂直供 · 品牌定制 · 全球交付', buttonText: '查看产品', secondaryButtonText: '获取报价', showButton: true, showEyebrow: true, showSecondaryButton: true, showTrustBar: true, trustItems: DEFAULT_HERO_TRUST_ITEMS.map(item => ({ ...item })) }),
      section('home', 'products', { eyebrow: 'Featured products', title: '精选产品', subtitle: '精选产品与灵活起订量，满足全球品牌的采购需求。', buttonText: '联系我们', showButton: true, showEyebrow: true }),
      section('home', 'text', { eyebrow: 'Our story', title: '内容标题', subtitle: '在这里简洁介绍您的企业、服务或产品。', showEyebrow: true, showStats: true, stats: [{ id: 'home-stat-experience', value: '10+', label: '年行业经验' }, { id: 'home-stat-countries', value: '30+', label: '出口国家' }, { id: 'home-stat-customers', value: '500+', label: '全球客户' }], promiseTitle: '我们的承诺', promiseText: '从样品、生产到交付，提供可追溯的专业服务。', qualityBadgeText: '品质认证' }),
      section('home', 'form', { eyebrow: 'Start a project', title: '获取专属报价', subtitle: '请填写联系人、联系方式和采购需求，外贸团队将尽快联系您。', buttonText: '提交询盘', showButton: true, showEyebrow: true, formFields: [{ key: 'name', label: '联系人', enabled: true, required: true }, { key: 'contact', label: '联系方式', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }] }),
      section('home', 'contactModal', { title: '联系我们', subtitle: '请直接联系我们确认产品、价格与定制需求，我们将在工作日 24 小时内回复。' }),
    ]),
    products: page('products', [section('products', 'products', { eyebrow: 'Featured products', title: '精选产品', subtitle: '精选产品与灵活起订量，满足全球品牌的采购需求。', buttonText: '联系我们', showButton: true, showEyebrow: true })]),
    about: page('about', [section('about', 'text', { eyebrow: 'Our story', title: '内容标题', subtitle: '在这里简洁介绍您的企业、服务或产品。', showEyebrow: true, showStats: true, stats: [{ id: 'about-stat-experience', value: '10+', label: '年行业经验' }], promiseTitle: '我们的承诺', promiseText: '从样品、生产到交付，提供可追溯的专业服务。', qualityBadgeText: '品质认证' })]),
    contact: page('contact', [section('contact', 'form', { eyebrow: 'Start a project', title: '获取专属报价', subtitle: '请填写联系人、联系方式和采购需求，外贸团队将尽快联系您。', buttonText: '提交询盘', showButton: true, showEyebrow: true, formFields: [{ key: 'name', label: '联系人', enabled: true, required: true }, { key: 'contact', label: '联系方式', enabled: true, required: true }, { key: 'requirements', label: '采购需求', enabled: true, required: true }] })]),
  },
});

export const ensureSiteEditorPages = (value: Record<string, any> | null | undefined) => value?.pages ? value : { ...defaultSiteEditorConfig(), ...(value || {}) };
