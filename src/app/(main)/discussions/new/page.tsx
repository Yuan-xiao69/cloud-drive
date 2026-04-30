'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';

const categoryOptions = [
  { value: 'question', label: '提问 - 寻求帮助和答案' },
  { value: 'idea', label: '奇思妙想 - 分享你的新想法' },
  { value: 'request', label: '资源求助 - 寻找特定的资源' },
  { value: 'team', label: '项目组队 - 寻找志同道合的伙伴' },
  { value: 'share', label: '经验分享 - 分享你的经验和知识' },
];

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export default function NewDiscussionPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'share',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/discussions/new');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 标题验证
    if (!form.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (form.title.length > 200) {
      setError('标题不能超过 200 个字符');
      return;
    }
    // 内容验证
    if (!form.content.trim()) {
      setError('请输入内容');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get token from tokenManager
      const token = tokenManager.getAccessToken();

      const res = await fetch('/api/v1/discussions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.code === 201) {
        router.push(`/discussions/${data.data.id}`);
      } else {
        setError(data.message || '发布失败');
      }
    } catch (err) {
      setError('发布失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <Header />
        <div className="page-container">
          <div className="loading-state">正在跳转登录...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header />

      <div className="page-container">
        <div className="new-discussion-wrapper">
          {/* Breadcrumb */}
          <div className="breadcrumb-nav">
            <Link href="/discussions" className="breadcrumb-link">
              <ArrowLeftIcon />
              <span>返回讨论区</span>
            </Link>
          </div>

          <div className="new-discussion-card">
            <h1 className="new-discussion-title">发起新讨论</h1>

            <form onSubmit={handleSubmit} className="new-discussion-form">
              {/* Category */}
              <div className="form-group">
                <label className="form-label">分类</label>
                <Select
                  options={categoryOptions}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">标题</label>
                <div className="input-with-counter">
                  <Input
                    name="title"
                    placeholder="简要描述你的问题或想法"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={200}
                    required
                  />
                  <span className={`char-counter ${form.title.length > 180 ? (form.title.length >= 200 ? 'char-counter-error' : 'char-counter-warning') : ''}`}>
                    {form.title.length}/200
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="form-group">
                <label className="form-label">
                  内容 <span className="required-mark">*</span>
                </label>
                <Textarea
                  placeholder={`支持 Markdown 格式...

**示例：**

# 我的问题

大家好，我想请教一下...

\`\`\`javascript
const hello = "world";
\`\`\``}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="content-textarea"
                  required
                />
                <p className="form-hint">支持 Markdown 格式，可以添加代码块、列表、链接等</p>
              </div>

              {error && (
                <div className="error-message">{error}</div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <Link href="/discussions" className="cancel-link">
                  取消
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!form.title.trim() || !form.content.trim()}
                >
                  发布讨论
                </Button>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="tips-card">
            <h3 className="tips-title">发布提示</h3>
            <ul className="tips-list">
              <li>请选择合适的分类，以便他人找到你的讨论</li>
              <li>标题要简洁明了，描述你的问题或想法</li>
              <li>详细描述问题，附带相关代码和错误信息</li>
              <li>提问类讨论被采纳答案后请标记为"已解决"</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .new-discussion-wrapper {
          max-width: 800px;
          margin: 0 auto;
        }

        .breadcrumb-nav {
          margin-bottom: 24px;
        }

        .breadcrumb-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-fg-muted);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .breadcrumb-link:hover {
          color: var(--color-accent-fg);
        }

        .new-discussion-card {
          background: var(--color-bg-default);
          border: 1px solid var(--color-border-default);
          border-radius: 8px;
          padding: 32px;
          margin-bottom: 24px;
        }

        .new-discussion-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-fg-default);
          margin: 0 0 24px 0;
        }

        .new-discussion-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-fg-default);
        }

        .required-mark {
          color: var(--color-danger-fg);
        }

        .content-textarea {
          min-height: 250px !important;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          resize: vertical;
        }

        .form-hint {
          font-size: 12px;
          color: var(--color-fg-muted);
          margin: 0;
        }

        .error-message {
          padding: 12px 16px;
          background: var(--color-bg-danger);
          color: var(--color-danger-fg);
          border-radius: 6px;
          font-size: 14px;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid var(--color-border-default);
        }

        .cancel-link {
          color: var(--color-fg-muted);
          text-decoration: none;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .cancel-link:hover {
          background: var(--color-bg-subtle);
          color: var(--color-fg-default);
        }

        .tips-card {
          background: var(--color-bg-inset);
          border: 1px solid var(--color-border-default);
          border-radius: 8px;
          padding: 20px 24px;
        }

        .tips-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-fg-default);
          margin: 0 0 12px 0;
        }

        .tips-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: var(--color-fg-muted);
          line-height: 1.8;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--color-fg-muted);
        }

        @media (max-width: 768px) {
          .new-discussion-card {
            padding: 20px;
          }

          .form-actions {
            flex-direction: column-reverse;
            gap: 12px;
          }

          .cancel-link,
          .form-actions :global(button) {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
