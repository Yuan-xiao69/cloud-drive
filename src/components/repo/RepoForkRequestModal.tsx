'use client';

import React, { useState } from 'react';

interface RepoForkRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  repoName: string;
  onSubmit: () => Promise<void>;
}

export default function RepoForkRequestModal({
  isOpen,
  onClose,
  username,
  repoName,
  onSubmit,
}: RepoForkRequestModalProps) {
  const [forkRequestMessage, setForkRequestMessage] = useState('');
  const [isSubmittingForkRequest, setIsSubmittingForkRequest] = useState(false);

  const handleSubmitForkRequest = async () => {
    setIsSubmittingForkRequest(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ message: forkRequestMessage }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('Fork 申请已提交！');
        onClose();
        setForkRequestMessage('');
        onSubmit();
      } else {
        alert(data.message || '提交失败');
      }
    } catch (err) {
      console.error('Failed to submit fork request:', err);
      alert('提交失败');
    } finally {
      setIsSubmittingForkRequest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>申请 Fork 仓库</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              你正在申请 Fork 仓库 <strong>{username}/{repoName}</strong>。
              请填写申请说明，让仓库所有者了解你的目的。
            </p>
            <label className="form-label">申请说明（可选）</label>
            <textarea
              className="form-textarea"
              placeholder="请说明你 Fork 此仓库的目的..."
              value={forkRequestMessage}
              onChange={(e) => setForkRequestMessage(e.target.value)}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmittingForkRequest}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmitForkRequest}
            disabled={isSubmittingForkRequest}
          >
            {isSubmittingForkRequest ? '提交中...' : '提交申请'}
          </button>
        </div>
      </div>
    </div>
  );
}
