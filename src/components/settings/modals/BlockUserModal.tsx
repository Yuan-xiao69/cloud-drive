'use client';

import React from 'react';

interface BlockUserModalProps {
  isOpen: boolean;
  userId: string;
  reason: string;
  isBlocking: boolean;
  onUserIdChange: (id: string) => void;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BlockUserModal({
  isOpen,
  userId,
  reason,
  isBlocking,
  onUserIdChange,
  onReasonChange,
  onCancel,
  onConfirm,
}: BlockUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">屏蔽用户</h3>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">用户ID</label>
            <input
              type="text"
              className="form-input"
              value={userId}
              onChange={(e) => onUserIdChange(e.target.value)}
              placeholder="输入要屏蔽的用户ID"
            />
          </div>
          <div className="form-group">
            <label className="form-label">屏蔽原因（可选）</label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="输入屏蔽原因"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm}
            disabled={!userId.trim() || isBlocking}
          >
            {isBlocking ? '屏蔽中...' : '确认屏蔽'}
          </button>
        </div>
      </div>
    </div>
  );
}
