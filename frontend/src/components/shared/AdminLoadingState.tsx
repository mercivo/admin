import React from 'react';
import { Button, Result, Skeleton } from 'antd';

export type AdminSkeletonVariant = 'dashboard' | 'table' | 'form' | 'detail' | 'cards' | 'settings';

interface AdminModuleSkeletonProps {
  cards?: number;
  columns?: number;
  rows?: number;
  minHeight?: number;
  className?: string;
  testId?: string;
}

export const AdminModuleSkeleton: React.FC<AdminModuleSkeletonProps> = ({ cards = 1, columns = 1, rows = 4, minHeight = 180, className = '', testId = 'admin-module-skeleton' }) => (
  <div data-testid={testId} aria-busy="true" aria-label="内容加载中" className={`grid gap-4 ${className}`.trim()} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {Array.from({ length: cards }, (_, index) => (
      <section key={index} className="rounded-2xl border border-border bg-card p-5 shadow-sm" style={{ minHeight }}>
        <Skeleton active title={{ width: index % 2 ? '42%' : '32%' }} paragraph={{ rows }} />
      </section>
    ))}
  </div>
);

export const AdminPageSkeleton: React.FC<{ variant?: AdminSkeletonVariant; testId?: string }> = ({ variant = 'table', testId = 'admin-page-skeleton' }) => {
  if (variant === 'dashboard') return <div data-testid={testId} aria-busy="true" aria-label="页面加载中" className="space-y-5"><AdminModuleSkeleton cards={4} columns={4} rows={2} minHeight={136}/><AdminModuleSkeleton cards={6} columns={3} rows={1} minHeight={92}/><AdminModuleSkeleton cards={2} columns={2} rows={7} minHeight={360}/></div>;
  if (variant === 'form' || variant === 'settings') return <div data-testid={testId} aria-busy="true" aria-label="页面加载中" className="space-y-4"><AdminModuleSkeleton cards={2} columns={2} rows={6} minHeight={300}/><AdminModuleSkeleton rows={5} minHeight={260}/></div>;
  if (variant === 'detail') return <div data-testid={testId} aria-busy="true" aria-label="页面加载中" className="space-y-4"><AdminModuleSkeleton rows={3} minHeight={180}/><AdminModuleSkeleton cards={2} columns={2} rows={6} minHeight={320}/></div>;
  if (variant === 'cards') return <AdminModuleSkeleton testId={testId} cards={6} columns={3} rows={3} minHeight={180}/>;
  return <div data-testid={testId} aria-busy="true" aria-label="页面加载中" className="space-y-4"><section className="rounded-2xl border border-border bg-card p-5"><div className="flex gap-3"><Skeleton.Input active/><Skeleton.Input active/><Skeleton.Button active className="ml-auto"/></div></section><AdminModuleSkeleton rows={8} minHeight={420}/></div>;
};

export const AdminLoadError: React.FC<{ title?: string; description?: string; onRetry: () => void; testId?: string }> = ({ title = '内容加载失败', description = '暂时无法获取数据，请检查网络后重试。', onRetry, testId = 'admin-load-error' }) => (
  <section data-testid={testId} role="alert" className="rounded-2xl border border-border bg-card shadow-sm">
    <Result status="warning" title={title} subTitle={description} extra={<Button type="primary" onClick={onRetry}>重新加载</Button>}/>
  </section>
);
