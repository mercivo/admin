import React from 'react';
import { Tag } from 'antd';

export const leadStatusMeta = {
  new: { label: '新线索', color: 'blue' },
  following: { label: '跟进中', color: 'gold' },
  converted: { label: '已转化', color: 'green' },
  closed: { label: '已关闭', color: 'default' },
} as const;

export const LeadStatusTag = ({ status }: { status: string }) => {
  const meta = leadStatusMeta[status as keyof typeof leadStatusMeta];
  return <Tag color={meta?.color}>{meta?.label || status || '-'}</Tag>;
};
