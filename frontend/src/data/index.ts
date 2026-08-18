import type { Product, Lead, ChatMsg, Agent, DictType } from '../types';

export const TRAFFIC_DATA = [
  { day: '周一', visitors: 2100, leads: 28, aiChats: 82 },
  { day: '周二', visitors: 1850, leads: 22, aiChats: 71 },
  { day: '周三', visitors: 2640, leads: 35, aiChats: 104 },
  { day: '周四', visitors: 2200, leads: 31, aiChats: 97 },
  { day: '周五', visitors: 2847, leads: 38, aiChats: 156 },
  { day: '周六', visitors: 1950, leads: 24, aiChats: 88 },
  { day: '周日', visitors: 1650, leads: 19, aiChats: 63 },
];

export const TOP_PRODUCTS = [
  { name: 'Eco Shopping Bag', views: 1240, inquiries: 38, rate: 92 },
  { name: 'Cotton Tote Bag', views: 980, inquiries: 29, rate: 78 },
  { name: 'Canvas Tote Bag', views: 760, inquiries: 21, rate: 65 },
  { name: 'Drawstring Bag', views: 540, inquiries: 14, rate: 48 },
];

export const ACTIVITIES = [
  { text: 'Sarah Johnson 通过AI助手发起询盘', time: '2分钟前', color: 'bg-violet-100', icon: 'MessageCircle' },
  { text: 'Yuki Tanaka 签订棉质手提包合同 ¥12,000', time: '1小时前', color: 'bg-emerald-100', icon: 'CheckCircle' },
  { text: '抽绳袋库存降至预警线以下', time: '2小时前', color: 'bg-amber-100', icon: 'AlertTriangle' },
  { text: 'Emma Clarke 查看了帆布包产品详情', time: '3小时前', color: 'bg-violet-100', icon: 'Eye' },
  { text: '独立站今日访客突破 3,000 人次', time: '5小时前', color: 'bg-rose-100', icon: 'TrendingUp' },
];

export const seededSpark = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    v: Math.max(3, n * 0.05 + Math.sin(i * seed) * n * 0.04 + Math.cos(i) * n * 0.02),
  }));

export const PRODUCTS_DATA: Product[] = [
  { id: 1, nameZh: '环保购物袋', nameEn: 'Eco Shopping Bag', sku: 'ECO-001', price: '$0.80–$1.20', stock: 50000, moq: 500, status: 'published', category: 'eco', img: 'photo-1542601906990-b4d3fb778b09', hot: true },
  { id: 2, nameZh: '棉质手提包', nameEn: 'Cotton Tote Bag', sku: 'TOT-002', price: '$1.20–$2.00', stock: 30000, moq: 300, status: 'published', category: 'tote', img: 'photo-1553062407-98eeb64c6a62', hot: false },
  { id: 3, nameZh: '抽绳袋', nameEn: 'Drawstring Bag', sku: 'DRW-003', price: '$0.50–$0.80', stock: 800, moq: 1000, status: 'draft', category: 'drawstring', img: 'photo-1584917865442-de89df76afd3', hot: false },
  { id: 4, nameZh: '帆布包', nameEn: 'Canvas Tote Bag', sku: 'CVS-004', price: '$1.50–$2.50', stock: 20000, moq: 200, status: 'published', category: 'tote', img: 'photo-1491637639811-60e2756cc1c7', hot: true },
  { id: 5, nameZh: '无纺布袋', nameEn: 'Non-woven Bag', sku: 'NWB-005', price: '$0.30–$0.60', stock: 100000, moq: 2000, status: 'published', category: 'eco', img: 'photo-1593642632559-0c6d3fc62b89', hot: false },
  { id: 6, nameZh: '可重复使用购物袋', nameEn: 'Reusable Grocery Bag', sku: 'RGB-006', price: '$0.90–$1.50', stock: 45000, moq: 500, status: 'published', category: 'eco', img: 'photo-1547949003-9792a18a2601', hot: true },
];

export const LEADS_DATA: Lead[] = [
  { id: 1, name: 'Sarah Johnson', company: 'GreenLife Co.', email: 'sarah@greenlife.com', phone: '+1 555-0192', country: 'USA', product: 'Eco Bags', summary: '询问环保袋MOQ，有500个采购需求，希望了解定制印刷方案', time: '2026-07-08 09:15', status: 'new', score: 85, tag: '高意向' },
  { id: 2, name: 'Marco Rossi', company: 'EcoShop Italy', email: 'marco@ecoshop.it', phone: '+39 06 1234567', country: 'Italy', product: 'Tote Bags', summary: '要求报价单，已提供公司邮箱，询问印刷定制及交货时间', time: '2026-07-08 08:42', status: 'contacted', score: 72, tag: '跟进中' },
  { id: 3, name: 'Yuki Tanaka', company: 'NaturalJP', email: 'yuki@naturaljp.co', phone: '+81 3-1234-5678', country: 'Japan', product: 'Cotton Bags', summary: '已签订购买合同，首批1000个棉质手提包，预付30%货款', time: '2026-07-07 16:30', status: 'converted', score: 98, tag: '已成交' },
  { id: 4, name: 'Emma Clarke', company: 'SustainUK', email: 'emma@sustainuk.co', phone: '+44 20 1234 5678', country: 'UK', product: 'Drawstring Bags', summary: '对抽绳袋感兴趣，询问环保认证情况及材料来源', time: '2026-07-07 14:20', status: 'new', score: 61, tag: '待跟进' },
  { id: 5, name: 'Carlos Mendez', company: 'EcoMex', email: 'carlos@ecomex.mx', phone: '+52 55 1234 5678', country: 'Mexico', product: 'Eco Bags', summary: '了解产品后要求安排视频通话演示，已预约下周三', time: '2026-07-07 11:05', status: 'contacted', score: 79, tag: '高意向' },
  { id: 6, name: 'Annika Johansson', company: 'GreenSweden AB', email: 'annika@greensweden.se', phone: '+46 8 1234567', country: 'Sweden', product: 'Canvas Bags', summary: '大客户，年需求量10万件，要求样品和详细报价', time: '2026-07-06 09:00', status: 'new', score: 94, tag: '大客户' },
];

export const TESTIMONIALS = [
  { name: 'Sarah Johnson', company: 'GreenLife Co., USA', text: 'Exceptional quality and reliable lead times. We\'ve been ordering from EcoBags for 3 years and the consistency is unmatched.', rating: 5, img: 'photo-1494790108377-be9c29b29330', orders: '12,000 pcs/year' },
  { name: 'Marco Rossi', company: 'EcoShop Italy, IT', text: 'The custom printing quality exceeded our expectations. Our customers love the branded bags. Highly recommend!', rating: 5, img: 'photo-1500648767791-00dcc994a43e', orders: '5,000 pcs/order' },
  { name: 'Yuki Tanaka', company: 'NaturalJP, Japan', text: 'Fast response, professional team. The eco-certification documentation helped us meet Japan\'s strict import requirements.', rating: 5, img: 'photo-1438761681033-6461ffad8d80', orders: '8,000 pcs/year' },
];

export const REVIEWS = [
  { author: 'Marco R.', country: 'Italy', rating: 5, date: 'Jun 2026', text: 'Excellent quality bags, exactly as described. Custom logo printing was sharp and durable. Will reorder.' },
  { author: 'Sarah J.', country: 'USA', rating: 5, date: 'May 2026', text: 'Fast shipping to the US, great packaging. The eco-friendly material feels premium. Our customers love them.' },
  { author: 'Thomas K.', country: 'Germany', rating: 4, date: 'Apr 2026', text: 'Good quality overall. Minor color variation between batches but team resolved it quickly with a partial replacement.' },
  { author: 'Priya M.', country: 'India', rating: 5, date: 'Mar 2026', text: 'Best eco bag supplier we\'ve found. Responsive sales team, competitive pricing, and zero defects in our first order.' },
];

export const RELATED_PRODUCTS = [
  { img: 'photo-1553062407-98eeb64c6a62', name: 'Cotton Tote Bag', price: '$1.20–$2.00', moq: 'MOQ 300' },
  { img: 'photo-1584917865442-de89df76afd3', name: 'Drawstring Bag', price: '$0.50–$0.80', moq: 'MOQ 1000' },
  { img: 'photo-1491637639811-60e2756cc1c7', name: 'Canvas Tote Bag', price: '$1.50–$2.50', moq: 'MOQ 200' },
  { img: 'photo-1593642632559-0c6d3fc62b89', name: 'Non-woven Bag', price: '$0.30–$0.60', moq: 'MOQ 2000' },
];

export const FRONT_PRODUCTS = [
  { img: 'photo-1542601906990-b4d3fb778b09', name: 'Eco Shopping Bag', price: '$0.80–$1.20', moq: 'MOQ 500', badge: 'Best Seller' },
  { img: 'photo-1553062407-98eeb64c6a62', name: 'Cotton Tote Bag', price: '$1.20–$2.00', moq: 'MOQ 300', badge: 'New' },
  { img: 'photo-1584917865442-de89df76afd3', name: 'Drawstring Bag', price: '$0.50–$0.80', moq: 'MOQ 1000', badge: null },
  { img: 'photo-1491637639811-60e2756cc1c7', name: 'Canvas Tote Bag', price: '$1.50–$2.50', moq: 'MOQ 200', badge: 'Premium' },
  { img: 'photo-1593642632559-0c6d3fc62b89', name: 'Non-woven Bag', price: '$0.30–$0.60', moq: 'MOQ 2000', badge: null },
  { img: 'photo-1547949003-9792a18a2601', name: 'Reusable Grocery Bag', price: '$0.90–$1.50', moq: 'MOQ 500', badge: 'Hot' },
];

export const INIT_MSGS: ChatMsg[] = [
  { id: 1, type: 'system', text: "Hi! Welcome to EcoBags. I'm Anna, your AI assistant. Are you looking for any specific products?" },
];

export const AI_REPLIES: Record<string, ChatMsg[]> = {
  moq: [
    { id: 0, type: 'ai', text: 'Great question! Our minimum order quantities are:\n• Eco Shopping Bags: 500 pcs\n• Cotton Tote Bags: 300 pcs\n• Drawstring Bags: 1,000 pcs\n\nHere\'s our bestseller:' },
    { id: 0, type: 'product', product: { name: 'Eco Shopping Bag', price: '$0.80 – $1.20 / pc', img: 'photo-1542601906990-b4d3fb778b09' } },
    { id: 0, type: 'ai', text: 'Would you like me to prepare a custom quotation? Just share your business email and quantity needed 📋' },
  ],
  quote: [
    { id: 0, type: 'ai', text: 'I\'d be happy to prepare a custom quotation! Could you share:\n1. Product type\n2. Quantity needed\n3. Delivery destination\n\nOr just leave your email below 👇' },
    { id: 0, type: 'form' },
  ],
  shipping: [
    { id: 0, type: 'ai', text: 'We ship worldwide! Estimated timelines:\n• 🚢 Sea Freight: 20–35 days (most economical)\n• ✈️ Air Freight: 5–8 days\n• 📦 Express DHL/FedEx: 3–5 days\n\nShipping cost depends on quantity & destination. Want a shipping quote?' },
  ],
  email: [
    { id: 0, type: 'confirm', text: 'Quotation sent to your email. Our sales team will follow up within 24 hours.' },
    { id: 0, type: 'ai', text: 'Is there anything else I can help you with? 😊' },
  ],
  default: [
    { id: 0, type: 'ai', text: 'Thanks for reaching out! Our eco bags are made from 100% recyclable materials with custom branding options.\n\nWhat specific product or quantity are you looking for?' },
  ],
};

export const AGENTS_DATA: Agent[] = [
  {
    id: 'inquiry', name: '询盘接待助手', desc: '自动接待全球访客询盘，支持多语言，精准识别采购意向并转为线索', status: 'active',
    model: 'GPT-4o', lang: '中/英/西/日', chats: 156, leads: 38, rate: '24.4%', satisfaction: 4.8,
    icon: 'MessageOutlined', color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'recommend', name: '产品推荐助手', desc: '根据客户需求和浏览行为，智能推荐最匹配的产品组合并展示报价', status: 'active',
    model: 'GPT-4o', lang: '中/英', chats: 89, leads: 21, rate: '23.6%', satisfaction: 4.7,
    icon: 'Package', color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    id: 'nurture', name: '线索培育助手', desc: '对已收集邮箱自动发送跟进序列邮件，促进线索向合同转化', status: 'paused',
    model: 'Claude Sonnet', lang: '中/英', chats: 42, leads: 9, rate: '21.4%', satisfaction: 4.5,
    icon: 'MailOutlined', color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    id: 'email', name: '邮件写作助手', desc: '根据客户背景和沟通历史，智能生成专业的外贸邮件草稿', status: 'draft',
    model: 'Claude Sonnet', lang: '中/英/西', chats: 0, leads: 0, rate: '—', satisfaction: 0,
    icon: 'FileTextOutlined', color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
];

export const AGENT_WEEKLY = [
  { day: '周一', chats: 82, leads: 22 },
  { day: '周二', chats: 71, leads: 18 },
  { day: '周三', chats: 104, leads: 28 },
  { day: '周四', chats: 97, leads: 25 },
  { day: '周五', chats: 156, leads: 38 },
  { day: '周六', chats: 88, leads: 20 },
  { day: '周日', chats: 63, leads: 14 },
];

export const CONV = [
  { type: 'ai', text: "Hi! Welcome to EcoBags. I'm Anna. Are you looking for specific products?" },
  { type: 'user', text: "Yes, I need eco shopping bags for my retail stores. What's the MOQ?" },
  { type: 'ai', text: 'Great! Our MOQ for Eco Shopping Bags is 500 pcs. We also offer custom logo printing. How many stores do you have?' },
  { type: 'user', text: 'About 12 stores, so I need around 500-1000 bags per store.' },
  { type: 'ai', text: 'Perfect! For 6,000-12,000 pcs we can offer better pricing. Could you share your email for a detailed quotation?' },
  { type: 'user', text: "Sure, it's sarah@greenlife.com" },
  { type: 'system', text: 'Quotation sent to sarah@greenlife.com. Our team will follow up within 24 hours.' },
];

export const DICT_DATA: DictType[] = [
  {
    id: 'product-category', label: '商品分类', icon: '📦',
    children: [
      {
        code: 'eco', label: '环保袋', sort: 1, status: 'enabled', remark: '可降解环保材质产品', children: [
          { code: 'eco-shopping', label: '购物袋', sort: 1, status: 'enabled', remark: '' },
          { code: 'eco-grocery', label: '杂货袋', sort: 2, status: 'enabled', remark: '' },
          { code: 'eco-produce', label: '蔬果袋', sort: 3, status: 'enabled', remark: '' },
        ]
      },
      {
        code: 'tote', label: '手提包', sort: 2, status: 'enabled', remark: '时尚手提类产品', children: [
          { code: 'tote-cotton', label: '棉质手提包', sort: 1, status: 'enabled', remark: '' },
          { code: 'tote-canvas', label: '帆布手提包', sort: 2, status: 'enabled', remark: '' },
          { code: 'tote-jute', label: '黄麻手提包', sort: 3, status: 'disabled', remark: '' },
        ]
      },
      {
        code: 'drawstring', label: '抽绳袋', sort: 3, status: 'enabled', remark: '抽绳收口类袋包', children: [
          { code: 'draw-sport', label: '运动抽绳袋', sort: 1, status: 'enabled', remark: '' },
          { code: 'draw-gift', label: '礼品抽绳袋', sort: 2, status: 'enabled', remark: '' },
        ]
      },
      { code: 'nonwoven', label: '无纺布袋', sort: 4, status: 'disabled', remark: '无纺布材质', children: [] },
    ],
  },
  {
    id: 'lead-status', label: '线索状态', icon: '👥',
    children: [
      {
        code: 'new', label: '新线索', sort: 1, status: 'enabled', remark: '刚进入系统的线索', children: [
          { code: 'new-ai', label: 'AI询盘', sort: 1, status: 'enabled', remark: '通过AI助手产生' },
          { code: 'new-form', label: '表单提交', sort: 2, status: 'enabled', remark: '官网表单' },
          { code: 'new-refer', label: '客户推荐', sort: 3, status: 'enabled', remark: '' },
        ]
      },
      { code: 'contacted', label: '已联系', sort: 2, status: 'enabled', remark: '已与客户取得联系', children: [] },
      { code: 'converted', label: '已转化', sort: 3, status: 'enabled', remark: '已成功转化为客户', children: [] },
      { code: 'lost', label: '已流失', sort: 4, status: 'enabled', remark: '线索已流失', children: [] },
    ],
  },
  {
    id: 'order-status', label: '订单状态', icon: '📋',
    children: [
      { code: 'pending', label: '待确认', sort: 1, status: 'enabled', remark: '', children: [] },
      {
        code: 'confirmed', label: '已确认', sort: 2, status: 'enabled', remark: '', children: [
          { code: 'confirmed-deposit', label: '已付定金', sort: 1, status: 'enabled', remark: '' },
          { code: 'confirmed-full', label: '已付全款', sort: 2, status: 'enabled', remark: '' },
        ]
      },
      {
        code: 'producing', label: '生产中', sort: 3, status: 'enabled', remark: '', children: [
          { code: 'prod-material', label: '备料中', sort: 1, status: 'enabled', remark: '' },
          { code: 'prod-making', label: '制造中', sort: 2, status: 'enabled', remark: '' },
          { code: 'prod-qc', label: '质检中', sort: 3, status: 'enabled', remark: '' },
        ]
      },
      { code: 'shipped', label: '已发货', sort: 4, status: 'enabled', remark: '', children: [] },
      { code: 'completed', label: '已完成', sort: 5, status: 'enabled', remark: '', children: [] },
    ],
  },
  {
    id: 'currency', label: '货币类型', icon: '💰',
    children: [
      { code: 'USD', label: '美元', sort: 1, status: 'enabled', remark: 'United States Dollar', children: [] },
      { code: 'EUR', label: '欧元', sort: 2, status: 'enabled', remark: 'Euro', children: [] },
      { code: 'GBP', label: '英镑', sort: 3, status: 'enabled', remark: 'British Pound', children: [] },
      { code: 'JPY', label: '日元', sort: 4, status: 'enabled', remark: 'Japanese Yen', children: [] },
      { code: 'CNY', label: '人民币', sort: 5, status: 'enabled', remark: 'Chinese Yuan', children: [] },
    ],
  },
  {
    id: 'payment-method', label: '付款方式', icon: '💳',
    children: [
      {
        code: 'tt', label: '电汇(T/T)', sort: 1, status: 'enabled', remark: 'Telegraphic Transfer', children: [
          { code: 'tt-30', label: '30%定金+70%见单', sort: 1, status: 'enabled', remark: '' },
          { code: 'tt-50', label: '50%+50%', sort: 2, status: 'enabled', remark: '' },
          { code: 'tt-100', label: '100%预付', sort: 3, status: 'enabled', remark: '' },
        ]
      },
      { code: 'lc', label: '信用证(L/C)', sort: 2, status: 'enabled', remark: 'Letter of Credit', children: [] },
      { code: 'paypal', label: 'PayPal', sort: 3, status: 'enabled', remark: '', children: [] },
      { code: 'alipay', label: '支付宝', sort: 4, status: 'disabled', remark: '仅限国内', children: [] },
    ],
  },
];