// System Settings Admin Tab
// 系统设置管理标签页

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminSystemSettingsEnhanced from './AdminSystemSettingsEnhanced';
import { api } from '@/lib/api/client';

export default function AdminSystemSettingsTab() {
  const [config, setConfig] = useState<Record<string, { value: string | number | boolean; description?: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, { value: string | number | boolean; description?: string }>>('/api/v1/admin/config');
      if (res.code === 200) {
        setConfig(res.data);
      } else {
        setError(res.message || '加载配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存配置
  const handleSave = async (requestData: Record<string, { value: string | number | boolean; description?: string }>) => {
    const res = await api.put<{ message?: string }>('/api/v1/admin/config', requestData);
    if (res.code !== 200) {
      throw new Error(res.message || '保存失败');
    }
    // 保存成功后刷新配置
    await loadConfig();
  };

  // 初始加载
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return (
    <AdminSystemSettingsEnhanced
      config={config as Parameters<typeof AdminSystemSettingsEnhanced>[0]['config']}
      loading={loading}
      error={error}
      onSave={handleSave}
      onRefresh={loadConfig}
    />
  );
}
