import type { ReactNode } from 'react';
import type { ColumnType } from 'antd/es/table';

interface ActionColumnOptions<RecordType> {
  render: NonNullable<ColumnType<RecordType>['render']>;
  width?: number;
}

export const createActionColumn = <RecordType,>({ render, width = 120 }: ActionColumnOptions<RecordType>): ColumnType<RecordType> => ({
  title: '操作',
  key: 'actions',
  width,
  fixed: 'right',
  align: 'center',
  className: 'app-table-action-column',
  onHeaderCell: () => ({ className: 'app-table-action-column' }),
  render,
});

export const TableActions = ({ children }: { children: ReactNode }) => (
  <div className="app-table-actions">{children}</div>
);
