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

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { tokenManager } = await import('@/lib/api/client');
      const token = tokenManager.getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setUser(data.code === 200 ? data.data : null);
    } catch (error) {
      console.error('Check auth failed:', error);
      setUser(null);
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
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();
      
      if (data.code === 200 && data.data) {
        const { tokenManager } = await import('@/lib/api/client');
        tokenManager.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
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
        body: JSON.stringify(data),
      });
      const result = await res.json();
      
      if (result.code === 200) {
        return { success: true, message: '注册成功，请登录' };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: '注册失败，请稍后重试' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      const { tokenManager } = await import('@/lib/api/client');
      tokenManager.clearTokens();
      setUser(null);
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
        isAuthenticated: !!user,
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
