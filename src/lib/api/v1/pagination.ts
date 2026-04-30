/**
 * API v1 分页工具
 */

import { PaginationMeta } from './response';

// ============================================================
// 分页参数接口
// ============================================================

export interface PaginationParams {
  page: number;
  size: number;
  skip: number;
}

export interface ParsedPagination {
  page: number;
  size: number;
  skip: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

// ============================================================
// 分页参数解析
// ============================================================

/**
 * 从 URLSearchParams 解析分页参数
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; size?: number } = {}
): ParsedPagination {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(defaults.page ?? 1), 10));
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') ?? String(defaults.size ?? 20), 10)));
  const skip = (page - 1) * size;
  const orderBy = searchParams.get('orderBy') || undefined;
  const orderDir = (searchParams.get('orderDir') as 'asc' | 'desc') || 'desc';

  return { page, size, skip, orderBy, orderDir };
}

/**
 * 构建分页元数据
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  size: number
): PaginationMeta {
  return {
    page,
    size,
    total,
    totalPages: Math.ceil(total / size),
  };
}

/**
 * 计算分页偏移量
 */
export function calculateSkip(page: number, size: number): number {
  return (Math.max(1, page) - 1) * Math.min(100, Math.max(1, size));
}

// ============================================================
// 游标分页工具 (用于实时/流式数据)
// ============================================================

export interface CursorPagination {
  cursor?: string;
  limit: number;
}

/**
 * 解析游标分页参数
 */
export function parseCursorPagination(
  searchParams: URLSearchParams,
  defaults: { limit?: number } = {}
): CursorPagination {
  return {
    cursor: searchParams.get('cursor') || undefined,
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? String(defaults.limit ?? 20), 10))),
  };
}
