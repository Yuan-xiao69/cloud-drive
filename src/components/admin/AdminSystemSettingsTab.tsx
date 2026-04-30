// System Settings Admin Tab
// 系统设置管理标签页

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminSystemSettingsEnhanced from './AdminSystemSettingsEnhanced';
import { tokenManager } from '@/lib/api/client';

export default function AdminSystemSettingsTab() {
  const [config, setConfig] = useState<Record<string, { value: string | number | boolean; description?: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch('/api/v1/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.code === 200) {
        setConfig(data.data);
      } else {
        setError(data.message || '加载配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存配置
  const handleSave = async (requestData: Record<string, { value: string | number | boolean; description?: string }>) => {
    const token = tokenManager.getAccessToken();
    const response = await fetch('/api/v1/admin/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });
    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(data.message || '保存失败');
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
