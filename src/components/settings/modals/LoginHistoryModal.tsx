// Login History Modal Component
// 登录历史模态框

'use client';

import React, { useState, useEffect } from 'react';

interface LoginHistoryItem {
  ipAddress?: string;
  createdAt: string;
  success: boolean;
}

interface LoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export default function LoginHistoryModal({ isOpen, onClose, username }: LoginHistoryModalProps) {
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载登录历史
  useEffect(() => {
    if (isOpen && username) {
      loadHistory();
    }
  }, [isOpen, username]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`/api/v1/users/${username}/login-history`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) {
        setHistory(data.data || []);
      } else {
        setError(data.message || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">登录历史</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <span className="loading-spinner"></span>
              <p>加载中...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="text-danger">{error}</p>
              <button className="btn btn-secondary" onClick={loadHistory}>重试</button>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>暂无登录记录</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-info">
                    <div className="history-main">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="history-ip">{item.ipAddress || '未知IP'}</span>
                    </div>
                    <span className="history-time">
                      {new Date(item.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className={`status-badge ${item.success ? 'success' : 'failed'}`}>
                    {item.success ? '成功' : '失败'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-primary);
          border-radius: 8px;
          width: 100%;
          max-width: 480px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .modal-lg {
          max-width: 600px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .modal-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .loading-state,
        .empty-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--color-text-secondary);
        }
        .empty-state svg {
          margin-bottom: 12px;
          opacity: 0.5;
        }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-color);
          border-top-color: var(--accent-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 6px;
        }
        .history-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .history-main {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .history-main svg {
          color: var(--color-text-secondary);
        }
        .history-ip {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
        }
        .history-time {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-left: 24px;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .status-badge.failed {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .text-danger {
          color: var(--color-error);
          font-size: 14px;
          margin-bottom: 12px;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--color-text);
          border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
          background: var(--hover-bg);
        }
        .btn-ghost {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
        }
        .btn-ghost:hover {
          color: var(--color-text);
        }
        .btn-sm {
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
}
