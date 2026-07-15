'use client';

import React, { useState, useEffect } from 'react';
import { LinkIcon } from '@/components/repo/RepoIcons';
import { api } from '@/lib/api/client';
import type { ShareLink } from './RepoTypes';
import { Card, Button, Modal, Input, Select, Field } from '@/components/design';
import toast from 'react-hot-toast';

interface RepoShareModalProps { isOpen: boolean; onClose: () => void; username: string; repoName: string; shareLinks: ShareLink[]; onShareLinksChange: (links: ShareLink[]) => void }

export default function RepoShareModal({ isOpen, onClose, username, repoName, shareLinks, onShareLinksChange }: RepoShareModalProps) {
  const [sharePath, setSharePath] = useState('');
  const [sharePermission, setSharePermission] = useState<'read' | 'download'>('read');
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState<number | null>(null);
  const [shareMaxViews, setShareMaxViews] = useState<number | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [newShareLink, setNewShareLink] = useState<string | null>(null);
  const [isLoadingShareLinks, setIsLoadingShareLinks] = useState(false);

  const fetchShareLinks = async () => {
    setIsLoadingShareLinks(true);
    try { const data = await api.get<ShareLink[]>(`/api/v1/repos/${username}/${repoName}/share`); if (data.code === 200) onShareLinksChange(data.data || []); }
    catch { /* ignore */ }
    finally { setIsLoadingShareLinks(false); }
  };

  useEffect(() => { if (isOpen) fetchShareLinks(); }, [isOpen]);

  const handleCreateShare = async () => {
    setIsCreatingShare(true); setNewShareLink(null);
    try {
      const body: Record<string, unknown> = { permission: sharePermission };
      if (sharePath) body.path = sharePath;
      if (sharePassword) body.password = sharePassword;
      if (shareExpiresDays) body.expiresIn = shareExpiresDays * 86400;
      if (shareMaxViews) body.maxViews = shareMaxViews;
      const data = await api.post<{ url: string }>(`/api/v1/repos/${username}/${repoName}/share`, body);
      if (data.code === 200) { setNewShareLink(data.data.url); setSharePath(''); setSharePassword(''); setShareExpiresDays(null); setShareMaxViews(null); fetchShareLinks(); }
      else toast.error(data.message || '创建失败');
    } catch { toast.error('创建失败'); }
    finally { setIsCreatingShare(false); }
  };

  const handleDeleteShare = async (id: string) => { 
try { const data = await api.delete(`/api/v1/share/${id}`); if (data.code === 200) fetchShareLinks(); else toast.error(data.message || '删除失败'); } catch { toast.error('删除失败'); } };
  const handleCopyLink = (link: string) => { navigator.clipboard.writeText(link); toast.success('链接已复制到剪贴板'); };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="分享链接" maxWidth="672px">
        <div className="flex flex-col gap-6">
          {/* 创建分享 */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">创建分享链接</h4>
            {newShareLink && (
              <div className="p-3 bg-[var(--ds-success-subtle)] border border-[var(--ds-success-default)] rounded-[var(--ds-radius-sm)] mb-4">
                <p className="text-sm text-[var(--ds-success-default)] font-medium mb-2">分享链接创建成功！</p>
                <div className="flex gap-2">
                  <Input type="text" value={newShareLink} readOnly />
                  <Button variant="secondary" size="md" onClick={() => handleCopyLink(newShareLink)}>复制</Button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Field label="分享路径（可选）" hint="例如：src/components">
                <Input id="share-path" type="text" placeholder="留空表示分享整个仓库" value={sharePath} onChange={e => setSharePath(e.target.value)} />
              </Field>
              <Field label="权限">
                <Select id="share-permission" value={sharePermission} onChange={e => setSharePermission(e.target.value as 'read' | 'download')} options={[{ value: 'read', label: '只读' }, { value: 'download', label: '可下载' }]} />
              </Field>
              <Field label="访问密码（可选）">
                <Input id="share-password" type="password" placeholder="留空表示无密码保护" value={sharePassword} onChange={e => setSharePassword(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="过期天数（可选）">
                  <Input id="share-expires" type="number" placeholder="留空表示永不过期" min="1" value={shareExpiresDays || ''} onChange={e => setShareExpiresDays(e.target.value ? parseInt(e.target.value) : null)} />
                </Field>
                <Field label="最大访问次数（可选）">
                  <Input id="share-max-views" type="number" placeholder="留空表示无限制" min="1" value={shareMaxViews || ''} onChange={e => setShareMaxViews(e.target.value ? parseInt(e.target.value) : null)} />
                </Field>
              </div>
              <Button variant="primary" size="md" block onClick={handleCreateShare} loading={isCreatingShare}>创建分享链接</Button>
            </div>
          </div>

          {/* 现有分享 */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">现有分享链接</h4>
            {isLoadingShareLinks ? (
              <div className="text-sm text-[var(--ds-text-secondary)] py-4">加载中...</div>
            ) : shareLinks.length === 0 ? (
              <div className="text-sm text-[var(--ds-text-secondary)] py-4">暂无分享链接</div>
            ) : (
              <div className="flex flex-col gap-2">
                {shareLinks.map(link => (
                  <Card key={link.id} variant="subtle" padding="md" className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm text-[var(--ds-accent-default)]"><LinkIcon /><span className="truncate">/share/{link.token}</span>{link.hasPassword && <span>🔒</span>}</div>
                      <div className="flex items-center gap-1 flex-wrap text-xs text-[var(--ds-text-secondary)] mt-1">
                        <span>{link.path ? `路径: ${link.path}` : '整个仓库'}</span><span>•</span><span>{link.permission === 'download' ? '可下载' : '只读'}</span><span>•</span><span>访问 {link.viewCount} 次</span>
                        {link.expiresAt && (<><span>•</span>{new Date(link.expiresAt) < new Date() ? <span className="text-[var(--ds-danger-default)]">已过期</span> : <span>过期: {new Date(link.expiresAt).toLocaleDateString()}</span>}</>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => handleCopyLink(`${window.location.origin}/share/${link.token}`)}>复制</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteShare(link.id)}>删除</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
}
