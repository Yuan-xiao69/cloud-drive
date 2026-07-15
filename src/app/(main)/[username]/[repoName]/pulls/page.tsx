'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button, Input, Select, Field, PageLayout, PageLayoutContent, Modal, ModalFooter, Empty } from '@/components/design';
import {
  Plus,
  Search,
  AlertCircle,
  GitPullRequest,
  GitMerge,
  XCircle,
  Clock,
  GitBranch,
  ArrowRight,
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import { usePulls } from '@/components/repo/hooks/usePulls';
import type { PullRequestItem } from '@/components/repo/hooks/usePulls';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/providers';
import toast from 'react-hot-toast';

export default function PullsListPage() {
  const params = useParams();
  const username = params.username as string;
  const repoName = params.repoName as string;

  const {
    pulls, total, page, totalPages,
    status, setStatus,
    searchQuery, setSearchQuery,
    isLoading, error,
    setPage, fetchPulls,
  } = usePulls({ username, repoName });

  // 创建 PR 模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSourceBranch, setNewSourceBranch] = useState('');
  const [newTargetBranch, setNewTargetBranch] = useState('main');
  const [isCreating, setIsCreating] = useState(false);
  const [repoBranches, setRepoBranches] = useState<{name: string}[]>([]);

  const { user: currentUser } = useAuth();
  useEffect(() => {
    fetch(`/api/v1/repos/${username}/${repoName}/branches`)
      .then(r => r.json())
      .then(d => {
        if (d.code === 200) {
          setRepoBranches(d.data);
          if (d.data.length > 0) {
            const nonDefault = d.data.find((b: {name: string}) => b.name !== 'main');
            setNewSourceBranch(nonDefault?.name || d.data[0]?.name || '');
          }
        }
      })
      .catch(() => {});
  }, [username, repoName]);

  // 创建 PR
  const handleCreate = async () => {
    if (!newTitle.trim() || !newSourceBranch) return;

    setIsCreating(true);
    try {
      const data = await api.post(`/api/v1/repos/${username}/${repoName}/pulls`, {
        title: newTitle.trim(),
        content: newContent.trim(),
        sourceBranch: newSourceBranch,
        targetBranch: newTargetBranch,
      });
      if (data.code === 200) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewSourceBranch(repoBranches.find(b => b.name !== 'main')?.name || '');
        fetchPulls();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取状态图标
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return <GitPullRequest size={20} className="text-[var(--ds-success-default)]" />;
      case 'merged':
        return <GitMerge size={20} className="text-[var(--ds-accent-default)]" />;
      case 'closed':
        return <XCircle size={20} className="text-[var(--ds-danger-default)]" />;
      default:
        return <GitPullRequest size={20} />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '开放';
      case 'merged': return '已合并';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <div className="py-8 px-6">
        <Header />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)] flex items-center gap-2 m-0">拉取请求</h1>
          <span className="bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)] text-sm font-medium px-2 py-0.5 rounded-full">{total}</span>
        </div>
        {currentUser && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            新建拉取请求
          </Button>
        )}
      </div>

      {/* 状态标签栏 */}
      <div className="flex border-b border-[var(--ds-border-default)] mb-5">
        <Button
          variant="ghost"
          className={`border-b-2 mb-[-1px] ${status === 'open' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('open'); setPage(1); }}
        >
          <GitPullRequest size={16} className={status === 'open' ? 'text-[var(--ds-success-default)]' : ''} />
          开放
        </Button>
        <Button
          variant="ghost"
          className={`border-b-2 mb-[-1px] ${status === 'merged' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('merged'); setPage(1); }}
        >
          <GitMerge size={16} className={status === 'merged' ? 'text-[var(--ds-accent-default)]' : ''} />
          已合并
        </Button>
        <Button
          variant="ghost"
          className={`border-b-2 mb-[-1px] ${status === 'closed' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('closed'); setPage(1); }}
        >
          <XCircle size={16} className={status === 'closed' ? 'text-[var(--ds-danger-default)]' : ''} />
          已关闭
        </Button>
        <Button
          variant="ghost"
          className={`border-b-2 mb-[-1px] ${status === 'all' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('all'); setPage(1); }}
        >
          全部
        </Button>
      </div>

      {/* 搜索栏 */}
      <Input
        icon={<Search size={16} />}
        wrapperClassName="mb-5"
        placeholder="搜索拉取请求..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {/* 列表 */}
      {isLoading ? (
        <Empty
          icon={<div className="w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin" />}
          title="加载中..."
        />
      ) : error ? (
        <Empty
          icon={<AlertCircle size={32} className="text-[var(--ds-danger-default)]" />}
          title={error}
          action={{ label: '重试', onClick: fetchPulls }}
        />
      ) : pulls.length === 0 ? (
        <>{status === 'open' ? (
          <Empty
            icon={<GitPullRequest size={40} />}
            title="没有开放的拉取请求"
            description={repoBranches.length <= 1 ? '创建多个分支后才能创建拉取请求' : '创建一个新的拉取请求来合并分支'}
            action={currentUser && repoBranches.length > 1 ? { label: '创建第一个拉取请求', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <Empty
            icon={<GitMerge size={40} />}
            title="没有已合并的拉取请求"
            description="已合并的拉取请求会显示在这里"
          />
        )}</>
      ) : (
        <div className="flex flex-col border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] overflow-hidden">
          {pulls.map(pr => (
            <Link
              key={pr.id}
              href={`/${username}/${repoName}/pulls/${pr.id}`}
              className="flex gap-3 p-4 border-b border-[var(--ds-border-default)] no-underline text-[var(--ds-text-primary)] transition-colors hover:bg-[var(--ds-surface-subtle)] last:border-b-0"
            >
              <div className="flex-shrink-0 pt-0.5">
                <StatusIcon status={pr.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[15px] font-medium text-[var(--ds-accent-default)]">{pr.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.status === 'open' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' : pr.status === 'merged' ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]' : 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'}`}>
                    {getStatusText(pr.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5 text-[13px]">
                  <span className="flex items-center gap-1 text-[var(--ds-text-secondary)] bg-[var(--ds-surface-subtle)] px-2 py-0.5 rounded">
                    <GitBranch size={14} />
                    {pr.sourceBranch}
                  </span>
                  <ArrowRight size={14} className="text-[var(--ds-text-secondary)]" />
                  <span className="flex items-center gap-1 text-[var(--ds-text-secondary)] bg-[var(--ds-surface-subtle)] px-2 py-0.5 rounded">
                    {pr.targetBranch}
                  </span>
                  {pr.sourceRepo && (
                    <span className="text-xs text-[var(--ds-text-secondary)] ml-2">
                      ← 来自 {pr.sourceRepo.fullName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--ds-text-secondary)]">
                  <span className="flex items-center gap-1">
                    #{pr.id.slice(0, 8)} • 由 {pr.author?.username} 提交
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTimeAgo(pr.createdAt)}
                  </span>
                  {pr.commentsCount > 0 && (
                    <span className="flex items-center gap-1 text-[var(--ds-text-secondary)]">
                      💬 {pr.commentsCount} 条评论
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-[var(--ds-text-secondary)]">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 创建模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建拉取请求"
        maxWidth="560px"
        footer={
          <ModalFooter
            onCancel={() => setShowCreateModal(false)}
            onConfirm={handleCreate}
            confirmLabel="创建拉取请求"
            confirmLoading={isCreating}
          />
        }
      >
        <Field label="标题 *">
          <Input
            id="pr-new-title"
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="拉取请求标题"
            required
          />
        </Field>
        <Field label="描述">
          <Input
            id="pr-new-content"
            multiline
            rows={6}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="详细描述你的更改..."
          />
        </Field>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="源分支 *">
              <Select
                id="pr-source-branch"
                value={newSourceBranch}
                onChange={e => setNewSourceBranch(e.target.value)}
                required
                options={repoBranches.filter(b => b.name !== newTargetBranch).map(b => ({ value: b.name, label: b.name }))}
              />
            </Field>
          </div>
          <div className="pb-2 text-[var(--ds-text-secondary)]">
            <ArrowRight size={24} />
          </div>
          <div className="flex-1">
            <Field label="目标分支 *">
              <Select
                id="pr-target-branch"
                value={newTargetBranch}
                onChange={e => setNewTargetBranch(e.target.value)}
                required
                options={repoBranches.filter(b => b.name !== newSourceBranch).map(b => ({ value: b.name, label: b.name }))}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
    </PageLayoutContent></PageLayout>
  );
}
