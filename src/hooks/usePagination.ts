// ============================================
// usePagination - 分页 Hook
// ============================================

'use client';

import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  size: number;
}

interface UsePaginationResult {
  page: number;
  size: number;
  pagination: PaginationState;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  reset: () => void;
}

export function usePagination(defaultPage = 1, defaultSize = 10): UsePaginationResult {
  const [page, setPageState] = useState(defaultPage);
  const [size, setSizeState] = useState(defaultSize);

  const setPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPageState(newPage);
    }
  }, []);

  const setSize = useCallback((newSize: number) => {
    if (newSize >= 1) {
      setSizeState(newSize);
      setPageState(1); // 重置到第一页
    }
  }, []);

  const reset = useCallback(() => {
    setPageState(defaultPage);
    setSizeState(defaultSize);
  }, [defaultPage, defaultSize]);

  return {
    page,
    size,
    pagination: { page, size },
    setPage,
    setSize,
    reset,
  };
}
