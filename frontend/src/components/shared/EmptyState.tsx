import type { ReactNode } from 'react';
import { Empty } from 'antd';

type EmptyStateProps = {
  description?: ReactNode;
  className?: string;
};

export const EmptyState = ({ description = '暂无数据', className = '' }: EmptyStateProps) => (
  <div className={`flex min-h-40 items-center justify-center px-4 py-8 ${className}`} role="status">
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
  </div>
);
