import React from 'react';
import { Tag } from 'antd';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  published: { color: 'green', label: '已发布' },
  draft: { color: 'default', label: '草稿' },
  new: { color: 'purple', label: '新线索' },
  contacted: { color: 'gold', label: '已联系' },
  converted: { color: 'green', label: '已转化' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
};

export default StatusBadge;