import React, { type Key, type ReactNode } from 'react';
import { Empty, Table } from 'antd';
import type { TableProps } from 'antd';

export const AppTable = <RecordType extends object>({ className = '', locale, ...props }: TableProps<RecordType>) => (
  <Table<RecordType>
    {...props}
    className={`app-data-table ${className}`.trim()}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />, ...locale }}
  />
);

export interface EditableTableColumn {
  title: ReactNode;
  width?: number | string;
  className?: string;
}

interface AppEditableTableProps<RecordType> {
  columns: EditableTableColumn[];
  dataSource: RecordType[];
  rowKey: keyof RecordType | ((record: RecordType, index: number) => Key);
  renderRow: (record: RecordType, index: number) => ReactNode[];
  emptyText?: string;
  className?: string;
}

/** Editable table shell shared by modal line-item editors and product specification editors. */
export const AppEditableTable = <RecordType,>({ columns, dataSource, rowKey, renderRow, emptyText = '暂无数据', className = '' }: AppEditableTableProps<RecordType>) => {
  const getKey = (record: RecordType, index: number): Key => typeof rowKey === 'function' ? rowKey(record, index) : String(record[rowKey]);
  return <div className={`app-editable-table ${className}`.trim()}>
    <table>
      <thead><tr>{columns.map((column, index) => <th key={index} className={column.className} style={{ width: column.width }}>{column.title}</th>)}</tr></thead>
      <tbody>
        {dataSource.length > 0 ? dataSource.map((record, index) => <tr key={getKey(record, index)}>{renderRow(record, index).map((cell, cellIndex) => <td key={cellIndex} className={columns[cellIndex]?.className}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /></td></tr>}
      </tbody>
    </table>
  </div>;
};
