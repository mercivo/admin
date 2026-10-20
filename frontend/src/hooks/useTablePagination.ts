import { useCallback, useEffect, useState } from "react";
import type { TablePaginationConfig } from "antd";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

type PaginationState = {
  scopeKey?: string;
  current: number;
  pageSize: number;
  total: number;
};

export const useTablePagination = (scopeKey?: string) => {
  const [state, setState] = useState<PaginationState>({
    scopeKey,
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const scopeChanged = state.scopeKey !== scopeKey;
  const current = scopeChanged ? 1 : state.current;
  const pageSize = state.pageSize;
  const total = scopeChanged ? 0 : state.total;

  useEffect(() => {
    if (!scopeChanged) return;
    setState(value => ({ ...value, scopeKey, current: 1, total: 0 }));
  }, [scopeChanged, scopeKey]);

  const onChange = useCallback((page: number, size: number) => {
    setState(value => ({
      ...value,
      scopeKey,
      current: size === value.pageSize ? page : 1,
      pageSize: size,
    }));
  }, [scopeKey]);
  const reset = useCallback(() => {
    setState(value => ({ ...value, scopeKey, current: 1 }));
  }, [scopeKey]);
  const setTotal = useCallback((nextTotal: number) => {
    setState(value => ({ ...value, scopeKey, total: nextTotal }));
  }, [scopeKey]);
  const reconcile = useCallback((nextTotal: number) => {
    setState(value => ({
      ...value,
      scopeKey,
      total: nextTotal,
      current: Math.min(value.scopeKey === scopeKey ? value.current : 1, Math.max(1, Math.ceil(nextTotal / value.pageSize))),
    }));
  }, [scopeKey]);
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
