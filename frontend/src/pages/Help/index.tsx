import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, Boxes, CheckCircle2, ChevronRight, CircleDollarSign, Globe2, Menu, Package, Settings, ShoppingCart, Target, X } from 'lucide-react';
import { BrandMark } from '../../components/shared';

type TrainingStep = { entry: string; action: string; result: string };
type TrainingChapter = {
  id: string; order: string; title: string; subtitle: string; roles: string[]; goal: string;
  ownerFocus: string; operatorFocus: string;
  preparation: string[]; steps: TrainingStep[]; completion: string[];
  issues: Array<{ question: string; answer: string }>;
  icon: React.FC<{ className?: string }>;
  screenshot?: { src: string; alt: string; caption: string; callouts: Array<{ label: string; left: number; top: number }> };
};

const chapters: TrainingChapter[] = [
  {
    id: 'first-setup', order: '01', title: '开通后的首次配置', subtitle: '老板定规则，运营搭好日常经营底座', roles: ['老板', '运营负责人'], icon: Settings,
    goal: '由老板确认经营规则，运营完成企业、币种、仓库和团队权限配置，让后续业务从第一天就使用统一口径。',
    ownerFocus: '确定谁负责商品、采购、销售、仓库和财务，并保留经营数据的全局查看权。', operatorFocus: '把企业资料、默认币种、仓库和成员账号一次配置正确，正式录单前完成自检。',
    preparation: ['确认企业名称、联系人和常用结算币种。', '整理实际仓库清单及负责人员。', '确认运营、采购、仓管和财务人员的职责边界。'],
    steps: [
      { entry: '系统管理 → 系统设置', action: '维护企业基础资料、默认币种和可用业务参数并保存。', result: '新建商品和业务单据时使用统一的企业与币种配置。' },
      { entry: '库存管理 → 仓库管理', action: '为每个实际收发货地点建立仓库，填写名称、编码和地址。', result: '采购入库、销售出库、调拨和盘点均可选择正确仓库。' },
      { entry: '系统管理 → 成员与权限', action: '按岗位创建角色，再添加成员并分配角色；老板保留全局查看权限。', result: '成员只看到职责范围内的菜单和操作。' },
      { entry: '右上角头像 → 账号信息', action: '确认管理员账号和联系方式，要求所有成员首次登录后修改密码。', result: '账号归属清晰且具备基本安全保障。' },
    ],
    completion: ['至少有一个启用中的仓库。', '默认币种与实际报价币种一致。', '每位成员可登录，且菜单和操作权限符合岗位。', '老板账号能够查看经营概览和财务统计。'],
    issues: [
      { question: '成员看不到某个页面怎么办？', answer: '检查角色是否同时具备对应菜单权限、页面权限和所需操作权限，并让成员重新登录。' },
      { question: '可以让所有人都使用管理员账号吗？', answer: '不建议。独立账号便于限制权限、识别操作人和后续追溯。' },
    ],
  },
  {
    id: 'product-foundation', order: '02', title: '建立商品经营基础', subtitle: '老板管定价逻辑，运营管资料质量', roles: ['老板', '商品运营'], icon: Package,
    goal: '建立既能内部核算又能对外展示的商品资料，让分类、规格、价格、起订量和库存口径保持一致。',
    ownerFocus: '确认商品定位、报价策略、客户等级价和毛利空间。', operatorFocus: '维护统一商品编码、清晰图片、完整规格和独立站展示信息。',
    preparation: ['准备商品编码、分类、名称、描述和图片。', '整理规格组合、基础价、客户等级价和最小起订量。', '确认哪些商品需要同步到独立站。'],
    steps: [
      { entry: '商品管理 → 商品分类', action: '先建立分类层级并设置排序和启用状态。', result: '后台筛选和独立站商品导航使用同一分类。' },
      { entry: '商品管理 → 商品列表 → 新建商品', action: '填写名称、描述、商品编码和分类，上传主图及详情图。', result: '形成商品主档，第一张图片作为主图。' },
      { entry: '商品编辑 → 规格库存', action: '填写基础单价、最小起订量和规格额外加价；库存只在库存业务中变化。', result: '每个规格具备明确价格，避免直接修改库存造成账实不符。' },
      { entry: '商品编辑 → 客户等级价', action: '为重点客户等级配置专属价，未配置时沿用基础价。', result: '客户识别后展示相应等级价格。' },
      { entry: '商品编辑 → 同步设置', action: '确认图片、价格和起订量无误后开启“同步到独立站”并保存。', result: '商品进入独立站商品池，供站点页面展示。' },
    ],
    completion: ['商品编码唯一且可识别。', '主图清晰，规格与额外加价完整。', '基础价、等级价和最小起订量已复核。', '需要对外展示的商品已同步到独立站。'],
    issues: [
      { question: '为什么商品页不能直接改规格库存？', answer: '库存由采购入库、销售出库、盘点和调拨汇总，直接修改会破坏库存流水。' },
      { question: '删除规格有什么影响？', answer: '规格及其库存数据会一并移除。删除前先确认没有仍需追溯的业务数据。' },
    ],
    screenshot: { src: '/training-assets/product.webp', alt: '商品资料与规格价格配置示例', caption: '商品资料维护：先完成基础信息和图片，再进入规格库存配置价格。', callouts: [{ label: '切换到规格库存页签', left: 25, top: 16 }, { label: '配置币种、基础价和规格加价', left: 37, top: 27 }] },
  },
  {
    id: 'purchase-to-stock', order: '03', title: '采购到入库', subtitle: '老板掌握采购投入，运营保证货物入账', roles: ['老板', '采购运营', '仓储运营'], icon: ShoppingCart,
    goal: '让每次采购都有供应商、订单、到货和库存记录，老板能看清资金投入，运营能核对实际到货。',
    ownerFocus: '关注采购金额、供应商交付、到货进度和预计付款。', operatorFocus: '按实际业务建立采购订单，分批收货时逐次入库，并核对库存增量。',
    preparation: ['商品和规格已经建立。', '供应商资料和收货仓库已经建立。', '采购价格、数量和预计到货时间已经确认。'],
    steps: [
      { entry: '采购管理 → 供应商管理', action: '建立供应商档案，维护联系人、联系方式、地址和业务备注。', result: '采购订单可以关联明确的供应商。' },
      { entry: '采购管理 → 采购订单', action: '选择供应商，添加商品规格、数量和采购价，复核后保存订单。', result: '形成采购依据和预计应付金额。' },
      { entry: '采购管理 → 采购入库', action: '关联采购订单，选择实际收货仓库并填写本次到货数量。', result: '支持分批到货，实际入库数量有据可查。' },
      { entry: '采购入库 → 确认入库', action: '仓管核对商品、规格和数量后确认。', result: '对应仓库库存增加，采购订单进度同步更新。' },
      { entry: '库存管理 → 库存查询', action: '按商品或仓库检查入库后的库存和流水。', result: '采购数量、入库数量和库存增量一致。' },
    ],
    completion: ['采购订单供应商、商品、数量和价格正确。', '入库仓库与实际收货地点一致。', '采购订单进度与累计到货数量一致。', '库存流水中可查到对应采购入库记录。'],
    issues: [
      { question: '供应商分两次到货怎么处理？', answer: '针对同一采购订单分别创建采购入库，每次只填写实际到货数量。' },
      { question: '入库后库存没有变化怎么办？', answer: '确认入库单是否已完成而非仅保存，并核对查看的仓库和商品规格。' },
    ],
    screenshot: { src: '/training-assets/purchase.webp', alt: '采购订单与采购入库页面示例', caption: '采购闭环：供应商建档后建立订单，再按实际到货数量完成入库。', callouts: [{ label: '新建采购订单并录入采购需求', left: 92, top: 11 }, { label: '根据订单状态核对到货进度', left: 80, top: 33 }] },
  },
  {
    id: 'sales-to-cash', order: '04', title: '销售到回款', subtitle: '老板看收入与回款，运营推进订单履约', roles: ['老板', '销售运营', '财务运营'], icon: CircleDollarSign,
    goal: '把客户需求转成销售订单，按实际发货扣减库存，并登记回款，让收入、履约和现金状态能够相互核对。',
    ownerFocus: '关注销售额、毛利空间、交付进度、已回款和应收余额。', operatorFocus: '准确录入客户、商品和成交价，按发货进度出库，并让财务及时登记到账。',
    preparation: ['客户档案和等级已建立。', '商品价格、规格及可用库存已经核对。', '确认结算币种、交付仓库和收款约定。'],
    steps: [
      { entry: '销售管理 → 客户管理', action: '建立客户资料并分配客户等级，维护联系人和联系方式。', result: '订单可关联客户，并可应用对应等级价格。' },
      { entry: '销售管理 → 销售订单', action: '选择客户，添加商品规格、数量和价格，确认币种与金额后保存。', result: '形成销售履约依据和预计应收金额。' },
      { entry: '销售管理 → 销售出库', action: '关联销售订单，选择发货仓库并填写实际出库数量。', result: '支持分批发货，订单履约进度持续更新。' },
      { entry: '销售出库 → 确认出库', action: '仓管复核商品、规格、仓库和数量后确认。', result: '对应仓库库存扣减并生成库存流水。' },
      { entry: '财务管理 → 收款管理', action: '关联客户或销售单据，登记金额、币种、日期和收款方式。', result: '应收余额和收款状态得到更新。' },
    ],
    completion: ['销售订单金额与客户约定一致。', '实际出库数量没有超过订单数量和可用库存。', '库存流水可追溯到销售出库单。', '收款记录与银行或第三方到账记录一致。'],
    issues: [
      { question: '客户分批付款怎么处理？', answer: '按每次实际到账分别登记收款，持续核对订单应收余额。' },
      { question: '出库时提示库存不足怎么办？', answer: '核对仓库和规格是否正确；确实不足时先完成采购入库或库存调拨。' },
    ],
    screenshot: { src: '/training-assets/sales.webp', alt: '销售订单与销售出库页面示例', caption: '销售履约：订单确认后按实际发货创建出库，再由财务登记回款。', callouts: [{ label: '新建销售订单并确认客户需求', left: 92, top: 11 }, { label: '从订单状态跟踪履约进度', left: 76, top: 33 }] },
  },
  {
    id: 'inventory-operations', order: '05', title: '库存日常管理', subtitle: '老板控制库存占用，运营守住账实一致', roles: ['老板', '仓储运营'], icon: Boxes,
    goal: '通过查询、调拨、盘点和流水核查，及时发现缺货、积压、错仓和账实差异。',
    ownerFocus: '关注库存资金占用、低库存预警、积压风险和仓库分布。', operatorFocus: '每天核对异常库存，按实物流向调拨，定期盘点并说明差异原因。',
    preparation: ['仓库及商品规格已经建立。', '采购入库和销售出库均按实际业务录入。', '明确盘点日期和暂停收发货的时间窗口。'],
    steps: [
      { entry: '库存管理 → 库存查询', action: '按商品、编码、规格或仓库筛选，关注可用库存和低库存商品。', result: '快速判断采购、销售和调拨需求。' },
      { entry: '库存管理 → 库存调拨', action: '选择调出仓、调入仓和商品规格，填写调拨数量并确认。', result: '库存从一个仓库转移到另一个仓库，总库存不变。' },
      { entry: '库存管理 → 库存盘点', action: '选择仓库并录入实际数量，复核系统自动计算的差异。', result: '确认后以盘点结果修正账面库存并保留调整记录。' },
      { entry: '库存查询 → 库存流水', action: '出现异常时按时间追溯采购入库、销售出库、调拨和盘点记录。', result: '能够定位每一次库存变化的来源。' },
    ],
    completion: ['高频商品每日检查，其他商品按固定周期盘点。', '调拨的调出仓和调入仓与实物流向一致。', '盘点差异已经说明原因并由负责人复核。', '负库存、异常增长和长期无变化库存已处理。'],
    issues: [
      { question: '盘点可以用来代替采购入库吗？', answer: '不可以。盘点用于修正账实差异，正常采购必须通过采购订单和采购入库形成完整记录。' },
      { question: '调拨后总库存为什么没变？', answer: '调拨只改变库存所在仓库，不改变企业总库存。' },
    ],
    screenshot: { src: '/training-assets/inventory.webp', alt: '库存查询与调拨盘点页面示例', caption: '库存管理：先筛选仓库和规格，再通过流水解释每次库存变化。', callouts: [{ label: '查看现存、可用和预警库存', left: 47, top: 21 }, { label: '按商品、仓库和状态筛选', left: 45, top: 37 }, { label: '进入库存流水追溯变化', left: 94, top: 11 }] },
  },
  {
    id: 'storefront-launch', order: '06', title: '独立站上线', subtitle: '老板确认品牌方向，运营完成上线交付', roles: ['老板', '独立站运营'], icon: Globe2,
    goal: '完成站点资料、商品、页面、多语言、SEO、域名和发布检查，让独立站能够稳定承接海外访问与询盘。',
    ownerFocus: '确认品牌定位、核心产品、目标市场、对外承诺和最终上线效果。', operatorFocus: '完成内容搭建、商品同步、多语言、SEO、域名配置、移动端检查和正式发布。',
    preparation: ['品牌名称、Logo、企业介绍和联系方式已经确认。', '准备高质量商品图、站点横幅、目标语言文案和域名。', '商品已经开启独立站同步。'],
    steps: [
      { entry: '独立站 → 站点设置', action: '维护品牌信息、联系资料、默认语言、SEO 标题与描述。', result: '站点具备统一品牌信息和搜索引擎展示文案。' },
      { entry: '独立站 → 商品池', action: '检查同步商品的图片、价格、起订量、分类和展示状态。', result: '对外商品内容准确且完整。' },
      { entry: '独立站 → 站点设计', action: '编辑页头、横幅、商品区块、企业介绍、询盘表单和页脚，并检查按钮跳转。', result: '形成桌面端与移动端结构完整的站点页面。' },
      { entry: '独立站 → 多语言内容', action: '选择目标语言，完成页面、商品和公共文案翻译，处理未翻译和已过期项。', result: '访客切换语言后看到完整一致的内容。' },
      { entry: '独立站 → 站点设置 → 自定义域名', action: '按提示添加 DNS 记录并完成验证。', result: '自定义域名可访问并由系统提供 HTTPS。' },
      { entry: '站点设计 → 预览 / 发布', action: '分别检查桌面和移动端，再发布并到发版历史确认成功。', result: '最新站点版本正式对外可访问。' },
    ],
    completion: ['图片清晰且未拉伸，商品价格和起订量准确。', '导航、按钮、语言切换和询盘表单可用。', 'SEO 信息、联系方式、隐私相关文案已经复核。', '域名和 HTTPS 正常，发版历史显示发布成功。'],
    issues: [
      { question: '修改内容后前台为什么没有变化？', answer: '保存编辑并不等于发布。完成预览后重新发布，并在发版历史确认结果。' },
      { question: '域名一直显示待验证怎么办？', answer: '核对 DNS 记录类型、主机记录和值是否完全一致，并等待 DNS 生效后再次验证。' },
    ],
    screenshot: { src: '/training-assets/site-design.webp', alt: '独立站可视化设计页面示例', caption: '站点设计：逐区块维护内容，并同时检查桌面端和移动端预览。', callouts: [{ label: '从左侧组织页面区块', left: 12, top: 34 }, { label: '在中间画布检查页面效果', left: 54, top: 49 }, { label: '在右侧配置内容与交互', left: 88, top: 35 }] },
  },
  {
    id: 'lead-to-deal', order: '07', title: '询盘到成交', subtitle: '老板看转化效率，运营推进每条商机', roles: ['老板', '独立站运营', '销售运营'], icon: Target,
    goal: '及时承接独立站询盘，明确跟进责任和结果，并把有效商机转入客户、订单和回款流程。',
    ownerFocus: '关注线索数量、首次响应速度、跟进积压、转化率和关闭原因。', operatorFocus: '每天清理新线索，及时分配负责人，持续记录跟进，并把成交机会转成客户和订单。',
    preparation: ['独立站询盘表单已经发布并完成测试提交。', '销售成员及线索分配权限已经配置。', '团队已约定首次响应时限和关闭原因规范。'],
    steps: [
      { entry: '独立站 → 线索池', action: '每天筛选“新线索”，查看联系人、公司、关联商品和采购需求。', result: '新增询盘被及时识别。' },
      { entry: '线索详情 → 跟进并指派', action: '选择负责人，补充首次沟通记录并把状态改为跟进中。', result: '线索有明确负责人和下一步动作。' },
      { entry: '线索池 → 跟进中', action: '持续更新沟通结果；有效商机标记转化，无效线索填写原因后关闭。', result: '所有线索都有可统计的最终状态。' },
      { entry: '销售管理 → 客户管理 / 销售订单', action: '为已转化线索建立客户档案，并根据报价结果创建销售订单。', result: '线上询盘进入正式销售和回款闭环。' },
    ],
    completion: ['新线索在团队约定时限内首次响应。', '跟进中线索均有负责人和最新记录。', '转化与关闭状态真实，关闭原因可分析。', '成交线索已经建立客户和销售订单。'],
    issues: [
      { question: '普通成员无法指派线索怎么办？', answer: '由拥有指派权限的负责人完成分配；普通跟进人员可在权限范围内更新自己的线索。' },
      { question: '老板应该关注什么？', answer: '重点看新线索积压、首次响应时长、跟进中数量、转化率和主要关闭原因。' },
    ],
    screenshot: { src: '/training-assets/leads.webp', alt: '独立站线索池页面示例', caption: '线索池：优先处理新线索，及时指派负责人并记录跟进结果。', callouts: [{ label: '查看新增、跟进中和已转化数量', left: 58, top: 20 }, { label: '按状态筛选并安排跟进', left: 47, top: 33 }, { label: '核对负责人、状态和操作', left: 92, top: 55 }] },
  },
  {
    id: 'owner-review', order: '08', title: '老板经营复盘', subtitle: '老板做判断，运营拿出行动结果', roles: ['老板', '运营负责人', '财务负责人'], icon: BarChart3,
    goal: '用经营概览、财务、库存和线索数据建立每日、每周、每月的复盘节奏，把数据转成明确的经营动作。',
    ownerFocus: '判断销售、采购、现金、库存和获客是否健康，并决定资源投向。', operatorFocus: '保证数据及时准确，解释异常原因，并形成带负责人和截止时间的行动清单。',
    preparation: ['采购、销售、出入库和收付款均按实际业务及时录入。', '团队使用统一状态和关闭原因。', '明确需要重点跟踪的商品、客户和市场。'],
    steps: [
      { entry: '每日 → 经营概览 / 线索池', action: '检查新订单、新线索、待处理事项、库存不足和异常单据。', result: '当天问题当天分配负责人。' },
      { entry: '每周 → 财务统计 / 库存查询', action: '分析销售与采购趋势、应收应付、库存周转和缺货风险。', result: '形成下周采购、销售和催收动作。' },
      { entry: '每月 → 经营概览 / 财务统计', action: '核对收入、支出、应收、应付、客户和线索转化，并与业务明细抽样复核。', result: '形成月度经营结论和改进计划。' },
      { entry: '每月 → 成员与权限', action: '复核离职成员、岗位变化和高风险权限。', result: '账号与权限始终符合当前组织职责。' },
    ],
    completion: ['每日异常均有负责人和截止时间。', '每周形成采购、销售、库存和催收行动清单。', '每月统计能与订单、库存和收付款明细相互核对。', '权限与实际在岗人员一致。'],
    issues: [
      { question: '统计数据和预期不一致怎么办？', answer: '先确认时间、币种和单据状态，再从对应订单、库存流水和收付款明细逐层核对。' },
      { question: '只看销售额够吗？', answer: '不够。需要同时关注回款、应付、库存占用、线索转化和异常单据，避免有收入无现金或库存积压。' },
    ],
    screenshot: { src: '/training-assets/dashboard.webp', alt: '经营概览与财务复盘页面示例', caption: '经营复盘：从概览发现异常，再进入财务、库存和业务明细核对。', callouts: [{ label: '先看销售、采购、收款和付款', left: 58, top: 27 }, { label: '再看待办和风险预警', left: 58, top: 43 }, { label: '最后分析趋势和商品结构', left: 63, top: 67 }] },
  },
];

const HelpPage: React.FC = () => {
  const initialHash = window.location.hash.slice(1);
  const [activeId, setActiveId] = useState(chapters.some(chapter => chapter.id === initialHash) ? initialHash : chapters[0].id);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const activeChapter = useMemo(() => chapters.find(chapter => chapter.id === activeId) || chapters[0], [activeId]);

  useEffect(() => {
    document.title = '老板与运营实战手册 · 迈犀沃';
    if (!initialHash) return;
    requestAnimationFrame(() => document.getElementById(initialHash)?.scrollIntoView({ block: 'start' }));
  }, [initialHash]);

  const openChapter = (id: string) => {
    setActiveId(id);
    setDirectoryOpen(false);
    window.history.replaceState(null, '', `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div data-testid="standalone-help" className="min-h-screen bg-[#f7f7fc] text-foreground">
      <header className="border-b border-border bg-white"><div className="mx-auto flex max-w-[1480px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8"><BrandMark size={34} /><div className="min-w-0"><div className="text-sm font-bold">迈犀沃</div><div className="truncate text-xs text-muted-foreground">老板与运营实战手册</div></div><div className="ml-auto hidden items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs text-primary sm:flex"><BookOpen className="h-3.5 w-3.5" />从经营判断到运营落地</div><button type="button" aria-label="打开培训目录" onClick={() => setDirectoryOpen(true)} className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-border bg-white lg:hidden"><Menu className="h-4 w-4" /></button></div></header>

      <section className="border-b border-primary/10 bg-gradient-to-br from-primary/12 via-white to-violet-50"><div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-14"><div><div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mercivo Business Playbook</div><h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">老板看得懂，运营做得成</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">从经营目标出发，把商品、采购、销售、库存、独立站和财务串成一条业务闭环。老板用它抓结果，运营团队照着步骤把工作落到系统里。</p></div><div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur"><div><div className="text-2xl font-bold text-primary">8</div><div className="mt-1 text-xs text-muted-foreground">经营实战阶段</div></div><div><div className="text-2xl font-bold text-primary">2</div><div className="mt-1 text-xs text-muted-foreground">老板与运营视角</div></div><div className="col-span-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">建议老板先理解每章的经营重点，再由运营负责人带团队完成操作和验收。</div></div></div></section>

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[270px_minmax(0,1fr)] lg:px-8">
        <aside data-testid="manual-directory" className="hidden h-fit overflow-hidden rounded-2xl border border-border bg-white lg:sticky lg:top-6 lg:block"><div className="border-b border-border px-4 py-3"><div className="text-sm font-semibold">实战目录</div><div className="mt-0.5 text-xs text-muted-foreground">从经营准备到复盘决策</div></div><nav aria-label="培训手册目录" className="max-h-[calc(100vh-150px)] overflow-y-auto p-2">{chapters.map(chapter => <button key={chapter.id} type="button" onClick={() => openChapter(chapter.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${activeId === chapter.id ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-secondary'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${activeId === chapter.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{chapter.order}</span><span className="min-w-0 flex-1 truncate text-sm">{chapter.title}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" /></button>)}</nav></aside>

        {directoryOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="关闭培训目录遮罩" onClick={() => setDirectoryOpen(false)} className="absolute inset-0 bg-black/35" /><aside className="absolute inset-y-0 left-0 w-[min(86vw,320px)] overflow-y-auto bg-white p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><div className="font-semibold">培训目录</div><div className="text-xs text-muted-foreground">当前：{activeChapter.title}</div></div><button type="button" aria-label="关闭培训目录" onClick={() => setDirectoryOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button></div><nav aria-label="移动端培训手册目录" className="space-y-1">{chapters.map(chapter => <button key={chapter.id} type="button" onClick={() => openChapter(chapter.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${activeId === chapter.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}><span className="text-xs font-bold">{chapter.order}</span><span className="text-sm">{chapter.title}</span></button>)}</nav></aside></div>}

        <main className="min-w-0 space-y-6">{chapters.map(chapter => { const Icon = chapter.icon; return <article id={chapter.id} key={chapter.id} className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-5 py-5 sm:px-7"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white"><Icon className="h-5 w-5" /></span><div className="min-w-0"><div className="text-xs font-bold tracking-widest text-primary">经营阶段 {chapter.order}</div><h2 className="mt-1 text-xl font-bold">{chapter.title}</h2><p className="mt-1 text-sm text-muted-foreground">{chapter.subtitle}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{chapter.roles.map(role => <span key={role} className="rounded-full border border-primary/15 bg-white px-3 py-1 text-xs text-primary">建议参与 · {role}</span>)}</div></div>
          <div className="space-y-6 px-5 py-6 sm:px-7"><section><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" />本章要解决什么</div><p className="rounded-xl bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground/80">{chapter.goal}</p></section><section className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4"><div className="text-xs font-bold text-violet-700">老板重点看</div><p className="mt-2 text-sm leading-6 text-violet-950/80">{chapter.ownerFocus}</p></div><div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4"><div className="text-xs font-bold text-sky-700">运营重点做</div><p className="mt-2 text-sm leading-6 text-sky-950/80">{chapter.operatorFocus}</p></div></section><section><h3 className="mb-3 text-sm font-semibold">开始操作前</h3><div className="grid gap-2 sm:grid-cols-2">{chapter.preparation.map(item => <div key={item} className="flex gap-2 rounded-xl border border-border px-3 py-2.5 text-sm leading-5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{item}</span></div>)}</div></section>
            <section><h3 className="mb-3 text-sm font-semibold">运营落地步骤</h3><div className="overflow-hidden rounded-xl border border-border">{chapter.steps.map((step, index) => <div key={`${step.entry}-${index}`} className="grid gap-3 border-b border-border p-4 last:border-b-0 md:grid-cols-[44px_190px_minmax(0,1fr)]"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div><div className="text-[11px] font-semibold uppercase text-muted-foreground">从这里进入</div><div className="mt-1 text-sm font-medium text-primary">{step.entry}</div></div><div><p className="text-sm leading-6">{step.action}</p><p className="mt-1 flex gap-1.5 text-xs leading-5 text-muted-foreground"><ArrowRight className="mt-1 h-3 w-3 shrink-0" /><span>做完以后：{step.result}</span></p></div></div>)}</div></section>
            {chapter.screenshot && <figure className="overflow-hidden rounded-2xl border border-border bg-secondary/20"><div className="relative aspect-[16/9] overflow-hidden bg-secondary"><img src={chapter.screenshot.src} alt={chapter.screenshot.alt} loading="lazy" className="h-full w-full object-cover object-top" onError={event => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.classList.remove('hidden'); }} /><div className="absolute inset-0 hidden place-items-center p-8 text-center text-sm text-muted-foreground"><div><BookOpen className="mx-auto mb-2 h-7 w-7" />截图暂不可用，请按上方操作入口进入系统。</div></div>{chapter.screenshot.callouts.map((callout, index) => <span key={callout.label} aria-label={`${index + 1}. ${callout.label}`} data-testid="screenshot-callout" className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white shadow-lg" style={{ left: `${callout.left}%`, top: `${callout.top}%` }}>{index + 1}</span>)}</div><figcaption className="px-4 py-3 text-xs leading-5 text-muted-foreground"><p>{chapter.screenshot.caption}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{chapter.screenshot.callouts.map((callout, index) => <span key={callout.label} className="inline-flex items-center gap-1.5"><b className="text-primary">{index + 1}</b>{callout.label}</span>)}</div></figcaption></figure>}
            <section className="grid gap-4 xl:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"><h3 className="mb-3 text-sm font-semibold text-emerald-800">老板如何验收</h3><ul className="space-y-2">{chapter.completion.map(item => <li key={item} className="flex gap-2 text-sm leading-5 text-emerald-900/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{item}</span></li>)}</ul></div><div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"><h3 className="mb-3 text-sm font-semibold text-amber-900">运营常见问题</h3><div className="space-y-3">{chapter.issues.map(issue => <div key={issue.question}><div className="text-sm font-medium text-amber-950">{issue.question}</div><p className="mt-1 text-xs leading-5 text-amber-900/75">{issue.answer}</p></div>)}</div></div></section></div></article>; })}</main>
      </div>
      <footer className="border-t border-border bg-white px-4 py-6 text-center text-xs text-muted-foreground">迈犀沃 · 外贸 ERP 与独立站平台 · 培训内容以当前系统功能为准</footer>
    </div>
  );
};

export default HelpPage;
