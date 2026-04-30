'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const LogoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 32 32" fill="currentColor" style={{ color: 'var(--color-fg-default)' }}>
    <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
  </svg>
);

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.code === 200) {
        setCountdown(60);
        setMessage('验证码已重新发送');
        setError('');
      } else {
        setError(data.message || '发送失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('密码至少8位');
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError('密码必须包含字母');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('密码必须包含数字');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();

      if (data.code === 200) {
        setMessage('密码重置成功！即将跳转到登录页面...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.message || '重置失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <LogoIcon />
            <h1 className="auth-title">重置密码</h1>
            <p className="auth-subtitle">输入验证码和新密码</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
                {message}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                电子邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                className="form-input"
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="code" className="form-label">
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  className="form-input"
                  placeholder="6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResend}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : '重发'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                新密码
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="至少8位，包含字母和数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading || !code || !password || !confirmPassword}
            >
              {isLoading ? '重置中...' : '重置密码'}
            </button>
          </form>

          <div className="auth-footer">
            <span className="auth-footer-text">想起密码了？</span>
            <Link href="/login" className="auth-link">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <LogoIcon />
              <h1 className="auth-title">重置密码</h1>
              <p className="auth-subtitle">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
