'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: { username: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // 使用 credentials: 'include' 让浏览器自动携带 HttpOnly cookie
      // 无需手动读取 token，服务端 getAuthUser 会从 cookie 提取
      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Check auth failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (account: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();

      if (data.code === 200) {
        // HttpOnly cookies 由浏览器自动设置，只需验证会话
        await checkAuth();
        return { success: true, message: '登录成功' };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (error) {
      return { success: false, message: '登录失败，请稍后重试' };
    }
  }, [checkAuth]);

  const register = useCallback(async (data: { username: string; email: string; password: string }) => {
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.code === 200) {
        // 注册成功后验证会话（如果后端自动签发 cookie）
        await checkAuth();
        return { success: true, message: '注册成功，请登录' };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: '注册失败，请稍后重试' };
    }
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      // HttpOnly cookies 由服务端清除，前端只需重置状态
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, ...updates };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
