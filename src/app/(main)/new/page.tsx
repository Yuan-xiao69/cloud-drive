'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api/client';
import { Card, Button, Input, Field, PageLayout, PageLayoutContent } from '@/components/design';

export default function NewRepoPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 1 as 0 | 1,
    initReadme: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  // Redirect if not logged in (等待 auth 加载完成再判断)
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/new');
    }
  }, [isLoading, isAuthenticated, router]);

  // Check repo name availability
  const checkNameRef = useRef(0);
  const checkName = async (name: string) => {
    if (!name || name.length < 1) {
      setNameAvailable(null);
      setNameError('');
      return;
    }

    if (!/^[a-zA-Z0-9一-龥-._]+$/.test(name)) {
      setNameError('只能包含字母、数字、中文、连字符、下划线和点');
      setNameAvailable(false);
      return;
    }

    const id = ++checkNameRef.current;
    try {
      const data = await api.get<boolean>('/api/v1/repos/check-name', { name });
      if (id !== checkNameRef.current) return;
      setNameAvailable(data.data);
      setNameError(data.data ? '' : '仓库名已被占用');
    } catch {
      if (id !== checkNameRef.current) return;
      setNameAvailable(null);
    }
  };

  const handleNameChange = (value: string) => {
    setForm({ ...form, name: value });
    checkName(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('请输入仓库名称');
      return;
    }

    if (!/^[a-zA-Z0-9一-龥-._]+$/.test(form.name)) {
      setError('仓库名称格式不正确');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.post<{ owner?: { username: string }; name: string }>('/api/v1/repos', form);
      if (data.code === 201) {
        // 使用 API 返回的 owner.username 构建跳转路径
        const username = data.data.owner?.username || user?.username;
        const repoName = data.data.name;
        router.push(`/${username}/${repoName}`);
      } else {
        setError(data.message);
      }
    } catch {
      setError('创建失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageLayout containerWidth="wide"><PageLayoutContent>
      <div className="flex-1 max-w-[var(--ds-container-max)] mx-auto px-4 py-8 w-full">
        {/* 标题区域 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--ds-text-primary)]">创建新仓库</h1>
          <p className="text-[var(--ds-text-secondary)] mt-1">
            创建一个新仓库来组织和分享你的项目
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 表单卡片 */}
          <form id="repo-form" className="flex-1 max-w-2xl" onSubmit={handleSubmit}><Card variant="subtle" padding="lg">
            {/* 仓库所有者 */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--ds-border-muted)]">
              <span className="text-sm font-medium text-[var(--ds-text-secondary)]">所有者</span>
              <Link href={`/${user?.username}`} className="w-6 h-6 rounded-full bg-[var(--ds-accent-default)] text-white flex items-center justify-center text-xs font-bold no-underline">
                <span>{user?.username?.[0]?.toUpperCase()}</span>
              </Link>
              <span className="font-medium text-[var(--ds-text-primary)]">{user?.username}</span>
              <span className="text-[var(--ds-text-secondary)] mx-1">/</span>
            </div>

            {/* 仓库名称 */}
            <Field label="仓库名称 *" className="mb-4">
              <div className="relative">
                <Input
                  id="repo-name"
                  type="text"
                  name="name"
                  placeholder="仓库名称"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  state={nameError ? 'error' : nameAvailable === true ? 'success' : 'normal'}
                  required
                />
                {form.name && nameAvailable !== null && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs ${nameAvailable ? 'text-[var(--ds-success-default)]' : 'text-[var(--ds-danger-default)]'}`}>
                    {nameAvailable ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                        </svg>
                        可用
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                        </svg>
                        已被占用
                      </>
                    )}
                  </span>
                )}
              </div>
            </Field>
            {nameError && <p className="text-[var(--ds-danger-default)] text-xs -mt-3 mb-4">{nameError}</p>}

            {/* 描述 */}
            <Field label="描述 (可选)">
              <Input
                id="repo-description"
                multiline
                placeholder="简单描述一下这个仓库是做什么的"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </Field>

            {/* 可见性 */}
            <div className="mb-4">
              <span className="block text-sm font-medium text-[var(--ds-text-primary)] mb-2">可见性</span>
              <div className="flex gap-3">
                <label
                  className={`flex-1 flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${form.visibility === 1 ? 'border-[var(--ds-accent-default)] bg-[var(--ds-accent-subtle)]' : 'border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)]'}`}
                  aria-label="公开"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="1"
                    checked={form.visibility === 1}
                    onChange={() => setForm({ ...form, visibility: 1 })}
                    className="mt-0.5 accent-[var(--ds-accent-default)]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[var(--ds-text-primary)]">公开</span>
                    <span className="block text-xs text-[var(--ds-text-secondary)] mt-0.5">任何人都能查看此仓库</span>
                  </div>
                </label>
                <label
                  className={`flex-1 flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${form.visibility === 0 ? 'border-[var(--ds-accent-default)] bg-[var(--ds-accent-subtle)]' : 'border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)]'}`}
                  aria-label="私有"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="0"
                    checked={form.visibility === 0}
                    onChange={() => setForm({ ...form, visibility: 0 })}
                    className="mt-0.5 accent-[var(--ds-accent-default)]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[var(--ds-text-primary)]">私有</span>
                    <span className="block text-xs text-[var(--ds-text-secondary)] mt-0.5">只有你才能访问此仓库</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 初始化 README */}
            <div className="mb-4">
              <label className="flex items-start gap-3 cursor-pointer" aria-label="初始化 README 文件">
                <input
                  type="checkbox"
                  aria-label="初始化 README 文件"
                  checked={form.initReadme}
                  onChange={(e) => setForm({ ...form, initReadme: e.target.checked })}
                  className="mt-1 accent-[var(--ds-accent-default)]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--ds-text-primary)]">初始化这个仓库</span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">添加 README.md 文件来介绍你的项目</span>
                </span>
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 text-sm text-[var(--ds-danger-default)] bg-[var(--ds-danger-subtle)] border border-[var(--ds-danger-default)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1.5a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25V8.5H7.25A.75.75 0 016.5 7.75zM8 6a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--ds-border-muted)]">
              <Link href="/" className="inline-flex">
                <Button type="button" variant="secondary" size="md">取消</Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={isSubmitting || !form.name || nameAvailable === false}
                icon={!isSubmitting ? <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h7A2.5 2.5 0 0114 2.5v9.05a2.5 2.5 0 01-.732 1.767l-3.5 3.5a2.5 2.5 0 01-3.536 0l-3.5-3.5A2.5 2.5 0 012 11.55V2.5z"/></svg> : undefined}
              >
                {isSubmitting ? '创建中...' : '创建仓库'}
              </Button>
            </div>
          </Card></form>

          {/* 提示信息 */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <Card variant="subtle">
              <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--ds-text-primary)] mb-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                </svg>
                创建仓库后
              </h3>
              <ul className="space-y-2 text-sm text-[var(--ds-text-secondary)] list-disc pl-5">
                <li>使用 Git 命令克隆仓库到本地</li>
                <li>添加文件并提交</li>
                <li>邀请协作者参与开发</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

    </PageLayoutContent></PageLayout>
  );
}
