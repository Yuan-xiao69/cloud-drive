'use client';

import React, { useState, useEffect } from 'react';
import type { ForkRequest, SettingsSubTab } from './RepoTypes';

interface RepoSettingsTabProps {
  username: string;
  repoName: string;
  repo: {
    name: string;
    description: string | null;
    visibility: number;
  } | null;
  onSaveSettings: () => Promise<void>;
  onDeleteRepo: () => Promise<void>;
  onFetchForkRequests: (status?: string) => void;
  onApproveForkRequest: (requestId: string) => Promise<void>;
  onRejectForkRequest: (requestId: string, note: string) => Promise<void>;
}

export default function RepoSettingsTab({
  username,
  repoName,
  repo,
  onSaveSettings,
  onDeleteRepo,
  onFetchForkRequests,
  onApproveForkRequest,
  onRejectForkRequest,
}: RepoSettingsTabProps) {
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [forkRequests, setForkRequests] = useState<ForkRequest[]>([]);
  const [forkRequestsTotal, setForkRequestsTotal] = useState(0);
  const [forkRequestsStatus, setForkRequestsStatus] = useState<string>('pending');
  const [isLoadingForkRequests, setIsLoadingForkRequests] = useState(false);
  const [forkRequestPage, setForkRequestPage] = useState(1);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRejectId, setCurrentRejectId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);

  // 设置表单状态
  const [editRepoName, setEditRepoName] = useState(repo?.name || '');
  const [editDescription, setEditDescription] = useState(repo?.description || '');
  const [editVisibility, setEditVisibility] = useState<number>(repo?.visibility || 1);

  // 同步 repo 数据
  useEffect(() => {
    if (repo) {
      setEditRepoName(repo.name);
      setEditDescription(repo.description || '');
      setEditVisibility(repo.visibility);
    }
  }, [repo]);

  // 获取 Fork Requests
  const fetchForkRequests = async (status: string = 'pending') => {
    setIsLoadingForkRequests(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests?status=${status}&page=${forkRequestPage}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.code === 200) {
        setForkRequests(data.data?.items || []);
        setForkRequestsTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch fork requests:', err);
    } finally {
      setIsLoadingForkRequests(false);
    }
  };

  // 批准 Fork Request
  const handleApproveForkRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchForkRequests(forkRequestsStatus);
        onApproveForkRequest(requestId);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      alert('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 拒绝 Fork Request
  const handleRejectForkRequest = async () => {
    if (!currentRejectId) return;
    setProcessingRequestId(currentRejectId);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests/${currentRejectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ action: 'reject', note: rejectNote }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowRejectModal(false);
        setRejectNote('');
        setCurrentRejectId(null);
        fetchForkRequests(forkRequestsStatus);
        onRejectForkRequest(currentRejectId, rejectNote);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      alert('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    if (!editRepoName.trim()) {
      alert('仓库名称不能为空');
      return;
    }
    if (editRepoName !== repo?.name && !confirm(`确定要将仓库名称从 "${repo?.name}" 改为 "${editRepoName}" 吗？`)) {
      return;
    }
    setIsSavingSettings(true);
    try {
      await onSaveSettings();
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 删除仓库
  const handleDeleteRepo = async () => {
    if (!confirm(`确定要删除仓库 "${repo?.name}" 吗？此操作不可恢复！`)) {
      return;
    }
    if (!confirm('再次确认：删除后所有内容将被永久删除！')) {
      return;
    }
    setIsDeletingRepo(true);
    try {
      await onDeleteRepo();
    } finally {
      setIsDeletingRepo(false);
    }
  };

  return (
    <div className="settings-page">
      {/* 设置子 Tab */}
      <div className="settings-sub-tabs">
        <button
          className={`settings-sub-tab ${settingsSubTab === 'general' ? 'active' : ''}`}
          onClick={() => setSettingsSubTab('general')}
        >
          基本设置
        </button>
        <button
          className={`settings-sub-tab ${settingsSubTab === 'fork-requests' ? 'active' : ''}`}
          onClick={() => {
            setSettingsSubTab('fork-requests');
            if (forkRequests.length === 0) fetchForkRequests();
          }}
        >
          Fork 申请
          {forkRequestsTotal > 0 && (
            <span className="fork-request-badge">{forkRequestsTotal}</span>
          )}
        </button>
      </div>

      {/* 基本设置 */}
      {settingsSubTab === 'general' && (
        <>
          <div className="settings-section">
            <h3 className="settings-title">仓库设置</h3>
            <div className="form-group">
              <label className="form-label">仓库名称</label>
              <input
                type="text"
                value={editRepoName}
                onChange={(e) => setEditRepoName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea
                className="form-input"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="添加描述..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">可见性</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={editVisibility === 1}
                    onChange={() => setEditVisibility(1)}
                  />
                  <span>公开</span>
                  <span className="radio-desc">任何人都能看到这个仓库</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={editVisibility === 0}
                    onChange={() => setEditVisibility(0)}
                  />
                  <span>私有</span>
                  <span className="radio-desc">只有你才能看到这个仓库</span>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>

          <div className="settings-section danger-zone">
            <h3 className="settings-title">危险区域</h3>
            <div className="danger-content">
              <div>
                <h4>删除此仓库</h4>
                <p>删除后无法恢复，所有内容将被永久删除。</p>
              </div>
              <button
                className="btn btn-danger"
                onClick={handleDeleteRepo}
                disabled={isDeletingRepo}
              >
                {isDeletingRepo ? '删除中...' : '删除仓库'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fork 申请列表 */}
      {settingsSubTab === 'fork-requests' && (
        <div className="fork-requests-section">
          <div className="fork-requests-header">
            <h3 className="settings-title">Fork 申请管理</h3>
            <select
              className="fork-requests-filter"
              value={forkRequestsStatus}
              onChange={(e) => {
                setForkRequestsStatus(e.target.value);
                setForkRequestPage(1);
                fetchForkRequests(e.target.value);
              }}
            >
              <option value="pending">待处理</option>
              <option value="approved">已批准</option>
              <option value="rejected">已拒绝</option>
              <option value="expired">已过期</option>
              <option value="all">全部</option>
            </select>
          </div>

          {isLoadingForkRequests ? (
            <div className="loading-state">加载中...</div>
          ) : forkRequests.length === 0 ? (
            <div className="empty-state">
              <p>暂无 Fork 申请</p>
            </div>
          ) : (
            <div className="fork-requests-list">
              {forkRequests.map((request) => (
                <div key={request.id} className="fork-request-card">
                  <div className="fork-request-header">
                    <div className="fork-request-user">
                      <div className="fork-request-avatar">
                        {request.requester.avatarUrl ? (
                          <img src={request.requester.avatarUrl} alt="" />
                        ) : (
                          <div className="avatar-placeholder">
                            {request.requester.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="fork-request-user-info">
                        <span className="fork-request-username">{request.requester.username}</span>
                        <span className="fork-request-time">
                          申请于 {new Date(request.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <div className={`fork-request-status status-${request.status}`}>
                      {request.status === 'pending' && '待处理'}
                      {request.status === 'approved' && '已批准'}
                      {request.status === 'rejected' && '已拒绝'}
                      {request.status === 'expired' && '已过期'}
                    </div>
                  </div>

                  {request.message && (
                    <div className="fork-request-message">
                      <strong>申请说明：</strong>
                      <p>{request.message}</p>
                    </div>
                  )}

                  {request.processedAt && request.note && (
                    <div className="fork-request-note">
                      <strong>处理备注：</strong>
                      <p>{request.note}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="fork-request-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApproveForkRequest(request.id)}
                        disabled={processingRequestId === request.id}
                      >
                        {processingRequestId === request.id ? '处理中...' : '批准'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          setCurrentRejectId(request.id);
                          setShowRejectModal(true);
                        }}
                        disabled={processingRequestId === request.id}
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 拒绝 Fork 申请模态框 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>拒绝 Fork 申请</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                确定要拒绝这个 Fork 申请吗？你可以添加拒绝原因。
              </p>
              <label className="form-label">拒绝原因（可选）</label>
              <textarea
                className="form-textarea"
                placeholder="请输入拒绝原因..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectForkRequest}
                disabled={processingRequestId !== null}
              >
                {processingRequestId ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
