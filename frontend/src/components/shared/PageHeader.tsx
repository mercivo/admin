import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => (
  <header className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-3 [&_button]:h-9 [&_button]:py-0">{action}</div>}
  </header>
);
