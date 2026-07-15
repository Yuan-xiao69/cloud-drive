'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryIcon } from '@/components/repo/RepoIcons';
import { Button, Modal } from '@/components/design';
import toast from 'react-hot-toast';

interface FileVersion { id: string; version: number; fileSize: number; changeSize: number; message: string | null; createdAt: string; user?: { username: string; avatarUrl: string | null } }
interface FileVersionHistoryModalProps { isOpen: boolean; onClose: () => void; username: string; repoName: string; fileId: string; fileName: string; branch: string; currentVersion: number }

function fmtSize(b: number): string { if (b === 0) return '0 B'; const k = 1024; const s = ['B','KB','MB','GB']; const i = Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(2))+' '+s[i]; }
function fmtTime(d: string): string { const n = new Date(), t = new Date(d); const diff = (n.getTime()-t.getTime())/1000; if (diff < 60) return '刚刚'; if (diff < 3600) return Math.floor(diff/60)+' 分钟前'; if (diff < 86400) return Math.floor(diff/3600)+' 小时前'; if (diff < 2592000) return Math.floor(diff/86400)+' 天前'; return t.toLocaleDateString('zh-CN'); }

export default function FileVersionHistoryModal({ isOpen, onClose, username, repoName, fileId, fileName, branch, currentVersion }: FileVersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVersions = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/files/${fileId}/versions?page=${p}&limit=10&branch=${branch}`);
      const data = await res.json();
      if (data.code === 200) { setVersions(data.data?.items || []); setTotalPages(data.data?.totalPages || 1); setPage(p); }
      else setError(data.message || '加载失败');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [username, repoName, fileId, branch]);

  useEffect(() => { if (isOpen) { setPage(1); fetchVersions(1); } }, [isOpen, fetchVersions]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="版本历史" maxWidth="800px">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--ds-text-secondary)]"><div className="w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin" /><span>加载中...</span></div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[var(--ds-danger-default)]"><p>{error}</p><Button variant="secondary" size="sm" onClick={() => fetchVersions(page)}>重试</Button></div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-[var(--ds-text-secondary)]"><HistoryIcon /><p className="mt-2">暂无版本记录</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {versions.map(v => (
                <div key={v.id} className={`flex items-start gap-4 p-4 rounded-md border transition-colors ${v.version === currentVersion ? 'border-[var(--ds-accent-default)] bg-[var(--ds-accent-subtle)]' : 'border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] hover:border-[var(--ds-accent-default)]'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--ds-text-primary)]">版本 {v.version}</span>
                      {v.version === currentVersion && <span className="px-1.5 py-0.5 text-xs font-medium bg-[var(--ds-accent-default)] text-white rounded">当前版本</span>}
                      {v.message && <span className="text-xs text-[var(--ds-text-secondary)] truncate">{v.message}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--ds-text-secondary)]">
                      <span>{fmtTime(v.createdAt)}</span>
                      <span>{fmtSize(v.fileSize)}{v.changeSize !== 0 && <span className={v.changeSize > 0 ? 'text-[var(--ds-danger-default)] ml-1' : 'text-[var(--ds-success-default)] ml-1'}>{v.changeSize > 0 ? '+' : ''}{fmtSize(v.changeSize)}</span>}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {v.version !== currentVersion && (
                      <Button variant="secondary" size="sm" onClick={async () => { try { await fetch(`/api/v1/repos/${username}/${repoName}/files/${fileId}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: v.version }) }); toast.success('已恢复'); onClose(); } catch { toast.error('恢复失败'); } }}>恢复此版本</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--ds-border-default)]">
              <Button variant="secondary" size="sm" onClick={() => fetchVersions(page - 1)} disabled={page <= 1}>上一页</Button>
              <span className="text-sm text-[var(--ds-text-secondary)]">第 {page} / {totalPages} 页</span>
              <Button variant="secondary" size="sm" onClick={() => fetchVersions(page + 1)} disabled={page >= totalPages}>下一页</Button>
            </div>
          )}
    </Modal>
  );
}
