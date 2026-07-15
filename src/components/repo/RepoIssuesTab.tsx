'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusIcon, IssueIcon } from '@/components/repo/RepoIcons';
import { useIssues } from './hooks/useIssues';
import { Button, Card, Input, Modal, Field } from '@/components/design';
import type { Issue, IssueStatus } from './RepoTypes';
import toast from 'react-hot-toast';

interface RepoIssuesTabProps {
  username: string; repoName: string; issues?: Issue[]; issuesTotal?: number;
  issueStatus?: IssueStatus; onStatusChange?: (status: IssueStatus) => void;
  showIssueModal?: boolean; onShowModalChange?: (show: boolean) => void;
  onCreateIssue?: () => Promise<void>; onFetchIssues?: (status: string) => void;
}

export default function RepoIssuesTab(props: RepoIssuesTabProps) {
  const { username, repoName } = props;
  const hook = useIssues({ username, repoName });
  const issues = (props.issues ?? hook.issues) as Issue[];
  const issueStatus = props.issueStatus ?? hook.status;
  const setIssueStatus = props.onStatusChange ?? hook.setStatus;
  const isLoading = hook.isLoading;

  const [showModal, setShowModal] = useState(false);
  const showIssueModal = props.showIssueModal ?? showModal;
  const onShowModalChange = props.onShowModalChange ?? setShowModal;

  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueContent, setNewIssueContent] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState('normal');
  const [newIssueTemplate, setNewIssueTemplate] = useState('');
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    setIsCreatingIssue(true);
    try { await hook.createIssue({ title: newIssueTitle, content: newIssueContent, labels: [], priority: newIssuePriority, templateType: newIssueTemplate || undefined }); onShowModalChange(false); setNewIssueTitle(''); setNewIssueContent(''); setNewIssuePriority('normal'); setNewIssueTemplate(''); if (props.onFetchIssues) props.onFetchIssues(issueStatus); }
    catch { toast.error('创建失败'); }
    finally { setIsCreatingIssue(false); }
  };

  const btnPrimary = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[var(--ds-accent-default)] border border-[var(--ds-accent-default)] hover:bg-[var(--ds-accent-hover)] disabled:opacity-50 transition-colors';

  return (
    <div>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--ds-border-default)] mb-4">
        <div className="flex items-center gap-3">
          <select className="px-3 py-1.5 text-sm text-[var(--ds-text-primary)] bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] outline-none" value={issueStatus} onChange={e => { const ns = e.target.value as IssueStatus; setIssueStatus(ns); if (props.onFetchIssues) props.onFetchIssues(ns); }}>
            <option value="open">开放</option><option value="closed">已关闭</option><option value="all">全部</option>
          </select>
          <span className="text-sm text-[var(--ds-text-secondary)]">{hook.total} 个问题</span>
        </div>
        <Button className={btnPrimary} onClick={() => onShowModalChange(true)}><PlusIcon />新建问题</Button>
      </div>

      {isLoading && issues.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[var(--ds-text-secondary)]"><span>加载中...</span></div>
      ) : issues.length > 0 ? (
        <div className="flex flex-col gap-2">
          {issues.map(issue => {
            const i = issue as any;
            const priorityColors: Record<string, string> = { urgent: 'bg-[var(--ds-danger-default)]', high: 'bg-[var(--ds-warning-default)]', normal: 'bg-[var(--ds-accent-default)]', low: 'bg-[var(--ds-fg-muted)]' };
            const priorityIcons: Record<string, string> = { urgent: '🔴', high: '🟠', normal: '🔵', low: '⚪' };
            const templateIcons: Record<string, string> = { bug: '🐛', feature: '✨', question: '❓' };
            return (
              <Card key={i.id} className="flex items-center gap-3 hover:border-[var(--ds-accent-default)] transition-colors">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <IssueIcon />
                  {i.priority && i.priority !== 'normal' && (
                    <span className="text-xs" title={`优先级: ${i.priority}`}>{priorityIcons[i.priority] || ''}</span>
                  )}
                  {i.templateType && (
                    <span className="text-xs" title={`类型: ${i.templateType}`}>{templateIcons[i.templateType] || ''}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/${username}/${repoName}/issues/${i.id}`} className="text-sm font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-accent-default)] no-underline">{i.title}</Link>
                    {i.relatedFileId && (
                      <span className="text-xs text-[var(--ds-text-secondary)]" title="关联文件">
                        📎 关联文件
                      </span>
                    )}
                  </div>
                  <span className="block text-xs text-[var(--ds-text-secondary)] mt-0.5">由 <strong>{i.author?.username || i.authorUsername}</strong> 创建于 {new Date(i.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <span className="text-xs text-[var(--ds-text-secondary)]">{i.commentsCount} 评论</span>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]"><IssueIcon /><h3 className="mt-2 text-sm">暂无{issueStatus === 'open' ? '开放' : issueStatus === 'closed' ? '已关闭' : ''}问题</h3></div>
      )}

      {showIssueModal && (
        <Modal isOpen onClose={() => onShowModalChange(false)} title="新建问题" maxWidth="512px" footer={
          <>
            <Button variant="secondary" onClick={() => onShowModalChange(false)}>取消</Button>
            <Button className={btnPrimary} onClick={handleCreateIssue} disabled={!newIssueTitle.trim() || isCreatingIssue}>{isCreatingIssue ? '创建中...' : '创建问题'}</Button>
          </>
        }>
          <div className="flex flex-col gap-4">
            {/* 引导文案 */}
            <Card variant="subtle" className="bg-[var(--ds-accent-subtle)] border-[var(--ds-accent-default)]">
              <p className="text-xs text-[var(--ds-accent-default)]">描述你遇到的问题或请求，越具体越好</p>
            </Card>

            <Field label="标题 *"><Input id="issue-title" type="text" placeholder="问题标题" value={newIssueTitle} onChange={e => setNewIssueTitle(e.target.value)} /></Field>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="issue-priority" className="text-sm font-medium text-[var(--ds-text-primary)]">优先级</label>
                <select id="issue-priority" className="px-3 py-2 text-sm text-[var(--ds-text-primary)] bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] outline-none focus:border-[var(--ds-accent-default)]" value={newIssuePriority} onChange={e => setNewIssuePriority(e.target.value)}>
                  <option value="urgent">🔴 紧急</option>
                  <option value="high">🟠 高</option>
                  <option value="normal">🔵 普通</option>
                  <option value="low">⚪ 低</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="issue-template" className="text-sm font-medium text-[var(--ds-text-primary)]">模板类型</label>
                <select id="issue-template" className="px-3 py-2 text-sm text-[var(--ds-text-primary)] bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] outline-none focus:border-[var(--ds-accent-default)]" value={newIssueTemplate} onChange={e => setNewIssueTemplate(e.target.value)}>
                  <option value="">无模板</option>
                  <option value="bug">🐛 Bug 报告</option>
                  <option value="feature">✨ 功能请求</option>
                  <option value="question">❓ 提问</option>
                </select>
              </div>
            </div>

            <Field label="描述"><Input id="issue-content" multiline rows={5} className="min-h-[120px]" placeholder="详细描述你的问题..." value={newIssueContent} onChange={e => setNewIssueContent(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
