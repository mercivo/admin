import React, { type Key, type ReactNode } from "react";
import { Empty, Table } from "antd";
import type { TableProps } from "antd";
import { Plus } from "lucide-react";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../hooks/useTablePagination";

export const AppTable = <RecordType extends object>({
  className = "",
  locale,
  pagination,
  ...props
}: TableProps<RecordType>) => {
  const normalizedPagination = pagination === false ? false : {
    pageSize: DEFAULT_PAGE_SIZE,
    size: "small" as const,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
    showTotal: (total: number) => `共 ${total} 条`,
    ...pagination,
  };
  return (
  <Table<RecordType>
    {...props}
    className={`app-data-table ${className}`.trim()}
    pagination={normalizedPagination}
    locale={{
      emptyText: (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
      ),
      ...locale,
    }}
  />
  );
};

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
export const AppEditableTable = <RecordType,>({
  columns,
  dataSource,
  rowKey,
  renderRow,
  emptyText = "暂无数据",
  className = "",
}: AppEditableTableProps<RecordType>) => {
  const getKey = (record: RecordType, index: number): Key =>
    typeof rowKey === "function"
      ? rowKey(record, index)
      : String(record[rowKey]);
  return (
    <div className={`app-editable-table ${className}`.trim()}>
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`${column.className || ""} ${String(column.title).includes("商品/规格") ? "app-product-spec-column" : ""}`.trim()}
                style={{ width: column.width || (String(column.title).includes("商品/规格") ? 360 : undefined) }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.length > 0 ? (
            dataSource.map((record, index) => (
              <tr key={getKey(record, index)}>
                {renderRow(record, index).map((cell, cellIndex) => (
                  <td key={cellIndex} className={`${columns[cellIndex]?.className || ""} ${String(columns[cellIndex]?.title).includes("商品/规格") ? "app-product-spec-column" : ""}`.trim()}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={emptyText}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

interface TableAddRowButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Full-width add-row action shared by editable business tables. */
export const TableAddRowButton: React.FC<TableAddRowButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/[0.02] text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
  >
    <Plus size={15} />
    {children}
  </button>
);
