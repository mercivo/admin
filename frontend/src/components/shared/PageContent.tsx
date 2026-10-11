import React from 'react';

interface PageContentProps {
  children: React.ReactNode;
}

export const PageContent: React.FC<PageContentProps> = ({ children }) => (
  <div className="space-y-4">{children}</div>
);
