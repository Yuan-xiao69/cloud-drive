'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api/client';
import { getAvatarDisplayUrl } from '@/lib/storage';
import SettingsSection from './SettingsSection';
import { LogoIcon } from '@/components/icons/Icons';
import type { User } from '@/types';
import { Button, Input, Field, Modal, ModalFooter } from '@/components/design';
import toast from 'react-hot-toast';

interface ProfileSettingsProps { user: User; onUpdateUser: (data: Partial<User>) => void }

export default function ProfileSettings({ user, onUpdateUser }: ProfileSettingsProps) {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setAvatar(reader.result as string);
      try {
        const formData = new FormData(); formData.append('avatar', file);
        const result = await api.post<{ avatarUrl: string }>('/api/v1/users/avatar', formData);
        if (result.code === 200 && result.data?.avatarUrl) { setAvatar(result.data.avatarUrl); onUpdateUser({ avatarUrl: result.data.avatarUrl }); }
        else { toast.error(result.message || '头像上传失败'); setAvatar(user?.avatarUrl || null); }
      } catch { toast.error('头像上传失败，请重试'); setAvatar(user?.avatarUrl || null); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true); setSaveSuccess(false);
    try {
      const payload: Record<string, string> = {};
      if (username !== user?.username) { payload.username = username; }
      if (bio !== (user?.bio || '')) { payload.bio = bio; }
      if (location !== (user?.location || '')) { payload.location = location; }
      if (website !== (user?.website || '')) { payload.website = website; }

      if (!Object.keys(payload).length) { toast('没有需要保存的更改'); setIsSaving(false); return; }

      const result = await api.patch<{ username: string; bio: string; location: string; website: string }>('/api/v1/me/profile', payload);
      if (result.code === 200) {
        onUpdateUser(result.data || {});
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch { toast.error('保存失败，请重试'); }
    finally { setIsSaving(false); }
  };

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    setSendingCode(true);
    try {
      const res = await api.post('/api/v1/me/email/send-code', { email: newEmail });
      if (res.code === 200) {
        setCodeSent(true);
        toast.success('验证码已发送');
      } else {
        toast.error(res.message || '发送失败');
      }
    } catch { toast.error('发送失败'); }
    finally { setSendingCode(false); }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode) { toast.error('请输入验证码'); return; }
    setVerifying(true);
    try {
      const res = await api.post('/api/v1/me/email/verify', { email: newEmail, code: verifyCode });
      if (res.code === 200) {
        onUpdateUser({ email: newEmail } as Partial<User>);
        toast.success('邮箱已更新');
        setEmailModalOpen(false);
        setNewEmail(''); setVerifyCode(''); setCodeSent(false);
      } else {
        toast.error(res.message || '验证失败');
      }
    } catch { toast.error('验证失败'); }
    finally { setVerifying(false); }
  };

  return (
    <SettingsSection title="个人资料" description="管理你的公开信息和头像">
      {/* Avatar — 对齐样本：80px圆形 + 更换头像 + 提示 */}
      <div className="flex items-center gap-4 mb-6">
        {(avatar || user?.avatarUrl) ? (
          <img src={getAvatarDisplayUrl(avatar || user?.avatarUrl) ?? undefined} alt="头像" className="w-20 h-20 rounded-full object-cover border border-[var(--ds-border-default)]" />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--ds-accent-subtle)] border border-[var(--ds-border-default)] text-[var(--ds-accent)] font-ui text-[26px] font-bold">{(user?.username || 'U')[0].toUpperCase()}</div>
        )}
        <div>
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
            更换头像
          </Button>
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-1">支持 JPG、PNG，最大 2MB</p>
        </div>
        <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
      </div>

      {/* UID — 只读 */}
      <div className="flex items-baseline gap-3 mb-5">
        <span className="font-ui text-sm font-semibold text-[var(--ds-text)]">UID</span>
        <span className="font-ui text-sm text-[var(--ds-text)]">{user?.uid || '—'}</span>
      </div>

      {/* Email — 仅自己可见，修改需验证码 */}
      <div className="flex items-center gap-4 mb-5">
        <span className="font-ui text-sm font-semibold text-[var(--ds-text)]">邮箱</span>
        <span className="font-ui text-sm text-[var(--ds-text)]">{user?.email || '—'}</span>
        <Button variant="secondary" size="sm" onClick={() => { setNewEmail(''); setVerifyCode(''); setCodeSent(false); setEmailModalOpen(true); }}>修改</Button>
      </div>

      {/* Form — 垂直布局 */}
      <div className="max-w-[440px] space-y-5">
        <Field label="用户名">
          <Input id="profile-username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="你的用户名" />
        </Field>
        <Field label="简介" hint="最多 160 个字符">
          <Input id="profile-bio" multiline value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="简短介绍你自己..." />
        </Field>
        <Field label="位置">
          <Input id="profile-location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="例如：北京" />
        </Field>
        <Field label="网站">
          <Input id="profile-website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
        </Field>
      </div>

      {/* Save bar — 对齐样本：顶部分隔线 */}
      <div className="flex items-center gap-3 pt-6 mt-6 border-t border-[var(--ds-border-muted)]">
        <Button variant="primary" size="md" loading={isSaving} onClick={handleSave}>保存更改</Button>
        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--ds-success-default)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            已保存
          </span>
        )}
      </div>
      {/* 修改邮箱弹窗 */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="修改邮箱" maxWidth="440px"
        footer={
          <ModalFooter
            onCancel={() => setEmailModalOpen(false)}
            onConfirm={handleVerifyEmail}
            confirmLabel={verifying ? '验证中...' : '确认修改'}
            confirmLoading={verifying}
          />
        }
      >
        <Field label="新邮箱地址">
          <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="请输入新邮箱" disabled={codeSent} />
        </Field>
        {!codeSent ? (
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={handleSendCode} loading={sendingCode}>发送验证码</Button>
          </div>
        ) : (
          <Field label="验证码" className="mt-3">
            <Input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="请输入邮箱收到的验证码" />
          </Field>
        )}
      </Modal>
    </SettingsSection>
  );
}
