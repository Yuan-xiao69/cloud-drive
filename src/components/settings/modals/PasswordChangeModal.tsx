'use client';
import React, { useState } from 'react';
import { Button, Modal, ModalFooter, Field, Input } from '@/components/design';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface PasswordChangeModalProps { isOpen: boolean; onClose: () => void; onSuccess?: () => void }

export default function PasswordChangeModal({ isOpen, onClose, onSuccess }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) { setError('请填写所有字段'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的新密码不一致'); return; }
    if (newPassword.length < 8) { setError('新密码至少8位'); return; }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { setError('新密码必须包含字母和数字'); return; }
    setIsLoading(true);
    try {
      const data = await api.put('/api/v1/users/password', { currentPassword, newPassword });
      if (data.code === 200) { toast.success('密码修改成功'); handleClose(); onSuccess?.(); }
      else setError(data.message || '修改失败');
    } catch { setError('网络错误，请重试'); }
    finally { setIsLoading(false); }
  };

  const handleClose = () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); onClose(); };
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="更改密码"
      footer={
        <ModalFooter
          onCancel={handleClose}
          onConfirm={handleSubmit}
          confirmLabel="确认修改"
          confirmLoading={isLoading}
        />
      }
    >
      <Field label="当前密码">
        <Input id="pwd-current" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="请输入当前密码" />
      </Field>
      <Field label="新密码">
        <Input id="pwd-new" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少8位，包含字母和数字" />
      </Field>
      <Field label="确认新密码">
        <Input id="pwd-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" />
      </Field>
      {error && <p className="text-[13px] text-[var(--ds-danger-default)]">{error}</p>}
    </Modal>
  );
}
