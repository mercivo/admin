import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface QuotaUsageProps {
  label: string;
  used: number;
  limit: number;
  className?: string;
  onExhaustedClick?: () => void;
}

export const QuotaUsage: React.FC<QuotaUsageProps> = ({ label, used, limit, className = '', onExhaustedClick }) => {
  const safeLimit = Math.max(0, Number(limit) || 0);
  const safeUsed = Math.max(0, Number(used) || 0);
  const exhausted = safeLimit === 0 || safeUsed >= safeLimit;
  const warning = !exhausted && safeUsed / safeLimit >= 0.8;
  const percent = safeLimit > 0 ? Math.min(100, Math.round(safeUsed / safeLimit * 100)) : 100;
  const tone = warning ? 'bg-amber-500' : 'bg-primary';
  const content = <>
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className={`shrink-0 text-xs font-semibold tabular-nums ${exhausted ? 'text-red-600' : warning ? 'text-amber-700' : 'text-foreground'}`}>{safeUsed} / {safeLimit}</span>
    {exhausted ? <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-600">已用完{onExhaustedClick && <><span className="text-red-300">·</span>去升级<ArrowUpRight size={13}/></>}</span> : <div className="ml-auto h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${percent}%` }}/></div>}
  </>;

  if (exhausted && onExhaustedClick) return <button type="button" onClick={onExhaustedClick} title="额度已用完，前往套餐账单升级" className={`flex h-9 min-w-56 items-center gap-3 whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 text-left transition hover:border-red-300 hover:bg-red-100 ${className}`}>{content}</button>;
  return <div className={`flex h-9 min-w-52 items-center gap-3 whitespace-nowrap rounded-xl border ${exhausted ? 'border-red-200 bg-red-50' : 'border-border bg-white'} px-3 ${className}`}>{content}</div>;
};
