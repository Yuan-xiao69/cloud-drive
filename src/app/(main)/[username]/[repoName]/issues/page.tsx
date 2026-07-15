'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button, Input, Field, PageLayout, PageLayoutContent, Badge, Modal, ModalFooter, Empty } from '@/components/design';
import {
  Plus,
  Search,
  AlertCircle,
  Circle,
  CheckCircle,
  Tag,
  Clock,
  X,
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import { useIssues } from '@/components/repo/hooks/useIssues';
import type { IssueItem } from '@/components/repo/hooks/useIssues';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/providers';
import toast from 'react-hot-toast';

export default function IssuesListPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;

  const {
    issues, total, page, totalPages,
    status, setStatus,
    searchQuery, setSearchQuery,
    isLoading, error,
    setPage, fetchIssues,
  } = useIssues({ username, repoName });

  // 创建 Issue 模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLabels, setNewLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('var(--ds-accent-default)');
  const [isCreating, setIsCreating] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const { user: currentUser } = useAuth();

  // 创建 Issue
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const data = await api.post(`/api/v1/repos/${username}/${repoName}/issues`, {
        title: newTitle.trim(),
        content: newContent.trim(),
        labels: newLabels.map(l => ({ name: l.name, color: l.color })),
      });
      if (data.code === 201) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewLabels([]);
        fetchIssues();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setIsCreating(false);
    }
  };

  // 添加标签
  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    setNewLabels(prev => [...prev, { id: Date.now().toString(), name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName('');
  };

  // 移除标签
  const handleRemoveLabel = (id: string) => {
    setNewLabels(prev => prev.filter(l => l.id !== id));
  };

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <Header />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold m-0 flex items-center gap-2">问题</h1>
          <span className="bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)] text-sm font-medium px-2 py-0.5 rounded-full">{total}</span>
        </div>
        {currentUser && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            新建问题
          </Button>
        )}
      </div>

      {/* 状态标签栏 */}
      <div className="flex border-b border-[var(--ds-border-default)] mb-5">
        <Button
          variant="ghost"
          className={`border-b-2 -mb-px ${status === 'open' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('open'); setPage(1); }}
        >
          <Circle size={16} className="text-[var(--ds-success-default)]" />
          开放 {total > 0 && `(${issues.filter(i => i.status === 'open').length})`}
        </Button>
        <Button
          variant="ghost"
          className={`border-b-2 -mb-px ${status === 'closed' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('closed'); setPage(1); }}
        >
          <CheckCircle size={16} className="text-[var(--ds-accent-default)]" />
          已关闭 {total > 0 && `(${issues.filter(i => i.status === 'closed').length})`}
        </Button>
        <Button
          variant="ghost"
          className={`border-b-2 -mb-px ${status === 'all' ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold' : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'}`}
          onClick={() => { setStatus('all'); setPage(1); }}
        >
          全部
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] mb-5">
        <Search size={16} className="text-[var(--ds-text-secondary)] shrink-0" />
        <Input
          type="text"
          placeholder="搜索问题..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 列表 */}
      {isLoading ? (
        <Empty title="加载中..." />
      ) : error ? (
        <Empty icon={<AlertCircle size={32} />} title={error} action={{ label: '重试', onClick: fetchIssues }} />
      ) : issues.length === 0 ? (
        status === 'open' ? (
          <Empty
            icon={<AlertCircle size={48} className="opacity-50" />}
            title="没有问题"
            description="这个问题仓库还没有开放的问题"
            action={currentUser ? { label: '创建第一个问题', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <Empty
            icon={<CheckCircle size={48} className="opacity-50" />}
            title="没有已关闭的问题"
            description="已关闭的问题会显示在这里"
          />
        )
      ) : (
        <div className="flex flex-col border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] overflow-hidden">
          {issues.map(issue => (
            <Link
              key={issue.id}
              href={`/${username}/${repoName}/issues/${issue.id}`}
              className="flex gap-3 px-4 py-4 border-b border-[var(--ds-border-default)] no-underline text-inherit transition-colors hover:bg-[var(--ds-surface-subtle)] last:border-b-0"
            >
              <div className="shrink-0 pt-0.5">
                {issue.status === 'open' ? (
                  <span className="text-[var(--ds-success-default)]"><Circle size={20} /></span>
                ) : (
                  <span className="text-[var(--ds-accent-default)]"><CheckCircle size={20} /></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[15px] font-medium text-[var(--ds-accent-default)]">{issue.title}</span>
                  {issue.labels && issue.labels.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {issue.labels.slice(0, 3).map((label, i) => (
                        <Badge
                          key={label.name + i}
                          variant="default"
                          className="font-medium"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                            borderColor: label.color,
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="text-xs text-[var(--ds-text-secondary)]">+{issue.labels.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--ds-text-secondary)]">
                  <span className="flex items-center gap-1">
                    #{issue.id.slice(0, 8)} • 由 {issue.author?.username} 提交
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTimeAgo(issue.createdAt)}
                  </span>
                  {issue.commentsCount > 0 && (
                    <span className="flex items-center gap-1">
                      💬 {issue.commentsCount} 条评论
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
        title="创建 Issue"
        maxWidth="640px"
        footer={
          <ModalFooter
            onCancel={() => setShowCreateModal(false)}
            onConfirm={() => formRef.current?.requestSubmit()}
            confirmLabel="创建问题"
            cancelLabel="取消"
            confirmLoading={isCreating}
          />
        }
      >
        <form ref={formRef} onSubmit={handleCreate}>
          <Field label="标题 *">
            <Input
              id="issue-create-title"
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="问题标题"
              required
            />
          </Field>
          <Field label="描述">
            <Input
              id="issue-create-content"
              multiline
              rows={8}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="详细描述你遇到的问题或建议..."
            />
          </Field>
          <Field label="标签">
            <div className="flex gap-2 items-center">
              <Input
                id="issue-create-label"
                type="text"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                placeholder="标签名称"
              />
              <input
                type="color"
                className="w-10 h-[38px] p-0.5 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] cursor-pointer"
                value={newLabelColor}
                onChange={e => setNewLabelColor(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleAddLabel}>
                添加
              </Button>
            </div>
          </Field>
            {newLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {newLabels.map(label => (
                  <Badge
                    key={label.id}
                    variant="default"
                    className="font-medium"
                    style={{
                      backgroundColor: label.color + '22',
                      color: label.color,
                      borderColor: label.color,
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                  >
                    <Tag size={12} />
                    {label.name}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveLabel(label.id)}
                    >
                      <X size={12} />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
        </form>
      </Modal>
    </PageLayoutContent></PageLayout>
  );
}
