'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';

export default function NewRepoPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

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

  // Redirect if not logged in
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/new');
    }
  }, [isAuthenticated, router]);

  // Check repo name availability
  const checkName = async (name: string) => {
    if (!name || name.length < 1) {
      setNameAvailable(null);
      setNameError('');
      return;
    }

    if (!/^[a-zA-Z0-9\u4e00-\u9fa5-._]+$/.test(name)) {
      setNameError('只能包含字母、数字、中文、连字符、下划线和点');
      setNameAvailable(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/repos/check-name?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setNameAvailable(data.data);
      setNameError(data.data ? '' : '仓库名已被占用');
    } catch {
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

    if (!/^[a-zA-Z0-9\u4e00-\u9fa5-._]+$/.test(form.name)) {
      setError('仓库名称格式不正确');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = tokenManager.getAccessToken();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.code === 200) {
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
    <div className="page">
      <Header />

      <div className="page-container">
        <div className="new-repo-layout">
          {/* 标题区域 */}
          <div className="new-repo-header">
            <h1 className="new-repo-title">创建新仓库</h1>
            <p className="new-repo-subtitle">
              创建一个新仓库来组织和分享你的项目
            </p>
          </div>

          {/* 表单卡片 */}
          <div className="new-repo-card">
            {/* 仓库所有者 */}
            <div className="new-repo-owner">
              <span className="owner-label">所有者</span>
              <Link href={`/${user?.username}`} className="owner-avatar">
                <span className="avatar-text">{user?.username?.[0]?.toUpperCase()}</span>
              </Link>
              <span className="owner-name">{user?.username}</span>
              <span className="owner-sep">/</span>
            </div>

            {/* 仓库名称 */}
            <div className="form-group">
              <label className="form-label">
                仓库名称 <span className="required">*</span>
              </label>
              <div className="name-input-wrapper">
                <input
                  type="text"
                  name="name"
                  placeholder="仓库名称"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`name-input ${nameError ? 'error' : ''} ${nameAvailable === true ? 'success' : ''}`}
                  required
                />
                {form.name && nameAvailable !== null && (
                  <span className={`name-status ${nameAvailable ? 'available' : 'taken'}`}>
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
              {nameError && <p className="field-error">{nameError}</p>}
            </div>

            {/* 描述 */}
            <div className="form-group">
              <label className="form-label">
                描述 <span className="optional">(可选)</span>
              </label>
              <textarea
                placeholder="简单描述一下这个仓库是做什么的"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* 可见性 */}
            <div className="form-group">
              <label className="form-label">可见性</label>
              <div className="visibility-options">
                <button
                  type="button"
                  className={`visibility-option ${form.visibility === 1 ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, visibility: 1 })}
                >
                  <div className="visibility-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="visibility-text">
                    <span className="visibility-title">公开</span>
                    <span className="visibility-desc">任何人都能查看此仓库</span>
                  </div>
                  <div className={`visibility-check ${form.visibility === 1 ? 'checked' : ''}`}>
                    {form.visibility === 1 && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A.75.75 0 10.28 5.565l2.5 2.5a.75.75 0 00.977-.018l5.25-5.5a.75.75 0 00-1.06-1.177z"/>
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  className={`visibility-option ${form.visibility === 0 ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, visibility: 0 })}
                >
                  <div className="visibility-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="visibility-text">
                    <span className="visibility-title">私有</span>
                    <span className="visibility-desc">只有你才能访问此仓库</span>
                  </div>
                  <div className={`visibility-check ${form.visibility === 0 ? 'checked' : ''}`}>
                    {form.visibility === 0 && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A.75.75 0 10.28 5.565l2.5 2.5a.75.75 0 00.977-.018l5.25-5.5a.75.75 0 00-1.06-1.177z"/>
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* 初始化 README */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.initReadme}
                  onChange={(e) => setForm({ ...form, initReadme: e.target.checked })}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  <span className="checkbox-title">初始化这个仓库</span>
                  <span className="checkbox-desc">添加 README.md 文件来介绍你的项目</span>
                </span>
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="form-error-banner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 22.5C3.63 22.5 0 18.87 0 14.5c0-2.62 1.31-4.93 3.33-6.31l.17-.1v-.9c0-1.82 1.95-3.47 4.5-3.47s4.5 1.65 4.5 3.47v.9l.17.1c2.02 1.38 3.33 3.69 3.33 6.31 0 4.37-3.63 8-8 8zM5.5 8.8c0-1.38 1.23-2.6 2.5-2.6s2.5 1.22 2.5 2.6v.7c0 1.38-1.23 2.6-2.5 2.6s-2.5-1.22-2.5-2.6v-.7zM8 18.5c2.21 0 4-1.79 4-4h-1.5c0 1.38-1.12 2.5-2.5 2.5S5.5 15.88 5.5 14.5H4c0 2.21 1.79 4 4 4zm0-6.5c1.27 0 2.5-1.22 2.5-2.6v-.7c0-1.38-1.23-2.6-2.5-2.6S5.5 7.32 5.5 8.7v.7c0 1.38 1.23 2.6 2.5 2.6z"/>
                </svg>
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="form-actions">
              <Link href="/" className="btn-cancel">
                取消
              </Link>
              <button
                type="submit"
                form="repo-form"
                className="btn-create"
                disabled={isSubmitting || !form.name || nameAvailable === false}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    创建中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2.5A2.5 2.5 0 014.5 0h7A2.5 2.5 0 0114 2.5v9.05a2.5 2.5 0 01-.732 1.767l-3.5 3.5a2.5 2.5 0 01-3.536 0l-3.5-3.5A2.5 2.5 0 012 11.55V2.5z"/>
                    </svg>
                    创建仓库
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="new-repo-tips">
            <div className="tip-card">
              <h3 className="tip-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                </svg>
                创建仓库后
              </h3>
              <ul className="tip-list">
                <li>使用 Git 命令克隆仓库到本地</li>
                <li>添加代码文件并提交</li>
                <li>邀请协作者参与开发</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的表单用于提交 */}
      <form id="repo-form" onSubmit={handleSubmit} style={{ display: 'none' }} />
    </div>
  );
}
