// Enhanced Admin Email Settings Tab Component
// 邮件配置管理组件

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button, Card, Input, Badge, Field } from '@/components/design';

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

  // 加载配置
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<EmailConfigData>('/api/v1/admin/email');
      if (res.code === 200) {
        setConfig(res.data);
        if (res.data.type) {
          setType(res.data.type);
        }
        if (res.data.user) {
          setUser(res.data.user);
          setFrom(res.data.user);
        }
      } else {
        setError(res.message || '加载邮件配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await api.put<{ message?: string }>('/api/v1/admin/email', { type, user, pass: pass || undefined, from: from || undefined, host: host || undefined, port: parseInt(port) || undefined, secure, apiKey: apiKey || undefined });
      if (res.code === 200) {
        setMessage({ type: 'success', text: res.message || '邮件配置已保存' });
        setPass('');
        fetchConfig();
      } else {
        setMessage({ type: 'error', text: res.message || '保存失败' });
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
      const res = await api.post<{ message?: string }>('/api/v1/admin/email/test', { to: testEmail });
      if (res.code === 200) {
        setMessage({ type: 'success', text: res.message || '测试邮件发送成功！请检查收件箱。' });
      } else {
        setMessage({ type: 'error', text: res.message || '发送失败' });
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
      <div className="flex flex-col items-center justify-center p-20 text-[var(--ds-text-secondary)]">
        <div className="w-8 h-8 border-2 border-[var(--ds-border-default)] rounded-[var(--ds-radius-full)] animate-spin" style={{ borderTopColor: 'var(--ds-accent-default)' }} />
        <p className="mt-4 text-sm">加载邮件配置...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">
            <svg className="inline-block mr-2 -mt-0.5 text-[var(--ds-text-primary)]" width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
            </svg>
            邮件配置
          </h1>
          <p className="text-sm mt-1 text-[var(--ds-text-secondary)]">
            配置邮件发送服务，用于验证码、通知等
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config?.configured && (
            <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/></svg>
              已配置 · {PROVIDERS.find(p => p.value === config.type)?.label || config.type}
            </Badge>
          )}
          <Button
            variant="secondary"
            onClick={fetchConfig}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 00-5 5v1.5a.25.25 0 01-.5 0V8a5.5 5.5 0 0110.585-2.08l.005.004 2.414 2.414a.25.25 0 01-.353.353l-2.414-2.414-.004-.005A5 5 0 008 3z"/></svg>
            刷新
          </Button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[var(--ds-radius-md)] border text-sm"
          style={{
            background: message.type === 'success' ? 'var(--ds-success-subtle)' : 'var(--ds-danger-subtle)',
            borderColor: message.type === 'success' ? 'var(--ds-success-default)' : 'var(--ds-danger-default)',
            color: message.type === 'success' ? 'var(--ds-success-default)' : 'var(--ds-danger-default)',
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
          <Card variant="surface" padding="md">
            <h3 className="text-sm font-semibold mb-3 text-[var(--ds-text-primary)]">邮件服务商</h3>
            <div className="flex flex-col gap-2">
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider.value}
                  onClick={() => setType(provider.value)}
                  className="flex flex-col items-start gap-0.5 p-3 border text-left transition-colors"
                  style={{
                    borderColor: type === provider.value ? 'var(--ds-accent-default)' : 'var(--ds-border-default)',
                    background: type === provider.value ? 'var(--ds-accent-subtle)' : 'var(--ds-surface-subtle)',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: type === provider.value ? 'var(--ds-accent-default)' : 'var(--ds-text-primary)' }}>
                    {provider.label}
                  </span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">{provider.desc}</span>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* 右侧：配置表单 */}
        <div className="lg:col-span-2">
          <Card variant="surface" padding="md">
            <h3 className="text-sm font-semibold mb-4 text-[var(--ds-text-primary)]">
              配置详情
              <span className="ml-2 text-xs font-normal text-[var(--ds-text-tertiary)]">
                当前选择：{PROVIDERS.find(p => p.value === type)?.label}
              </span>
            </h3>

            <div className="space-y-4">
              {/* 发件人邮箱 */}
              <div>
                <label htmlFor="email-from-address" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                  发件人邮箱
                </label>
                <Input
                  id="email-from-address"
                  type="email"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="your@email.com"
                />
                <p className="text-xs mt-1 text-[var(--ds-text-tertiary)]">
                  {isSMTPType ? 'QQ/阿里邮箱填写完整邮箱地址，如 123456@qq.com' : '发件人邮箱地址'}
                </p>
              </div>

              {/* SMTP 配置 */}
              {isSMTPType && (
                <>
                  {/* 授权码 / 密码 */}
                  <div>
                    <label htmlFor="email-password" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                      {type === 'qq' ? 'QQ 邮箱授权码' : type === 'aliyun' ? '阿里邮箱密码' : 'SMTP 密码'}
                    </label>
                    <Input
                      id="email-password"
                      type="password"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder={type === 'qq' ? '请输入 QQ 邮箱授权码（非登录密码）' : '请输入密码'}
                    />
                    {type === 'qq' && (
                      <p className="text-xs mt-1 text-[var(--ds-text-tertiary)]">
                        获取路径：QQ 邮箱 → 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务 → 生成授权码
                      </p>
                    )}
                  </div>

                  {/* SMTP 服务器 */}
                  {type === 'smtp' && (
                    <>
                      <div>
                        <label htmlFor="email-smtp-host" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                          SMTP 服务器地址
                        </label>
                        <Input
                          id="email-smtp-host"
                          type="text"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="email-smtp-port" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                            端口
                          </label>
                          <Input
                            id="email-smtp-port"
                            type="number"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end gap-3 pb-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--ds-text-primary)]">
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
                  <label htmlFor="email-api-key" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                    API Key
                  </label>
                  <Input
                    id="email-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`请输入 ${type === 'sendgrid' ? 'SendGrid' : 'Mailgun'} API Key`}
                  />
                </div>
              )}

              {/* 发件人名称（可选） */}
              <div>
                <label htmlFor="email-from-name" className="block text-sm font-medium mb-1.5 text-[var(--ds-text-primary)]">
                  发件人名称 <span className="font-normal text-[var(--ds-text-tertiary)]">(可选)</span>
                </label>
                <Input
                  id="email-from-name"
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="留空则使用发件人邮箱"
                />
              </div>

              {/* 分隔线 */}
              <hr className="border-[var(--ds-border-muted)]" />

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !user.trim() || (isSMTPType && !pass.trim() && !config?.configured)}
                >
                  {saving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </div>
          </Card>

          {/* 测试发送 */}
          <Card variant="surface" padding="md" className="mt-4">
            <h3 className="text-sm font-semibold mb-3 text-[var(--ds-text-primary)]">
              <svg className="inline-block mr-1.5 -mt-0.5 text-[var(--ds-text-secondary)]" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.5 13a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              </svg>
              发送测试
            </h3>
            <p className="text-xs mb-3 text-[var(--ds-text-secondary)]">
              保存配置后，发送一封测试邮件验证配置是否正确
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="输入接收测试邮件的邮箱地址"
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={testing || !testEmail.trim() || !config?.configured}
              >
                {testing ? '发送中...' : '发送测试'}
              </Button>
            </div>
            {!config?.configured && (
              <p className="text-xs mt-2" style={{ color: 'var(--ds-warning-default)' }}>
                请先保存邮件配置后再发送测试邮件
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
