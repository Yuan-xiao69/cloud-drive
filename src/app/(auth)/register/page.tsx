'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, Field, PageLayout, PageLayoutContent } from '@/components/design';

async function registerUser(username: string, email: string, password: string) {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

const Logo = () => (
  <div className="flex items-center justify-center gap-2 mb-6">
    <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" className="text-[var(--ds-accent-default)]">
      <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
    </svg>
    <span className="font-display text-xl font-bold text-[var(--ds-text-primary)]">文件平台</span>
  </div>
);

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await registerUser(username, email, password);
      if (result.code === 200) {
        router.push('/login?registered=true');
      } else {
        setError(result.message || '注册失败');
      }
    } catch {
      setError('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout containerWidth="narrow"><PageLayoutContent>
      <Card variant="surface" padding="lg" className="py-9">
        <Logo />

        <h1 className="font-display text-[20px] font-bold text-[var(--ds-text-primary)] text-center mb-1">
          创建新账号
        </h1>
        <p className="font-ui text-[13px] text-[var(--ds-text-secondary)] text-center mb-6">
          已有账号？
          <Link href="/login" className="text-[var(--ds-accent-default)] hover:underline font-semibold">
            立即登录
          </Link>
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-[var(--ds-danger-subtle)] border border-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)] text-sm text-[var(--ds-danger-default)]">
              {error}
            </div>
          )}

          <Field label="用户名">
            <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="选择用户名" required minLength={3} autoComplete="username" />
          </Field>

          <Field label="邮箱">
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="输入邮箱地址" required autoComplete="email" />
          </Field>

          <Field label="密码">
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少8个字符" required minLength={8} autoComplete="new-password" />
          </Field>

          <Button type="submit" variant="primary" size="lg" block loading={isLoading}>
            {isLoading ? '注册中...' : '注册'}
          </Button>
        </form>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--ds-border-muted)]">
          <span className="text-[13px] text-[var(--ds-text-secondary)]">已有账号？</span>
          <Link href="/login" className="text-[13px] text-[var(--ds-accent-default)] hover:underline font-semibold">
            立即登录
          </Link>
        </div>
      </Card>
    </PageLayoutContent></PageLayout>
  );
}
