'use client';
import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@/components/design';
import { api } from '@/lib/api/client';

interface LoginHistoryItem { ipAddress?: string; createdAt: string; success: boolean }
interface LoginHistoryModalProps { isOpen: boolean; onClose: () => void; username?: string }

export default function LoginHistoryModal({ isOpen, onClose, username }: LoginHistoryModalProps) {
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isOpen && username) loadHistory(); }, [isOpen, username]);

  const loadHistory = async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.get<LoginHistoryItem[]>('/api/v1/users/login-history');
      if (data.code === 200) setHistory(data.data || []);
      else setError(data.message || '加载失败');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="登录历史"
      maxWidth="672px"
      footer={<Button variant="secondary" onClick={onClose}>关闭</Button>}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-8 text-[var(--ds-text-secondary)]">
          <div className="w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin" /><p className="text-sm">加载中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-[var(--ds-danger-default)]">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadHistory}>重试</Button>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-[var(--ds-text-secondary)]"><p className="text-sm">暂无登录记录</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--ds-border-default)] text-[var(--ds-text-secondary)]"><th className="text-left py-2 px-2">IP地址</th><th className="text-left py-2 px-2">时间</th><th className="text-left py-2 px-2">状态</th></tr></thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={idx} className="border-b border-[var(--ds-border-muted)] last:border-b-0">
                  <td className="py-2 px-2 text-[var(--ds-text-primary)]">{item.ipAddress || '未知'}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="py-2 px-2"><span className={`text-xs px-2 py-0.5 rounded-full ${item.success ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' : 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'}`}>{item.success ? '成功' : '失败'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
