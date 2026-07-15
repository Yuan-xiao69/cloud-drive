'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, Card, Button, Input, Field, PageLayout, PageLayoutContent } from '@/components/design';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/providers/AuthProvider';

const categories = ['general', 'qa', 'share', 'suggestion', 'announce'];
const categoryNames: Record<string, string> = { general: '闲聊', qa: '问答', share: '分享', suggestion: '建议', announce: '公告' };
const categoryOptions = categories.map(c => ({ value: c, label: categoryNames[c] }));

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex-1 min-w-0 flex items-center justify-center">
      <div className="flex items-center gap-2 text-[var(--ds-text-primary)]-muted">
        <div className="w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin" />
        <span>{text}</span>
      </div>
    </div>
  );
}

export default function NewDiscussionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [form, setForm] = useState({ category: 'general', title: '', content: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 未登录时重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/discussions/new');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = tagInput.replace(/,/g, '').trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!form.content.trim()) { setError('内容不能为空'); return; }
    setIsSubmitting(true);
    try {
      const data = await api.post<{ id: string }>('/api/v1/discussions', { ...form, tags });
      if (data.code === 200) router.push(`/discussions/${data.data.id}`);
      else setError(data.message || '发布失败');
    } catch { setError('网络错误'); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <PageLayout containerWidth="medium"><PageLayoutContent><LoadingState text="加载中..." /></PageLayoutContent></PageLayout>;
  if (!isAuthenticated) return <PageLayout containerWidth="medium"><PageLayoutContent><LoadingState text="正在跳转登录..." /></PageLayoutContent></PageLayout>;

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <div className="p-6">
          <nav className="flex items-center gap-1 text-sm text-[var(--ds-text-primary)]-muted mb-4">
            <Link href="/discussions" className="text-[var(--ds-accent-default)] hover:underline no-underline">讨论</Link><span>/</span><span className="text-[var(--ds-text-primary)]">发起新讨论</span>
          </nav>
          {/* 引导文案 */}
          <div className="mb-5 p-4 bg-[var(--ds-accent-subtle)] border border-[var(--ds-accent-default)] rounded-[var(--ds-radius-lg)]">
            <p className="text-sm text-[var(--ds-accent-default)] font-medium">分享经验、探讨方案、提出建议——这里没有标准答案，只有更好的想法</p>
          </div>

          <Card padding="lg">
            <h1 className="text-xl font-semibold text-[var(--ds-text-primary)] mb-6">发起新讨论</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Field label="分类">
                <Select options={categoryOptions} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </Field>
              <Field label="标题">
                <div className="relative">
                  <Input type="text" placeholder="清晰的标题有助于获得更多回复" value={form.title} onChange={e => setForm({ ...form, title: e.target.value.slice(0, 200) })} maxLength={200} />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${form.title.length > 180 ? (form.title.length >= 200 ? 'text-[var(--ds-danger-default)]' : 'text-[var(--ds-warning-default)]') : 'text-[var(--ds-text-tertiary)]'}`}>{form.title.length}/200</span>
                </div>
              </Field>
              <Field label="标签" hint="逗号或回车分隔，最多10个">
                <Input
                  type="text"
                  placeholder="输入标签后按回车添加"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                />
              </Field>
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap -mt-3 mb-2">
                  {tags.map(tag => (
                    <span key={tag} role="button" tabIndex={0} className="inline-flex items-center gap-1 px-[var(--ds-space-2)] py-[1px] text-[11px] font-semibold rounded-[var(--ds-radius-full)] bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] cursor-pointer" onClick={() => removeTag(tag)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeTag(tag); } }}>
                      {tag} &times;
                    </span>
                  ))}
                </div>
              )}
              <Field label="内容 *" hint="支持 Markdown 格式，可以添加文本块、列表、链接等">
                <Input multiline placeholder="详细描述你的想法... 支持 Markdown" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              </Field>
              {error && <div className="p-3 text-sm text-[var(--ds-danger-default)] bg-[var(--ds-danger-subtle)] border border-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)]">{error}</div>}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" size="md" loading={isSubmitting}>{isSubmitting ? '发布中...' : '发布讨论'}</Button>
                <Link href="/discussions" className="inline-flex"><Button variant="ghost" size="md">取消</Button></Link>
              </div>
            </form>
          </Card>
          <Card variant="subtle" className="mt-4">
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-2">发布提示</h3>
            <ul className="text-sm text-[var(--ds-text-primary)]-muted space-y-1.5 list-disc pl-5">
              <li>选择正确的分类能让你的讨论更容易被发现</li>
              <li>添加相关标签帮助他人快速了解讨论主题</li>
              <li>清晰的标题有助于获得更多回复</li>
              <li>使用 Markdown 格式可以让内容更加易读</li>
              <li>友善交流，尊重他人观点</li>
            </ul>
          </Card>
      </div>
    </PageLayoutContent></PageLayout>
  );
}
