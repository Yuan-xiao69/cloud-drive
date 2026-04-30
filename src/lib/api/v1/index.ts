/**
 * API v1 模块入口
 * 统一导出所有 v1 API 相关类型和工具
 */

// 版本信息
export const API_VERSION = '1.0.0';
export const API_VERSION_NAME = 'v1';
export const API_DESCRIPTION = '平台 API v1 版本';

// 导出错误码相关
export {
  ErrorCodes,
  ErrorMessages,
  HttpStatusMap,
  type ErrorCode,
  type ApiError,
  type ApiErrorDetail,
} from './errors';

// 导出响应工具
export {
  API_VERSION_HEADER,
  REQUEST_ID_HEADER,
  success,
  created,
  noContent,
  deleted,
  paginated,
  error,
  validationError,
  errors,
  handlePrismaError,
  getRequestId,
  type PaginationMeta,
} from './response';

// 导出分页工具
export {
  parsePagination,
  buildPaginationMeta,
  calculateSkip,
  parseCursorPagination,
  type PaginationParams,
  type ParsedPagination,
  type CursorPagination,
} from './pagination';
