import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  ContactRound,
  Globe2,
  HandCoins,
  History,
  Languages,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquareText,
  Package,
  PackageCheck,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';

type ManualTopic = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
};

type ManualGroup = {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  topics: ManualTopic[];
};

const MANUAL_GROUPS: ManualGroup[] = [
  {
    id: 'getting-started', title: '快速开始', icon: BookOpen, topics: [
      { id: 'overview', title: '系统使用概览', summary: '迈犀沃将商品、销售、采购、库存、独立站和财务数据统一在一个工作台中。', steps: ['先在系统设置中维护企业、币种和业务参数。', '建立商品分类、商品、仓库、客户与供应商等基础资料。', '按销售、采购、出入库和收付款的业务顺序录入单据。', '通过经营概览与财务统计查看经营结果。'], tips: ['页面左侧是业务菜单；右上角头像可修改账号信息和密码。', '看不到某个菜单时，请联系管理员检查成员角色、功能权限或套餐权限。'] },
    ],
  },
  {
    id: 'dashboard', title: '经营概览', icon: LayoutDashboard, topics: [
      { id: 'dashboard-overview', title: '经营概览', summary: '集中查看核心经营指标、趋势和待处理事项。', steps: ['进入“经营概览”查看销售、采购、库存和客户指标。', '切换时间范围观察趋势变化。', '点击异常或待办卡片进入对应业务页面处理。'], tips: ['统计口径以已保存的业务单据及其当前状态为准。'] },
    ],
  },
  {
    id: 'products', title: '商品管理', icon: Package, topics: [
      { id: 'product-list', title: '商品列表', summary: '维护商品主数据、图片、价格、多规格、库存展示信息和独立站同步状态。', steps: ['使用名称或商品编码筛选商品。', '点击“新建商品”填写基础信息、图片、价格和规格。', '在列表或详情中编辑、预览、上下架或删除商品。'], tips: ['商品删除前请确认没有仍需保留的业务关联；规格删除会同时移除该规格库存数据。'] },
      { id: 'product-categories', title: '商品分类', summary: '以树形层级组织商品，便于后台筛选和独立站展示。', steps: ['新建一级分类，按需添加子分类。', '设置分类名称、排序和展示状态。', '回到商品编辑页为商品选择分类。'] },
    ],
  },
  {
    id: 'sales', title: '销售管理', icon: ShoppingCart, topics: [
      { id: 'sales-orders', title: '销售订单', summary: '记录客户订单、商品明细、金额和履约状态。', steps: ['新建订单并选择客户。', '添加商品、规格、数量、价格和必要备注。', '确认订单后，根据实际业务推进状态并创建出库。'] },
      { id: 'sales-shipments', title: '销售出库', summary: '记录销售订单对应的发货和库存扣减。', steps: ['从销售订单发起出库，或在出库页面创建单据。', '核对仓库、商品、规格和出库数量。', '确认出库后检查库存变化和订单履约状态。'] },
      { id: 'customers', title: '客户管理', summary: '维护客户档案、联系方式、等级和登录访问能力。', steps: ['新建或编辑客户基础资料。', '按业务价值维护客户等级。', '需要客户访问独立站时，配置对应账号并妥善管理凭据。'] },
    ],
  },
  {
    id: 'purchase', title: '采购管理', icon: ClipboardList, topics: [
      { id: 'purchase-orders', title: '采购订单', summary: '记录向供应商采购的商品、数量、价格和交付信息。', steps: ['选择供应商并添加采购商品。', '核对数量、采购价、预计到货时间和备注。', '保存后根据实际到货情况创建采购入库。'] },
      { id: 'purchase-receipts', title: '采购入库', summary: '登记采购到货并增加对应仓库库存。', steps: ['关联采购订单并选择收货仓库。', '核对实际到货规格和数量。', '确认入库后检查采购订单与库存状态。'] },
      { id: 'suppliers', title: '供应商管理', summary: '统一管理供应商资料和采购协作信息。', steps: ['新建供应商并填写名称与联系方式。', '补充地址、业务备注等资料。', '创建采购订单时选择已维护的供应商。'] },
    ],
  },
  {
    id: 'inventory', title: '库存管理', icon: Boxes, topics: [
      { id: 'inventory-stocks', title: '库存查询', summary: '按仓库、商品和规格查看当前库存及库存流水。', steps: ['使用商品、编码、规格或仓库筛选。', '查看可用库存与各仓库库存。', '进入明细核对相关入库、出库、盘点和调拨记录。'] },
      { id: 'inventory-counts', title: '库存盘点', summary: '通过盘点修正账面库存与实际库存的差异。', steps: ['创建盘点单并选择仓库。', '录入商品规格的实际盘点数量。', '复核差异后确认盘点，使库存调整生效。'], tips: ['确认前务必复核差异；盘点结果会直接影响库存。'] },
      { id: 'inventory-transfers', title: '库存调拨', summary: '在不同仓库之间转移库存。', steps: ['选择调出仓库和调入仓库。', '添加商品规格及调拨数量。', '确认单据并在完成后核对两端库存。'] },
      { id: 'warehouses', title: '仓库管理', summary: '维护库存业务使用的仓库基础资料。', steps: ['新建仓库并填写名称、编码和地址。', '设置仓库状态。', '停用前确认没有未完成的出入库或调拨业务。'] },
    ],
  },
  {
    id: 'storefront', title: '独立站', icon: Globe2, topics: [
      { id: 'storefront-leads', title: '线索池', summary: '处理独立站访客提交的询盘和采购需求。', steps: ['按状态筛选新线索、跟进中线索和已完成线索。', '查看联系人、联系方式和采购需求。', '指派跟进人并持续更新处理状态，最终标记转化或关闭。'] },
      { id: 'storefront-products', title: '商品池', summary: '查看已同步到独立站的商品和分类信息。', steps: ['按分类或关键词筛选商品。', '预览商品图片、价格、起订量和展示状态。', '如需修改商品，返回商品管理完成后重新同步。'] },
      { id: 'site-design', title: '站点设计', summary: '以可视化方式编辑独立站页面结构、内容、样式和交互。', steps: ['选择页面和区块，在编辑面板修改文案、图片与样式。', '调整区块顺序、显示状态和导航指向。', '使用预览检查桌面与移动端效果，保存后进入发布流程。'], tips: ['发布前请检查图片清晰度、按钮链接、联系表单和多语言内容。'] },
      { id: 'translations', title: '多语言内容', summary: '维护独立站各语言的页面、商品与公共文案翻译。', steps: ['先在站点设置中启用目标语言。', '选择语言和内容类型，筛选未翻译或已过期字段。', '填写译文并保存，完成后预览对应语言页面。'] },
      { id: 'site-settings', title: '站点设置', summary: '配置站点基础资料、语言、域名、询盘和展示参数。', steps: ['维护站点名称、品牌与联系资料。', '添加支持语言并设置默认语言。', '按提示配置自定义域名 DNS，验证通过后启用 HTTPS。'] },
      { id: 'release-history', title: '发版历史', summary: '查看独立站发布记录、发布状态和版本结果。', steps: ['发布前确认站点设计和翻译内容已保存。', '在发版历史查看处理进度与结果。', '遇到失败时查看错误信息，修正后重新发布。'] },
    ],
  },
  {
    id: 'finance', title: '财务管理', icon: CircleDollarSign, topics: [
      { id: 'receipts', title: '收款管理', summary: '登记客户回款并关联销售业务。', steps: ['新建收款并选择客户或关联单据。', '填写金额、币种、日期和收款方式。', '保存后核对未收款金额和收款状态。'] },
      { id: 'payments', title: '付款管理', summary: '登记供应商付款并关联采购业务。', steps: ['新建付款并选择供应商或关联单据。', '填写金额、币种、日期和付款方式。', '保存后核对未付款金额和付款状态。'] },
      { id: 'finance-statistics', title: '财务统计', summary: '汇总收入、支出、应收和应付数据。', steps: ['选择统计时间范围和币种。', '查看收支趋势及应收应付汇总。', '结合销售、采购和财务明细核对异常数据。'] },
    ],
  },
  {
    id: 'system', title: '系统管理', icon: Settings, topics: [
      { id: 'system-settings', title: '系统设置', summary: '维护企业信息、业务参数和系统级偏好。', steps: ['填写企业及业务基础资料。', '配置币种、编号或其他可用业务参数。', '保存后重新进入相关页面确认设置生效。'] },
      { id: 'team', title: '成员与权限', summary: '邀请成员、设置角色并控制菜单和操作权限。', steps: ['创建角色并勾选所需菜单、页面和功能权限。', '添加成员并分配合适角色。', '成员重新登录后，确认可见菜单和可执行操作符合预期。'], tips: ['遵循最小权限原则；使用手册页面对所有已登录商户成员开放，不受功能权限控制。'] },
    ],
  },
];

const topicIcon: Record<string, React.FC<{ className?: string }>> = {
  'product-categories': Tags, 'sales-orders': ShoppingCart, 'sales-shipments': PackageCheck, customers: ContactRound,
  'purchase-orders': ClipboardList, 'purchase-receipts': Truck, suppliers: Building2, 'inventory-stocks': Boxes,
  'inventory-counts': ClipboardCheck, 'inventory-transfers': ArrowLeftRight, warehouses: Warehouse,
  'storefront-leads': MessageSquareText, 'storefront-products': Package, 'site-design': LayoutTemplate,
  translations: Languages, 'site-settings': Settings, 'release-history': History, receipts: CircleDollarSign,
  payments: HandCoins, 'finance-statistics': BarChart3, 'system-settings': Settings, team: Users,
};

const HelpPage: React.FC = () => {
  const allTopics = useMemo(() => MANUAL_GROUPS.flatMap(group => group.topics), []);
  const initialHash = window.location.hash.slice(1);
  const [activeId, setActiveId] = useState(allTopics.some(topic => topic.id === initialHash) ? initialHash : allTopics[0].id);

  useEffect(() => {
    if (!initialHash) return;
    requestAnimationFrame(() => document.getElementById(initialHash)?.scrollIntoView({ block: 'start' }));
  }, [initialHash]);

  const openTopic = (id: string) => {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto max-w-[1440px]">
      <header className="mb-5 rounded-2xl bg-gradient-to-r from-primary/12 via-primary/5 to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white"><BookOpen className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-bold text-foreground">使用手册</h1><p className="mt-1 text-sm text-muted-foreground">迈犀沃 ERP 与独立站平台简易操作指南</p></div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-190px)] gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">手册目录</div>
          <nav aria-label="使用手册目录" className="max-h-[calc(100vh-230px)] overflow-y-auto p-2">
            {MANUAL_GROUPS.map(group => {
              const GroupIcon = group.icon;
              return <div key={group.id} className="mb-3 last:mb-0"><div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground"><GroupIcon className="h-3.5 w-3.5" />{group.title}</div>{group.topics.map(topic => <button key={topic.id} type="button" onClick={() => openTopic(topic.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeId === topic.id ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-secondary'}`}><span className="min-w-0 flex-1 truncate">{topic.title}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" /></button>)}</div>;
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          {MANUAL_GROUPS.map(group => <section key={group.id} aria-labelledby={`${group.id}-title`} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="border-b border-border bg-secondary/25 px-5 py-4"><h2 id={`${group.id}-title`} className="text-base font-bold">{group.title}</h2></div><div className="divide-y divide-border">{group.topics.map(topic => { const TopicIcon = topicIcon[topic.id] || group.icon; return <article id={topic.id} key={topic.id} className="scroll-mt-6 px-5 py-5"><div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><TopicIcon className="h-4 w-4" /></span><div className="min-w-0"><h3 className="text-[15px] font-semibold">{topic.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.summary}</p></div></div><div className="mt-4 rounded-xl bg-secondary/30 p-4"><div className="mb-2 text-xs font-semibold text-foreground">操作步骤</div><ol className="space-y-2">{topic.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-foreground/80"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span><span>{step}</span></li>)}</ol></div>{topic.tips?.length ? <div className="mt-3 space-y-1.5">{topic.tips.map(tip => <p key={tip} className="flex gap-2 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /><span>{tip}</span></p>)}</div> : null}</article>; })}</div></section>)}
        </main>
      </div>
    </div>
  );
};

export default HelpPage;
