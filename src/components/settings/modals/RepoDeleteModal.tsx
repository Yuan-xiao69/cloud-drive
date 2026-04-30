'use client';

import React from 'react';

interface RepoDeleteModalProps {
  isOpen: boolean;
  repoName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RepoDeleteModal({
  isOpen,
  repoName,
  onCancel,
  onConfirm,
}: RepoDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">确认删除仓库</h3>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p>确定要删除仓库 <strong>{repoName}</strong> 吗？</p>
          <p className="text-danger mt-2">此操作不可恢复，所有相关数据将被永久删除。</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
