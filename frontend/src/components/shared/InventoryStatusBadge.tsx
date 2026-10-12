import React from 'react';

const styles: Record<string, string> = {
  normal: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', out: 'bg-red-50 text-red-600',
  draft: 'bg-gray-100 text-gray-600', counting: 'bg-sky-50 text-sky-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-gray-100 text-gray-500',
  shipped: 'bg-amber-50 text-amber-700', received: 'bg-emerald-50 text-emerald-700', active: 'bg-emerald-50 text-emerald-700', disabled: 'bg-gray-100 text-gray-500',
};
const labels: Record<string, string> = { normal: '正常', warning: '预警', out: '缺货', draft: '草稿', counting: '盘点中', completed: '已完成', cancelled: '已取消', shipped: '在途', received: '已收货', active: '启用', disabled: '停用' };

export const InventoryStatusBadge: React.FC<{ status: string }> = ({ status }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] || styles.draft}`}>{labels[status] || status}</span>;
