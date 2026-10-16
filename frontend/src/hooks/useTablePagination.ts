import { useCallback, useState } from "react";
import type { TablePaginationConfig } from "antd";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const useTablePagination = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const onChange = useCallback((page: number, size: number) => {
    setCurrent(size === pageSize ? page : 1);
    setPageSize(size);
  }, [pageSize]);
  const reset = useCallback(() => setCurrent(1), []);
  const reconcile = useCallback((nextTotal: number) => {
    setTotal(nextTotal);
    setCurrent(value => Math.min(value, Math.max(1, Math.ceil(nextTotal / pageSize))));
  }, [pageSize]);
  const config: TablePaginationConfig = {
    current,
    pageSize,
    total,
    size: "small",
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
    showTotal: value => `共 ${value} 条`,
    onChange,
  };
  return { current, pageSize, total, setTotal, reset, reconcile, config };
};
