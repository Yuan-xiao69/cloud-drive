'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Input, Field, PageLayout, PageLayoutContent } from '@/components/design';

const Logo = () => (
  <div className="flex items-center justify-center gap-2 mb-6">
    <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" className="text-[var(--ds-accent-default)]">
      <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
    </svg>
    <span className="font-display text-xl font-bold text-[var(--ds-text-primary)]">文件平台</span>
  </div>
);

const digitInputClass =
  'w-[48px] h-[56px] text-center font-mono text-[24px] border rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] border-[var(--ds-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)] focus:border-[var(--ds-accent-default)] disabled:opacity-50';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const code = codeDigits.join('');
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...codeDigits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setCodeDigits(newDigits);
    codeRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.code === 200) { setCountdown(60); setMessage('验证码已重新发送'); setError(''); }
      else setError(data.message || '发送失败');
    } catch { setError('网络错误，请稍后重试'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (password.length < 8) { setError('密码至少8位'); return; }
    if (!/[a-zA-Z]/.test(password)) { setError('密码必须包含字母'); return; }
    if (!/[0-9]/.test(password)) { setError('密码必须包含数字'); return; }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    if (code.length !== 6) { setError('请输入6位验证码'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setMessage('密码重置成功！即将跳转到登录页面...');
        setTimeout(() => router.push('/login'), 3000);
      } else setError(data.message || '重置失败');
    } catch { setError('网络错误，请稍后重试'); }
    finally { setIsLoading(false); }
  };

  return (
    <PageLayout containerWidth="narrow"><PageLayoutContent>
      <Card variant="surface" padding="lg" className="py-9">
        <Logo />

        <h1 className="font-display text-[20px] font-bold text-[var(--ds-text-primary)] text-center mb-1">
          重置密码
        </h1>
        <p className="font-ui text-[13px] text-[var(--ds-text-secondary)] text-center mb-6">
          输入验证码和新密码
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-[var(--ds-danger-subtle)] border border-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)] text-sm text-[var(--ds-danger-default)]">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-[var(--ds-success-subtle)] border border-[var(--ds-success-default)] rounded-[var(--ds-radius-sm)] text-sm text-[var(--ds-success-default)]">
              {message}
            </div>
          )}

          <Field label="电子邮箱">
            <Input id="email" type="email" value={email} disabled />
          </Field>

          <Field label="验证码">
            <div className="flex gap-2">
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { codeRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(index, e)}
                  onPaste={handleCodePaste}
                  disabled={isLoading}
                  className={digitInputClass}
                />
              ))}
            </div>
            <div className="mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleResend} disabled={countdown > 0}>
                {countdown > 0 ? `${countdown}s后重发` : '重发验证码'}
              </Button>
            </div>
          </Field>

          <Field label="新密码">
            <Input id="password" type="password" placeholder="至少8位，包含字母和数字" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
          </Field>

          <Field label="确认密码">
            <Input id="confirmPassword" type="password" placeholder="再次输入新密码" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isLoading} />
          </Field>

          <Button type="submit" variant="primary" size="lg" block loading={isLoading} disabled={!code || !password || !confirmPassword}>
            {isLoading ? '重置中...' : '重置密码'}
          </Button>
        </form>

        <div className="flex justify-center mt-6 pt-6 border-t border-[var(--ds-border-muted)]">
          <span className="text-[13px] text-[var(--ds-text-secondary)]">想起密码了？</span>
          <Link href="/login" className="ml-2 text-[13px] text-[var(--ds-accent-default)] hover:underline font-semibold">
            返回登录
          </Link>
        </div>
      </Card>
    </PageLayoutContent></PageLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <PageLayout containerWidth="narrow"><PageLayoutContent>
        <Card variant="surface" padding="lg" className="py-9">
          <Logo />
          <h1 className="font-display text-[20px] font-bold text-[var(--ds-text-primary)] text-center">
            重置密码
          </h1>
          <p className="font-ui text-sm text-[var(--ds-text-secondary)] text-center mt-2">
            加载中...
          </p>
        </Card>
      </PageLayoutContent></PageLayout>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
