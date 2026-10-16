import React from 'react';
import { Tag } from 'antd';

export const salesOrderStatusMap: Record<string, { color: string; label: string }> = {
  confirmed: { color: 'blue', label: '待出库' },
  partially_shipped: { color: 'orange', label: '部分出库' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
  shipped: { color: 'green', label: '已出库' },
};

export const SalesOrderStatusTag: React.FC<{ status: string }> = ({ status }) => {
  const config = salesOrderStatusMap[status];
  return <Tag color={config?.color}>{config?.label || status || '-'}</Tag>;
};
