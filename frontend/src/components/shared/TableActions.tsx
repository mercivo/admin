import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ColumnType } from 'antd/es/table';

interface ActionColumnOptions<RecordType> {
  render: NonNullable<ColumnType<RecordType>['render']>;
  /** 单行可能出现的最大操作按钮数，用于按业务操作自适应列宽。 */
  actions?: number;
  /** @deprecated 请使用 actions 或 minWidth。 */
  width?: number;
  minWidth?: number;
}

export const createActionColumn = <RecordType,>({ render, actions = 1, width, minWidth }: ActionColumnOptions<RecordType>): ColumnType<RecordType> => {
  // 30px icon button + 4px gap; reserve balanced padding so a single action is not cramped.
  const contentWidth = 72 + Math.max(0, actions - 1) * 34;
  const resolvedMinWidth = minWidth ?? width ?? contentWidth;
  return {
    title: '操作',
    key: 'actions',
    width: resolvedMinWidth,
    minWidth: resolvedMinWidth,
    fixed: 'right',
    align: 'center',
    className: 'app-table-action-column',
    onCell: () => ({ style: { minWidth: resolvedMinWidth } }),
    onHeaderCell: () => ({ className: 'app-table-action-column', style: { minWidth: resolvedMinWidth } }),
    render,
  };
};

export const TableActions = ({ children }: { children: ReactNode }) => (
  <div className="app-table-actions">{children}</div>
);

type TableActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'aria-label'> & {
  title: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
};

/** Icon-only table action. The required native title provides the hover label. */
export const TableActionButton = ({ title, tone = 'default', className = '', children, type = 'button', ...props }: TableActionButtonProps) => (
  <button {...props} type={type} title={title} aria-label={title} className={`app-table-action-button app-table-action-button-${tone} ${className}`.trim()}>
    {children}
  </button>
);
