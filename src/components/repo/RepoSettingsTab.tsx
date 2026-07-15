'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import type { ForkRequest, Collaborator, SettingsSubTab } from './RepoTypes';
import { Button, Badge, Avatar, Input, Select, Modal, ModalFooter } from '@/components/design';
import toast from 'react-hot-toast';

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

  // 协作者状态
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Collaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // 邀请协作者表单
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('write');
  const [isInviting, setIsInviting] = useState(false);

  // 修改角色状态
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('write');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // 移除协作者状态
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

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
      const data = await api.get<{ items: ForkRequest[]; pagination: { total: number } }>(`/api/v1/repos/${username}/${repoName}/fork-requests`, { status, page: forkRequestPage });
      if (data.code === 200) {
        setForkRequests(data.data?.items || []);
        setForkRequestsTotal(data.data?.pagination?.total || 0);
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
      const data = await api.patch(`/api/v1/repos/${username}/${repoName}/fork-requests/${requestId}`, { action: 'approve' });
      if (data.code === 200) {
        fetchForkRequests(forkRequestsStatus);
        onApproveForkRequest(requestId);
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (err) {
      toast.error('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 拒绝 Fork Request
  const handleRejectForkRequest = async () => {
    if (!currentRejectId) return;
    setProcessingRequestId(currentRejectId);
    try {
      const data = await api.patch(`/api/v1/repos/${username}/${repoName}/fork-requests/${currentRejectId}`, { action: 'reject', note: rejectNote });
      if (data.code === 200) {
        setShowRejectModal(false);
        setRejectNote('');
        setCurrentRejectId(null);
        fetchForkRequests(forkRequestsStatus);
        onRejectForkRequest(currentRejectId, rejectNote);
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (err) {
      toast.error('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    if (!editRepoName.trim()) {
      toast.error('仓库名称不能为空');
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


    setIsDeletingRepo(true);
    try {
      await onDeleteRepo();
    } finally {
      setIsDeletingRepo(false);
    }
  };

  // ===== 协作者管理函数 =====

  const roleLabels: Record<string, string> = {
    admin: '管理员',
    write: '写入者',
    triage: '分类者',
    read: '只读',
  };

  const roleBadgeVariants: Record<string, 'danger' | 'success' | 'warning' | 'default'> = {
    admin: 'danger',
    write: 'success',
    triage: 'warning',
    read: 'default',
  };

  // 获取协作者列表
  const fetchCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const data = await api.get<{ collaborators: Collaborator[]; pendingInvitations: Collaborator[]; isOwner: boolean; currentUserRole: string | null }>(`/api/v1/repos/${username}/${repoName}/collaborators`);
      if (data.code === 200) {
        setCollaborators(data.data?.collaborators || []);
        setPendingInvitations(data.data?.pendingInvitations || []);
        setIsOwner(data.data?.isOwner || false);
        setCurrentUserRole(data.data?.currentUserRole || null);
      }
    } catch (err) {
      console.error('Failed to fetch collaborators:', err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  // 邀请协作者
  const handleInviteCollaborator = async () => {
    if (!inviteUsername.trim()) {
      toast.error('请输入用户名');
      return;
    }
    setIsInviting(true);
    try {
      const data = await api.post(`/api/v1/repos/${username}/${repoName}/collaborators`, { username: inviteUsername.trim(), role: inviteRole });
      if (data.code === 200) {
        setInviteUsername('');
        setInviteRole('write');
        fetchCollaborators();
      } else {
        toast.error(data.message || '邀请失败');
      }
    } catch (err) {
      toast.error('邀请失败，请重试');
    } finally {
      setIsInviting(false);
    }
  };

  // 修改协作者角色
  const handleUpdateRole = async (userId: string) => {
    setIsUpdatingRole(true);
    try {
      const data = await api.patch(`/api/v1/repos/${username}/${repoName}/collaborators/${userId}`, { role: editingRole });
      if (data.code === 200) {
        setEditingRoleUserId(null);
        fetchCollaborators();
      } else {
        toast.error(data.message || '修改失败');
      }
    } catch (err) {
      toast.error('修改失败，请重试');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // 移除协作者
  const handleRemoveCollaborator = async (userId: string) => {

    setRemovingUserId(userId);
    try {
      const data = await api.delete(`/api/v1/repos/${username}/${repoName}/collaborators?userId=${userId}`);
      if (data.code === 200) {
        fetchCollaborators();
      } else {
        toast.error(data.message || '移除失败');
      }
    } catch (err) {
      toast.error('移除失败，请重试');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 设置子 Tab */}
      <div className="flex items-center gap-0 border-b border-[var(--ds-border-default)] mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsSubTab('general')}
        >
          基本设置
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSettingsSubTab('fork-requests');
            if (forkRequests.length === 0) fetchForkRequests();
          }}
        >
          Fork 申请
          {forkRequestsTotal > 0 && (
            <span className="fork-request-badge">{forkRequestsTotal}</span>
          )}
        </Button>
        {(isOwner || currentUserRole === 'admin') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSettingsSubTab('collaborators');
              if (collaborators.length === 0 && pendingInvitations.length === 0) fetchCollaborators();
            }}
          >
            协作者
            {collaborators.length + pendingInvitations.length > 0 && (
              <span className="fork-request-badge">{collaborators.length + pendingInvitations.length}</span>
            )}
          </Button>
        )}
      </div>

      {/* 基本设置 */}
      {settingsSubTab === 'general' && (
        <>
          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] p-6 mb-4">
            <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">仓库设置</h3>
            <div className="mb-4">
              <label htmlFor="repo-name" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">仓库名称</label>
              <Input
                id="repo-name"
                type="text"
                value={editRepoName}
                onChange={(e) => setEditRepoName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="repo-description" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">描述</label>
              <Input
                id="repo-description"
                multiline
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="添加描述..."
              />
            </div>
            <div className="mb-4">
              <label htmlFor="repo-visibility" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">可见性</label>
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
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={handleSaveSettings} disabled={isSavingSettings} loading={isSavingSettings}>保存更改</Button>
            </div>
          </div>

          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-danger-default)] bg-[var(--ds-danger-subtle)] p-6 mb-4">
            <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">危险区域</h3>
            <div className="danger-content">
              <div>
                <h4>删除此仓库</h4>
                <p>删除后无法恢复，所有内容将被永久删除。</p>
              </div>
              <Button variant="danger" onClick={handleDeleteRepo} disabled={isDeletingRepo} loading={isDeletingRepo}>删除仓库</Button>
            </div>
          </div>
        </>
      )}

      {/* Fork 申请列表 */}
      {settingsSubTab === 'fork-requests' && (
        <div className="fork-requests-section">
          <div className="fork-requests-header">
            <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">Fork 申请管理</h3>
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
            <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">加载中...</div>
          ) : forkRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
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
                      <Button size="sm" onClick={() => handleApproveForkRequest(request.id)} disabled={processingRequestId === request.id} loading={processingRequestId === request.id}>批准</Button>
                      <Button variant="danger" size="sm" onClick={() => { setCurrentRejectId(request.id); setShowRejectModal(true); }} disabled={processingRequestId === request.id}>拒绝</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 协作者管理 */}
      {settingsSubTab === 'collaborators' && (
        <div className="space-y-6">
          {/* 邀请区域 */}
          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] p-6">
            <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">邀请协作者</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="invite-username" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">用户名</label>
                <Input
                  id="invite-username"
                  placeholder="输入用户名..."
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInviteCollaborator();
                  }}
                />
              </div>
              <div className="w-40">
                <label htmlFor="invite-role" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">角色</label>
                <Select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  options={[
                    { value: 'admin', label: '管理员' },
                    { value: 'write', label: '写入者' },
                    { value: 'triage', label: '分类者' },
                    { value: 'read', label: '只读' },
                  ]}
                />
              </div>
              <Button
                onClick={handleInviteCollaborator}
                disabled={isInviting || !inviteUsername.trim()}
                loading={isInviting}
              >
                邀请
              </Button>
            </div>
          </div>

          {/* 已有协作者列表 */}
          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] p-6">
            <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">
              协作者 ({collaborators.length})
            </h3>

            {isLoadingCollaborators ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--ds-text-secondary)]">加载中...</div>
            ) : collaborators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--ds-text-secondary)]">
                <p>暂无协作者</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between py-3 px-3 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={collab.avatarUrl}
                        fallback={collab.username}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--ds-text-primary)]">{collab.username}</span>
                          <Badge variant={roleBadgeVariants[collab.role] || 'default'}>
                            {roleLabels[collab.role] || collab.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
                          由 {collab.invitedBy.username} 邀请
                          {collab.acceptedAt && ` · ${new Date(collab.acceptedAt).toLocaleDateString('zh-CN')} 接受`}
                        </p>
                      </div>
                    </div>
                    {(isOwner || currentUserRole === 'admin') && (
                      <div className="flex items-center gap-2">
                        {editingRoleUserId === collab.userId ? (
                          <>
                            <Select
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                              options={[
                                { value: 'admin', label: '管理员' },
                                { value: 'write', label: '写入者' },
                                { value: 'triage', label: '分类者' },
                                { value: 'read', label: '只读' },
                              ]}
                              className="w-28"
                            />
                            <Button size="sm" onClick={() => handleUpdateRole(collab.userId)} disabled={isUpdatingRole} loading={isUpdatingRole}>
                              保存
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingRoleUserId(null)}>
                              取消
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRoleUserId(collab.userId);
                                setEditingRole(collab.role);
                              }}
                            >
                              修改角色
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveCollaborator(collab.userId)}
                              disabled={removingUserId === collab.userId}
                              loading={removingUserId === collab.userId}
                            >
                              移除
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 待接受邀请列表 */}
          {pendingInvitations.length > 0 && (
            <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] p-6">
              <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-4">
                待接受邀请 ({pendingInvitations.length})
              </h3>
              <div className="space-y-2">
                {pendingInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between py-3 px-3 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={invite.avatarUrl}
                        fallback={invite.username}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--ds-text-primary)]">{invite.username}</span>
                          <Badge variant={roleBadgeVariants[invite.role] || 'default'}>
                            {roleLabels[invite.role] || invite.role}
                          </Badge>
                          <Badge variant="warning">待接受</Badge>
                        </div>
                        <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
                          由 {invite.invitedBy.username} 邀请 · {new Date(invite.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    {(isOwner || currentUserRole === 'admin') && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(invite.userId)}
                        disabled={removingUserId === invite.userId}
                        loading={removingUserId === invite.userId}
                      >
                        取消邀请
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 拒绝 Fork 申请模态框 */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="拒绝 Fork 请求"
        footer={
          <ModalFooter
            onCancel={() => setShowRejectModal(false)}
            onConfirm={handleRejectForkRequest}
            confirmLabel={processingRequestId !== null ? '处理中...' : '确认拒绝'}
            confirmDanger
            confirmLoading={processingRequestId !== null}
          />
        }
      >
        <p className="text-sm text-[var(--ds-text-primary)]">
          确定要拒绝这个 Fork 申请吗？你可以添加拒绝原因。
        </p>
        <label htmlFor="reject-fork-note" className="block text-sm font-medium text-[var(--ds-text-primary)] mt-3 mb-1">
          拒绝原因（可选）
        </label>
        <Input
          id="reject-fork-note"
          multiline
          rows={3}
          placeholder="请输入拒绝原因..."
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
