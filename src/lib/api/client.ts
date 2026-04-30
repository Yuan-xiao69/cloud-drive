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

// API Response 类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
  };
}

// API Client 类
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const token = tokenManager.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get<T>(url: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    const res = await fetch(`${this.baseUrl}${url}${queryString}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    return res.json();
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${url}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    return res.json();
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${url}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return res.json();
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
