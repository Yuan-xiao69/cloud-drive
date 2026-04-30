// Delete Account Modal Component
// 删除账号模态框

'use client';

import React, { useState } from 'react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export default function DeleteAccountModal({ isOpen, onClose, username }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== username) {
      setError('确认输入不正确');
      return;
    }

    // 要求输入密码验证
    const password = prompt('请输入当前密码以确认删除账号：');
    if (!password) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`/api/v1/users/${username}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          password,
          confirmText: `删除账号 ${username}`,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        alert('账号已删除');
        // 清除本地存储
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // 跳转到首页
        window.location.href = '/';
      } else {
        setError(data.message || '删除失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            删除账号
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong>警告：此操作不可恢复！</strong>
              <p>删除账号将永久清除你的所有数据，包括：</p>
            </div>
          </div>
          <ul className="warning-list">
            <li>个人资料和头像</li>
            <li>所有仓库和代码</li>
            <li>所有讨论和评论</li>
            <li>Star 和 Watch 记录</li>
          </ul>
          <div className="form-group">
            <label className="form-label">
              请输入你的用户名 <strong>{username}</strong> 确认删除
            </label>
            <input
              type="text"
              className="form-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="输入用户名确认"
            />
          </div>
          {error && <p className="text-danger">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>取消</button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={confirmText !== username || isLoading}
          >
            {isLoading ? '删除中...' : '确认删除账号'}
          </button>
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
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: var(--color-error);
        }
        .modal-body {
          padding: 20px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
        }
        .warning-box {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .warning-box svg {
          flex-shrink: 0;
          color: var(--color-error);
          margin-top: 2px;
        }
        .warning-box strong {
          display: block;
          color: var(--color-error);
          margin-bottom: 4px;
        }
        .warning-box p {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .warning-list {
          margin: 0 0 20px 0;
          padding-left: 24px;
          color: var(--color-text-secondary);
          font-size: 14px;
        }
        .warning-list li {
          margin-bottom: 6px;
        }
        .warning-list li:last-child {
          margin-bottom: 0;
        }
        .form-group {
          margin-bottom: 0;
        }
        .form-label {
          display: block;
          font-size: 14px;
          margin-bottom: 8px;
          color: var(--color-text);
        }
        .form-label strong {
          color: var(--color-error);
        }
        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg-primary);
          color: var(--color-text);
        }
        .form-input:focus {
          outline: none;
          border-color: var(--color-error);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        .text-danger {
          color: var(--color-error);
          font-size: 13px;
          margin: 12px 0 0 0;
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
        .btn-danger {
          background: var(--color-error);
          color: white;
        }
        .btn-danger:hover:not(:disabled) {
          opacity: 0.9;
        }
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
