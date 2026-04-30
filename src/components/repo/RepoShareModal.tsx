'use client';

import React, { useState, useEffect } from 'react';
import { LinkIcon } from '@/components/repo/RepoIcons';
import type { ShareLink } from './RepoTypes';

interface RepoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  repoName: string;
  onCreateShare: () => Promise<void>;
  onDeleteShare: (id: string) => Promise<void>;
  shareLinks: ShareLink[];
  onShareLinksChange: (links: ShareLink[]) => void;
}

export default function RepoShareModal({
  isOpen,
  onClose,
  username,
  repoName,
  onCreateShare,
  onDeleteShare,
  shareLinks,
  onShareLinksChange,
}: RepoShareModalProps) {
  const [sharePath, setSharePath] = useState('');
  const [sharePermission, setSharePermission] = useState<'read' | 'download'>('read');
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState<number | null>(null);
  const [shareMaxViews, setShareMaxViews] = useState<number | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [newShareLink, setNewShareLink] = useState<string | null>(null);
  const [isLoadingShareLinks, setIsLoadingShareLinks] = useState(false);

  // 获取分享链接列表
  const fetchShareLinks = async () => {
    setIsLoadingShareLinks(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/share`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.code === 200) {
        onShareLinksChange(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch share links:', err);
    } finally {
      setIsLoadingShareLinks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
    }
  }, [isOpen]);

  // 创建分享链接
  const handleCreateShare = async () => {
    setIsCreatingShare(true);
    setNewShareLink(null);
    try {
      const token = localStorage.getItem('accessToken');
      const body: Record<string, unknown> = {
        permission: sharePermission,
      };
      if (sharePath) body.path = sharePath;
      if (sharePassword) body.password = sharePassword;
      if (shareExpiresDays) body.expiresIn = shareExpiresDays * 86400;
      if (shareMaxViews) body.maxViews = shareMaxViews;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        setNewShareLink(data.data.url);
        setSharePath('');
        setSharePassword('');
        setShareExpiresDays(null);
        setShareMaxViews(null);
        fetchShareLinks();
      } else {
        alert(data.message || '创建失败');
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      alert('创建失败');
    } finally {
      setIsCreatingShare(false);
    }
  };

  // 删除分享链接
  const handleDeleteShare = async (id: string) => {
    if (!confirm('确定要删除此分享链接吗？')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/share/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchShareLinks();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete share link:', err);
      alert('删除失败');
    }
  };

  // 复制链接
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('链接已复制到剪贴板');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>分享链接</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* 新建分享链接 */}
          <div className="share-create-section">
            <h4 className="share-section-title">创建分享链接</h4>

            {newShareLink && (
              <div className="share-success-box">
                <p className="share-success-text">分享链接创建成功！</p>
                <div className="share-link-display">
                  <input
                    type="text"
                    className="form-input"
                    value={newShareLink}
                    readOnly
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleCopyLink(newShareLink)}
                  >
                    复制
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">分享路径（可选）</label>
              <input
                type="text"
                className="form-input"
                placeholder="留空表示分享整个仓库"
                value={sharePath}
                onChange={(e) => setSharePath(e.target.value)}
              />
              <small className="form-hint">例如：src/components</small>
            </div>

            <div className="form-group">
              <label className="form-label">权限</label>
              <select
                className="form-input"
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'read' | 'download')}
              >
                <option value="read">只读</option>
                <option value="download">可下载</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">访问密码（可选）</label>
              <input
                type="password"
                className="form-input"
                placeholder="留空表示无密码保护"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">过期天数（可选）</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="留空表示永不过期"
                  min="1"
                  value={shareExpiresDays || ''}
                  onChange={(e) => setShareExpiresDays(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">最大访问次数（可选）</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="留空表示无限制"
                  min="1"
                  value={shareMaxViews || ''}
                  onChange={(e) => setShareMaxViews(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={handleCreateShare}
              disabled={isCreatingShare}
            >
              {isCreatingShare ? '创建中...' : '创建分享链接'}
            </button>
          </div>

          {/* 现有分享链接列表 */}
          <div className="share-list-section">
            <h4 className="share-section-title">现有分享链接</h4>

            {isLoadingShareLinks ? (
              <div className="share-loading">加载中...</div>
            ) : shareLinks.length === 0 ? (
              <div className="share-empty">暂无分享链接</div>
            ) : (
              <div className="share-links">
                {shareLinks.map((link) => (
                  <div key={link.id} className="share-link-item">
                    <div className="share-link-info">
                      <div className="share-link-url">
                        <LinkIcon />
                        <span>/share/{link.token}</span>
                        {link.hasPassword && <span className="share-badge">🔒</span>}
                      </div>
                      <div className="share-link-meta">
                        {link.path ? `路径: ${link.path}` : '整个仓库'}
                        <span className="share-sep">•</span>
                        {link.permission === 'download' ? '可下载' : '只读'}
                        <span className="share-sep">•</span>
                        访问 {link.viewCount} 次
                        {link.expiresAt && (
                          <>
                            <span className="share-sep">•</span>
                            {new Date(link.expiresAt) < new Date() ? (
                              <span className="share-expired">已过期</span>
                            ) : (
                              `过期: ${new Date(link.expiresAt).toLocaleDateString()}`
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="share-link-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopyLink(`${window.location.origin}/share/${link.token}`)}
                      >
                        复制
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteShare(link.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
