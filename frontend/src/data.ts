/** 30天流量数据 - 图表用 */
export const TRAFFIC_DATA = [
  { day: '6/13', visitors: 1800, leads: 24, aiChats: 78 },
  { day: '6/14', visitors: 2100, leads: 28, aiChats: 92 },
  { day: '6/15', visitors: 1950, leads: 26, aiChats: 85 },
  { day: '6/16', visitors: 2300, leads: 32, aiChats: 105 },
  { day: '6/17', visitors: 2200, leads: 30, aiChats: 98 },
  { day: '6/18', visitors: 2500, leads: 35, aiChats: 120 },
  { day: '6/19', visitors: 2400, leads: 33, aiChats: 110 },
  { day: '6/20', visitors: 2600, leads: 36, aiChats: 130 },
  { day: '6/21', visitors: 2800, leads: 40, aiChats: 145 },
  { day: '6/22', visitors: 2700, leads: 38, aiChats: 135 },
  { day: '6/23', visitors: 2900, leads: 42, aiChats: 155 },
  { day: '6/24', visitors: 3000, leads: 45, aiChats: 160 },
  { day: '6/25', visitors: 2850, leads: 41, aiChats: 148 },
  { day: '6/26', visitors: 3100, leads: 48, aiChats: 170 },
  { day: '6/27', visitors: 3200, leads: 50, aiChats: 180 },
  { day: '6/28', visitors: 3050, leads: 46, aiChats: 165 },
  { day: '6/29', visitors: 3300, leads: 52, aiChats: 190 },
  { day: '6/30', visitors: 3150, leads: 47, aiChats: 172 },
  { day: '7/1', visitors: 3400, leads: 55, aiChats: 200 },
  { day: '7/2', visitors: 3250, leads: 50, aiChats: 185 },
  { day: '7/3', visitors: 3500, leads: 58, aiChats: 210 },
  { day: '7/4', visitors: 3350, leads: 52, aiChats: 195 },
  { day: '7/5', visitors: 3600, leads: 60, aiChats: 220 },
  { day: '7/6', visitors: 3450, leads: 54, aiChats: 200 },
  { day: '7/7', visitors: 3700, leads: 62, aiChats: 230 },
  { day: '7/8', visitors: 3550, leads: 56, aiChats: 210 },
  { day: '7/9', visitors: 3800, leads: 65, aiChats: 240 },
  { day: '7/10', visitors: 3650, leads: 58, aiChats: 215 },
  { day: '7/11', visitors: 2847, leads: 38, aiChats: 156 },
  { day: '7/12', visitors: 2900, leads: 42, aiChats: 160 },
];

/** 活动动态 */
export const ACTIVITIES = [
  { icon: 'MessageCircle', text: 'Sarah Johnson 通过AI助手发起询盘', time: '2分钟前', color: 'bg-violet-100' },
  { icon: 'CheckCircle', text: 'Yuki Tanaka 签订棉质手提袋合同 ¥12,000', time: '1小时前', color: 'bg-emerald-100' },
  { icon: 'AlertTriangle', text: '抽绳袋库存降至预警线以下', time: '2小时前', color: 'bg-amber-100' },
  { icon: 'Eye', text: 'Emma Clarke 查看了帆布包产品详情', time: '3小时前', color: 'bg-violet-100' },
  { icon: 'TrendingUp', text: '独立站今日访客突破 3,000 人次', time: '5小时前', color: 'bg-rose-100' },
];

/** 生成 sparkline 数据 */
export const seededSpark = (seed: number, count: number) => {
  let x = Math.sin(seed * 1000) * 100;
  return Array.from({ length: count }, () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return { v: (x % 80) + 20 };
  });
};

/** AI 智能体周报数据 */
export const AGENT_WEEKLY = [
  { day: 'Mon', conversations: 45, leads: 12 },
  { day: 'Tue', conversations: 52, leads: 15 },
  { day: 'Wed', conversations: 48, leads: 13 },
  { day: 'Thu', conversations: 60, leads: 18 },
  { day: 'Fri', conversations: 55, leads: 16 },
  { day: 'Sat', conversations: 38, leads: 10 },
  { day: 'Sun', conversations: 42, leads: 11 },
];