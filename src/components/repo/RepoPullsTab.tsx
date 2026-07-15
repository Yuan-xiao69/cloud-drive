'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusIcon, PullRequestIcon } from '@/components/repo/RepoIcons';
import { usePulls } from './hooks/usePulls';
import { Button, Input, Modal, Field } from '@/components/design';
import type { PullRequest, PullStatus } from './RepoTypes';
import toast from 'react-hot-toast';

interface RepoPullsTabProps {
  username: string; repoName: string; pulls?: PullRequest[]; pullsTotal?: number;
  pullStatus?: PullStatus; defaultBranch?: string; onStatusChange?: (status: PullStatus) => void;
  showPRModal?: boolean; onShowModalChange?: (show: boolean) => void;
  onCreatePR?: () => Promise<void>; onFetchPulls?: (status: string) => void;
}

export default function RepoPullsTab(props: RepoPullsTabProps) {
  const { username, repoName, defaultBranch = 'main' } = props;
  const hook = usePulls({ username, repoName });
  const pulls = (props.pulls ?? hook.pulls) as PullRequest[];
  const pullStatus = props.pullStatus ?? hook.status;
  const setPullStatus = props.onStatusChange ?? hook.setStatus;
  const isLoading = hook.isLoading;

  const [showModal, setShowModal] = useState(false);
  const showPRModal = props.showPRModal ?? showModal;
  const onShowModalChange = props.onShowModalChange ?? setShowModal;

  const [newPRTitle, setNewPRTitle] = useState('');
  const [newPRContent, setNewPRContent] = useState('');
  const [newPRSourceBranch, setNewPRSourceBranch] = useState('');
  const [newPRTargetBranch, setNewPRTargetBranch] = useState(defaultBranch);
  const [isCreatingPR, setIsCreatingPR] = useState(false);

  const handleCreatePR = async () => {
    if (!newPRTitle.trim()) return;
    setIsCreatingPR(true);
    try { await hook.createPull({ title: newPRTitle, content: newPRContent, sourceBranch: newPRSourceBranch, targetBranch: newPRTargetBranch }); onShowModalChange(false); setNewPRTitle(''); setNewPRContent(''); setNewPRSourceBranch(''); if (props.onFetchPulls) props.onFetchPulls(pullStatus); }
    catch { toast.error('创建失败'); }
    finally { setIsCreatingPR(false); }
  };

  const btnPrimary = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[var(--ds-accent-default)] border border-[var(--ds-accent-default)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-50 transition-colors';

  return (
    <div>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--ds-border-default)] mb-4">
        <div className="flex items-center gap-3">
          <select className="px-3 py-1.5 text-sm text-[var(--ds-text-primary)] bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] outline-none" value={pullStatus} onChange={e => { const ns = e.target.value as PullStatus; setPullStatus(ns); if (props.onFetchPulls) props.onFetchPulls(ns); }}>
            <option value="open">开放</option><option value="merged">已合并</option><option value="closed">已关闭</option><option value="all">全部</option>
          </select>
          <span className="text-sm text-[var(--ds-text-secondary)]">{hook.total} 个拉取请求</span>
        </div>
        <Button className={btnPrimary} onClick={() => { setNewPRTargetBranch(defaultBranch); onShowModalChange(true); }}><PlusIcon />新建拉取请求</Button>
      </div>

      {isLoading && pulls.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[var(--ds-text-secondary)]"><span>加载中...</span></div>
      ) : pulls.length > 0 ? (
        <div className="flex flex-col gap-2">
          {pulls.map(pr => {
            const p = pr as any;
            return (
              <div key={p.id} className="flex items-center gap-3 p-4 bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] hover:border-[var(--ds-accent-default)] transition-colors">
                <PullRequestIcon />
                <div className="flex-1 min-w-0">
                  <Link href={`/${username}/${repoName}/pulls/${p.id}`} className="text-sm font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-accent-default)] no-underline">{p.title}</Link>
                  <span className="block text-xs text-[var(--ds-text-secondary)] mt-0.5">由 <strong>{p.author?.username || p.authorUsername}</strong> · {p.sourceBranch} → {p.targetBranch}</span>
                </div>
                <span className="text-xs text-[var(--ds-text-secondary)]">{p.commentsCount} 评论</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]"><PullRequestIcon /><h3 className="mt-2 text-sm">暂无拉取请求</h3></div>
      )}

      {showPRModal && (
        <Modal isOpen onClose={() => onShowModalChange(false)} title="新建拉取请求" maxWidth="512px" footer={
          <>
            <Button variant="secondary" onClick={() => onShowModalChange(false)}>取消</Button>
            <Button className={btnPrimary} onClick={handleCreatePR} disabled={!newPRTitle.trim() || isCreatingPR}>{isCreatingPR ? '创建中...' : '创建拉取请求'}</Button>
          </>
        }>
          <div className="flex flex-col gap-4">
            <Field label="标题"><Input id="pr-title" type="text" placeholder="拉取请求标题" value={newPRTitle} onChange={e => setNewPRTitle(e.target.value)} /></Field>
            <Field label="描述"><Input id="pr-content" multiline rows={5} className="min-h-[120px]" placeholder="详细描述你的更改..." value={newPRContent} onChange={e => setNewPRContent(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="源分支"><Input id="pr-source" type="text" placeholder="feature-branch" value={newPRSourceBranch} onChange={e => setNewPRSourceBranch(e.target.value)} /></Field>
              <Field label="目标分支"><Input id="pr-target" type="text" placeholder="main" value={newPRTargetBranch} onChange={e => setNewPRTargetBranch(e.target.value)} /></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
