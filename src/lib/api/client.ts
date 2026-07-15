// =========================================
// API Client & Token Manager
// 客户端 API 和 Token 管理
// =========================================

// Token Manager - 管理客户端 Token 存储
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // 从 cookie 初始化（access_token 是非 HttpOnly）
    this.initFromCookie();
  }

  private initFromCookie(): void {
    if (typeof document === 'undefined') return;
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=');
      acc[key] = valueParts.join('=');
      return acc;
    }, {} as Record<string, string>);
    this.accessToken = cookies['access_token'] || null;
    this.refreshToken = cookies['refresh_token'] || null;
  }

  getAccessToken(): string | null {
    // 如果内存中没有，从 cookie 重新读取
    if (!this.accessToken && typeof document !== 'undefined') {
      this.initFromCookie();
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (!this.refreshToken && typeof document !== 'undefined') {
      this.initFromCookie();
    }
    return this.refreshToken;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// 导出单例
export const tokenManager = new TokenManager();

// API Response 类型（对齐 V1 服务端响应格式）
// 服务端返回: { code, message, data, meta: { version, timestamp, requestId } }
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  meta?: {
    version: string;
    timestamp: string;
    requestId: string;
  };
}

// 分页响应（对齐 V1 paginated() 函数格式）
// 服务端返回: { code: 200, message, data: { items, pagination: { page, size, total, totalPages } }, meta }
export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      size: number;
      total: number;
      totalPages: number;
    };
  };
  meta?: {
    version: string;
    timestamp: string;
    requestId: string;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseErrorBody(res: Response): Promise<{ message?: string; code?: string }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// API Client 类
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // 认证通过 HttpOnly cookie 自动携带（同源 fetch），无需手动添加 Authorization header
  // Content-Type 仅对 JSON body 设置；FormData 由浏览器自动设置 multipart/form-data boundary

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
  ): Promise<ApiResponse<T>> {
    const isFormData = data instanceof FormData;
    const headers: HeadersInit = {};
    if (!isFormData && data !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const body = isFormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);

    const res = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers,
      body,
      credentials: 'include',
    });
    if (!res.ok) {
      const errBody = await parseErrorBody(res);
      throw new ApiError(res.status, errBody.message || errBody.code || '请求失败', errBody.code);
    }
    return res.json();
  }

  async get<T>(url: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<T>('GET', `${url}${queryString}`);
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data);
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data);
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }
}

// 导出单例
export const api = new ApiClient();

// 按模块导出实例
export const adminApi = new ApiClient();
export const userApi = new ApiClient();
export const repoApi = new ApiClient();
export const discussionApi = new ApiClient();
export const notificationApi = new ApiClient();
export const searchApi = new ApiClient();
