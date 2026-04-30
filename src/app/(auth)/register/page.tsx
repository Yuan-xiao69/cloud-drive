'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

const LogoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 32 32" fill="currentColor" style={{ color: 'var(--color-fg-default)' }}>
    <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameTimeout, setUsernameTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (username.length < 1) {
      setUsernameStatus('idle');
      return;
    }

    if (usernameTimeout) {
      clearTimeout(usernameTimeout);
    }

    setUsernameStatus('checking');

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/users/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        const isTaken = data.data?.taken ?? false;
        setUsernameStatus(isTaken ? 'taken' : 'available');
      } catch {
        // 若检测失败，默认标记可用（避免阻断注册）
        setUsernameStatus('available');
      }
    }, 500);

    setUsernameTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [username]);

  // Password strength
  const getPasswordStrength = (pwd: string): PasswordStrength => {
    if (pwd.length === 0) return 'weak';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    if (score === 4) return 'strong';
    return 'very-strong';
  };

  const passwordStrength = getPasswordStrength(password);

  const getStrengthLabel = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak': return '弱';
      case 'medium': return '中等';
      case 'strong': return '强';
      case 'very-strong': return '非常强';
    }
  };

  const getStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak': return 'var(--color-danger-fg)';
      case 'medium': return 'var(--color-attention-fg)';
      case 'strong': return 'var(--color-success-fg)';
      case 'very-strong': return 'var(--color-success-fg)';
    }
  };

  const getStrengthWidth = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak': return '25%';
      case 'medium': return '50%';
      case 'strong': return '75%';
      case 'very-strong': return '100%';
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

const isFormValid = () => {
    // 用户名至少1位，邮箱不为空，密码至少8位，两次密码一致
    return (
      username.length >= 1 &&
      (usernameStatus === 'available' || usernameStatus === 'idle') && // 允许未检查的用户名
      email.length > 0 &&
      password.length >= 8 &&
      password === confirmPassword
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid()) {
      setError('请填写所有必填字段');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ username, email, password });
      if (result.success) {
        router.push('/login?registered=true');
      } else {
        setError(result.message || '注册失败，请重试');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-header">
            <LogoIcon />
            <h1 className="auth-title">创建你的账号</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                用户名
              </label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`form-input ${usernameStatus === 'available' ? 'input-success' : ''} ${usernameStatus === 'taken' ? 'input-error' : ''}`}
                  placeholder="用户名"
                  required
                  autoComplete="username"
                  autoFocus
                />
                {usernameStatus === 'checking' && (
                  <span className="input-status checking">检查中...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="input-status success"><CheckIcon /> 可用</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="input-status error"><XIcon /> 已存在</span>
                )}
              </div>
              <p className="form-hint">
                用户名长度 1-39 个字符
              </p>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                电子邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="电子邮箱地址"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="密码"
                required
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-progress"
                      style={{
                        width: getStrengthWidth(passwordStrength),
                        backgroundColor: getStrengthColor(passwordStrength)
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: getStrengthColor(passwordStrength) }}>
                    {getStrengthLabel(passwordStrength)}
                  </span>
                </div>
              )}
              <p className="form-hint">
                至少 8 个字符
              </p>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                确认密码
              </label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`form-input ${passwordsMatch ? 'input-success' : ''} ${passwordsMismatch ? 'input-error' : ''}`}
                  placeholder="再次输入密码"
                  required
                  autoComplete="new-password"
                />
                {passwordsMatch && (
                  <span className="input-status success"><CheckIcon /></span>
                )}
                {passwordsMismatch && (
                  <span className="input-status error"><XIcon /></span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? '创建中...' : '创建账号'}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <span className="auth-footer-text">已有账号？</span>
            <Link href="/login" className="auth-link">
              登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
