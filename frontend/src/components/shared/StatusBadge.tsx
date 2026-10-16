import React from 'react';
import { Tag } from 'antd';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  published: { color: 'green', label: '已同步' },
  pending: { color: 'gold', label: '未同步' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
};

export default StatusBadge;
