'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Button, Input, Field } from '@/components/design';
import { ShieldCheck } from '@/components/design/icons';
import toast from 'react-hot-toast';

interface MFASettingsProps {
  onClose?: () => void;
}

interface MFASetupData {
  secret: string;
  qrCode: string;
  otpauth: string;
}

export default function MFASettings({ onClose }: MFASettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [step, setStep] = useState<'initial' | 'password' | 'setup' | 'verify' | 'recovery' | 'disabled'>('initial');
  const [password, setPassword] = useState('');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载 MFA 状态
  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    try {
      const data = await api.get<{ enabled: boolean; configured: boolean }>('/api/v1/users/mfa');
      if (data.code === 200) {
        setIsEnabled(data.data.enabled);
        setIsConfigured(data.data.configured);
      }
    } catch (e) {
      console.error('Load MFA status failed:', e);
    }
  };

  const handleEnableClick = () => {
    if (isEnabled) {
      setStep('disabled');
    } else if (isConfigured) {
      setStep('verify');
    } else {
      setStep('password');
    }
    setError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post<MFASetupData>('/api/v1/users/mfa', { action: 'init', password });

      if (data.code === 200) {
        setSetupData(data.data);
        setStep('setup');
        setPassword('');
      } else {
        setError(data.message || '初始化失败');
      }
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post<{ recoveryCodes: string[] }>('/api/v1/users/mfa', { action: 'enable', code });

      if (data.code === 200) {
        setRecoveryCodes(data.data.recoveryCodes || []);
        setIsEnabled(true);
        setIsConfigured(true);
        setStep('recovery');
        setCode('');
      } else {
        setError(data.message || '验证失败');
      }
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !code || code.length !== 6) {
      setError('请输入密码和 6 位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post('/api/v1/users/mfa', { action: 'disable', password, code });

      if (data.code === 200) {
        setIsEnabled(false);
        setIsConfigured(false);
        setStep('initial');
        setPassword('');
        setCode('');
        toast.success('两步验证已禁用');
        onClose?.();
      } else {
        setError(data.message || '禁用失败');
      }
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('恢复码已复制到剪贴板');
  };

  return (
    <div className="mfa-settings">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-[var(--ds-text-primary)]">两步验证</h1>
        <p className="text-[13px] text-[var(--ds-text-secondary)] mt-1">为你的账号添加额外的安全保护</p>
      </div>

      {/* 状态显示 */}
      <div className="setting-item">
        <div className="setting-info">
          <h3 className="setting-title">
            <ShieldCheck className="icon-inline" />
            两步验证状态
          </h3>
          <p className="setting-desc">
            {isEnabled ? '已启用 - 你的账号受到额外保护' : '未启用'}
          </p>
        </div>
        <Button
          variant={isEnabled ? 'secondary' : 'primary'}
          onClick={handleEnableClick}
        >
          {isEnabled ? '管理' : '启用'}
        </Button>
      </div>

      {/* 密码验证步骤 */}
      {step === 'password' && (
        <div className="mfa-step">
          <h3>验证密码</h3>
          <p className="step-desc">请输入你的密码以继续</p>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <Field label="当前密码">
                <Input id="mfa-password" type="password" placeholder="当前密码" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" type="button" onClick={() => setStep('initial')}>
                取消
              </Button>
              <Button type="submit" loading={loading}>
                {loading ? '验证中...' : '继续'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 设置步骤 - 显示二维码 */}
      {step === 'setup' && setupData && (
        <div className="mfa-step">
          <h3>扫描二维码</h3>
          <p className="step-desc">
            使用身份验证器应用（如 Google Authenticator、Microsoft Authenticator）扫描下方二维码
          </p>

          <div className="qr-code-container">
            <img src={setupData.qrCode} alt="MFA 二维码" className="qr-code" />
          </div>

          <div className="secret-key">
            <p>或者手动输入密钥：</p>
            <code className="secret-code">{setupData.secret}</code>
          </div>

          <form onSubmit={handleSetupSubmit}>
            <div className="mb-4">
              <Field label="输入验证码">
                <Input id="mfa-setup-code" type="text" placeholder="6 位数字验证码" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
              </Field>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" type="button" onClick={() => setStep('initial')}>
                取消
              </Button>
              <Button type="submit" loading={loading} disabled={!loading && code.length !== 6}>
                {loading ? '验证中...' : '验证并启用'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 恢复码显示步骤 */}
      {step === 'recovery' && (
        <div className="mfa-step">
          <div className="success-banner">
            <CheckCircle className="success-icon" />
            <span>两步验证已成功启用！</span>
          </div>

          <h3>保存恢复码</h3>
          <p className="step-desc warning">
            请立即保存以下恢复码！如果无法使用身份验证器，可以使用恢复码访问你的账号。每个恢复码只能使用一次。
          </p>

          <div className="recovery-codes">
            {recoveryCodes.map((c, index) => (
              <code key={index} className="recovery-code">{c}</code>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={copyRecoveryCodes}>
              复制全部
            </Button>
            <Button type="button" onClick={() => setStep('initial')}>
              完成
            </Button>
          </div>
        </div>
      )}

      {/* 禁用步骤 */}
      {step === 'verify' && (
        <div className="mfa-step">
          <h3>验证身份</h3>
          <p className="step-desc">请输入密码和身份验证器中的验证码</p>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <Field label="密码">
                <Input id="mfa-verify-password" type="password" placeholder="当前密码" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" type="button" onClick={() => setStep('initial')}>
                取消
              </Button>
              <Button type="submit" loading={loading}>
                {loading ? '验证中...' : '继续'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 'disabled' && (
        <div className="mfa-step danger-step">
          <h3>禁用两步验证</h3>
          <p className="step-desc warning">
            警告：禁用两步验证会降低你账号的安全性。请确保你记得密码，并可以访问身份验证器。
          </p>
          <form onSubmit={handleDisableSubmit}>
            <div className="mb-4">
              <Field label="当前密码">
                <Input id="mfa-disable-password" type="password" placeholder="输入密码" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <div className="mb-4">
              <Field label="身份验证器验证码">
                <Input id="mfa-disable-code" type="text" placeholder="6 位验证码" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
              </Field>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" type="button" onClick={() => setStep('initial')}>
                取消
              </Button>
              <Button variant="danger" type="submit" loading={loading} disabled={!loading && (!password || code.length !== 6)}>
                {loading ? '处理中...' : '确认禁用'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .mfa-settings { padding: 0; }
        .section-desc { color: var(--ds-text-secondary); font-size: 14px; }
        .setting-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 0; border-bottom: 1px solid var(--ds-border-default);
        }
        .setting-info { flex: 1; }
        .setting-title { font-size: 16px; font-weight: 500; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .icon-inline { width: 16px; height: 16px; }
        .setting-desc { color: var(--ds-text-secondary); font-size: 14px; }
        .mfa-step { margin-top: 24px; padding: 20px; background: var(--ds-surface-subtle); border-radius: 6px; }
        .mfa-step h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
        .step-desc { color: var(--ds-text-secondary); font-size: 14px; margin-bottom: 16px; }
        .step-desc.warning { color: var(--ds-warning-default); }
        .text-danger { color: var(--ds-danger-default); font-size: 14px; margin-top: 8px; }
        .qr-code-container { display: flex; justify-content: center; margin: 20px 0; }
        .qr-code { width: 200px; height: 200px; border: 1px solid var(--ds-border-default); border-radius: 4px; }
        .secret-key { text-align: center; margin-bottom: 20px; }
        .secret-key p { font-size: 14px; color: var(--ds-text-secondary); margin-bottom: 8px; }
        .secret-code { display: inline-block; padding: 8px 16px; background: var(--ds-surface-default); border: 1px solid var(--ds-border-default); border-radius: 6px; font-family: monospace; font-size: 16px; letter-spacing: 2px; }
        .success-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--ds-success-subtle); color: var(--ds-success-default); border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
        .success-icon { width: 20px; height: 20px; }
        .recovery-codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
        .recovery-code { padding: 8px 12px; background: var(--ds-surface-default); border: 1px solid var(--ds-border-default); border-radius: 4px; font-family: monospace; font-size: 14px; text-align: center; }
        .danger-step { background: var(--ds-danger-subtle); }
        .danger-step h3 { color: var(--ds-danger-default); }
        @media (max-width: 600px) {
          .recovery-codes { grid-template-columns: 1fr; }
          .qr-code { width: 160px; height: 160px; }
        }
      `}</style>
    </div>
  );
}

// CheckCircle 图标组件
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" version="1.1" width="16" height="16">
      <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm6.31 5.44l-4.28 6.94a.75.75 0 01-1.14.04L4.28 8.35a.75.75 0 111.07-1.06l2.34 2.31 4.25-6.94a.75.75 0 111.38.78z"/>
    </svg>
  );
}
