// Enhanced Admin Email Settings Tab Component
// 邮件配置管理组件

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { tokenManager } from '@/lib/api/client';

type EmailProviderType = 'qq' | 'aliyun' | 'sendgrid' | 'mailgun' | 'smtp';

interface EmailConfigData {
  configured: boolean;
  type: EmailProviderType | null;
  user: string | null;
}

const PROVIDERS: { value: EmailProviderType; label: string; desc: string }[] = [
  { value: 'qq', label: 'QQ 邮箱', desc: '使用 QQ 邮箱 SMTP 服务发送' },
  { value: 'aliyun', label: '阿里邮箱', desc: '使用阿里云邮箱 SMTP 服务发送' },
  { value: 'sendgrid', label: 'SendGrid', desc: '使用 SendGrid API 发送' },
  { value: 'mailgun', label: 'Mailgun', desc: '使用 Mailgun API 发送' },
  { value: 'smtp', label: '自定义 SMTP', desc: '使用自定义 SMTP 服务器发送' },
];

export default function AdminEmailEnhanced() {
  const [config, setConfig] = useState<EmailConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [type, setType] = useState<EmailProviderType>('qq');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('465');
  const [secure, setSecure] = useState(true);
  const [apiKey, setApiKey] = useState('');

  // 操作状态
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = tokenManager.getAccessToken();

  // 加载配置
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/email', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setConfig(data.data);
        if (data.data.type) {
          setType(data.data.type);
        }
        if (data.data.user) {
          setUser(data.data.user);
          setFrom(data.data.user);
        }
      } else {
        setError(data.message || '加载邮件配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // 清除提示消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/admin/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, user, pass: pass || undefined, from: from || undefined, host: host || undefined, port: parseInt(port) || undefined, secure, apiKey: apiKey || undefined }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setMessage({ type: 'success', text: data.message || '邮件配置已保存' });
        setPass('');
        fetchConfig();
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '网络错误' });
    } finally {
      setSaving(false);
    }
  };

  // 测试发送
  const handleTest = async () => {
    if (!testEmail.trim()) {
      setMessage({ type: 'error', text: '请输入测试邮箱地址' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setMessage({ type: 'success', text: data.message || '测试邮件发送成功！请检查收件箱。' });
      } else {
        setMessage({ type: 'error', text: data.message || '发送失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '网络错误' });
    } finally {
      setTesting(false);
    }
  };

  const isSMTPType = type === 'qq' || type === 'aliyun' || type === 'smtp';
  const isAPIType = type === 'sendgrid' || type === 'mailgun';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20" style={{ color: 'var(--color-fg-muted)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border-default)', borderTopColor: 'var(--color-accent-fg)' }} />
        <p className="mt-4 text-sm">加载邮件配置...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-fg-default)' }}>
            <svg className="inline-block mr-2 -mt-0.5" width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--color-fg-default)' }}>
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
            </svg>
            邮件配置
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>
            配置邮件发送服务，用于验证码、通知等
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config?.configured && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-fg)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/></svg>
              已配置 · {PROVIDERS.find(p => p.value === config.type)?.label || config.type}
            </span>
          )}
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-colors"
            style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-canvas-subtle)', color: 'var(--color-fg-default)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 00-5 5v1.5a.25.25 0 01-.5 0V8a5.5 5.5 0 0110.585-2.08l.005.004 2.414 2.414a.25.25 0 01-.353.353l-2.414-2.414-.004-.005A5 5 0 008 3z"/></svg>
            刷新
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm"
          style={{
            background: message.type === 'success' ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            borderColor: message.type === 'success' ? 'var(--color-success-fg)' : 'var(--color-danger-fg)',
            color: message.type === 'success' ? 'var(--color-success-fg)' : 'var(--color-danger-fg)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            {message.type === 'success' ? (
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/>
            ) : (
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"/>
            )}
          </svg>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：服务商选择 */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-fg-default)' }}>邮件服务商</h3>
            <div className="flex flex-col gap-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => setType(provider.value)}
                  className="flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-colors"
                  style={{
                    borderColor: type === provider.value ? 'var(--color-accent-fg)' : 'var(--color-border-default)',
                    background: type === provider.value ? 'var(--color-accent-subtle)' : 'var(--color-canvas-subtle)',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: type === provider.value ? 'var(--color-accent-fg)' : 'var(--color-fg-default)' }}>
                    {provider.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{provider.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：配置表单 */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-fg-default)' }}>
              配置详情
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-fg-subtle)' }}>
                当前选择：{PROVIDERS.find(p => p.value === type)?.label}
              </span>
            </h3>

            <div className="space-y-4">
              {/* 发件人邮箱 */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                  发件人邮箱
                </label>
                <input
                  type="email"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'var(--color-canvas-subtle)',
                    borderColor: 'var(--color-border-default)',
                    color: 'var(--color-fg-default)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-fg-subtle)' }}>
                  {isSMTPType ? 'QQ/阿里邮箱填写完整邮箱地址，如 123456@qq.com' : '发件人邮箱地址'}
                </p>
              </div>

              {/* SMTP 配置 */}
              {isSMTPType && (
                <>
                  {/* 授权码 / 密码 */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                      {type === 'qq' ? 'QQ 邮箱授权码' : type === 'aliyun' ? '阿里邮箱密码' : 'SMTP 密码'}
                    </label>
                    <input
                      type="password"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder={type === 'qq' ? '请输入 QQ 邮箱授权码（非登录密码）' : '请输入密码'}
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        background: 'var(--color-canvas-subtle)',
                        borderColor: 'var(--color-border-default)',
                        color: 'var(--color-fg-default)',
                      }}
                    />
                    {type === 'qq' && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-fg-subtle)' }}>
                        获取路径：QQ 邮箱 → 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务 → 生成授权码
                      </p>
                    )}
                  </div>

                  {/* SMTP 服务器 */}
                  {type === 'smtp' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                          SMTP 服务器地址
                        </label>
                        <input
                          type="text"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          placeholder="smtp.example.com"
                          className="w-full px-3 py-2 rounded-md border text-sm"
                          style={{
                            background: 'var(--color-canvas-subtle)',
                            borderColor: 'var(--color-border-default)',
                            color: 'var(--color-fg-default)',
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                            端口
                          </label>
                          <input
                            type="number"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border text-sm"
                            style={{
                              background: 'var(--color-canvas-subtle)',
                              borderColor: 'var(--color-border-default)',
                              color: 'var(--color-fg-default)',
                            }}
                          />
                        </div>
                        <div className="flex items-end gap-3 pb-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-fg-default)' }}>
                            <input
                              type="checkbox"
                              checked={secure}
                              onChange={(e) => setSecure(e.target.checked)}
                              className="cursor-pointer"
                            />
                            使用 SSL/TLS
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* API Key 配置 */}
              {isAPIType && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`请输入 ${type === 'sendgrid' ? 'SendGrid' : 'Mailgun'} API Key`}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'var(--color-canvas-subtle)',
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-fg-default)',
                    }}
                  />
                </div>
              )}

              {/* 发件人名称（可选） */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-fg-default)' }}>
                  发件人名称 <span className="font-normal" style={{ color: 'var(--color-fg-subtle)' }}>(可选)</span>
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="留空则使用发件人邮箱"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'var(--color-canvas-subtle)',
                    borderColor: 'var(--color-border-default)',
                    color: 'var(--color-fg-default)',
                  }}
                />
              </div>

              {/* 分隔线 */}
              <hr style={{ borderColor: 'var(--color-border-muted)' }} />

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !user.trim() || (isSMTPType && !pass.trim() && !config?.configured)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--color-accent-fg)' }}
                >
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          </div>

          {/* 测试发送 */}
          <div className="rounded-lg border p-4 mt-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-fg-default)' }}>
              <svg className="inline-block mr-1.5 -mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--color-fg-muted)' }}>
                <path d="M9.5 13a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              </svg>
              发送测试
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--color-fg-muted)' }}>
              保存配置后，发送一封测试邮件验证配置是否正确
            </p>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="输入接收测试邮件的邮箱地址"
                className="flex-1 px-3 py-2 rounded-md border text-sm"
                style={{
                  background: 'var(--color-canvas-subtle)',
                  borderColor: 'var(--color-border-default)',
                  color: 'var(--color-fg-default)',
                }}
              />
              <button
                onClick={handleTest}
                disabled={testing || !testEmail.trim() || !config?.configured}
                className="px-4 py-2 rounded-md border text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: 'var(--color-border-default)',
                  background: 'var(--color-canvas-subtle)',
                  color: 'var(--color-fg-default)',
                }}
              >
                {testing ? '发送中...' : '发送测试'}
              </button>
            </div>
            {!config?.configured && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-attention-fg)' }}>
                请先保存邮件配置后再发送测试邮件
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
