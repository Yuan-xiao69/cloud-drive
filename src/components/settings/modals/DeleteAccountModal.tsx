'use client';
import React, { useState } from 'react';
import { Button, Modal, Field, Input } from '@/components/design';
import { api, tokenManager } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface DeleteAccountModalProps { isOpen: boolean; onClose: () => void; username?: string }

export default function DeleteAccountModal({ isOpen, onClose, username }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== username) { setError('确认输入不正确'); return; }
    const password = '';
    if (!password) return;
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/users/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirmText: `删除账号 ${username}` }), credentials: 'include' });
      const data = await res.json();
      if (data.code === 200) { toast.success('账号已删除'); tokenManager.clearTokens(); window.location.href = '/'; }
      else setError(data.message || '删除失败');
    } catch { setError('网络错误，请重试'); }
    finally { setIsLoading(false); }
  };

  const handleClose = () => { setConfirmText(''); setError(''); onClose(); };
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="删除账号"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>取消</Button>
          <Button variant="danger" onClick={handleDelete} disabled={confirmText !== username || isLoading} loading={isLoading}>
            {isLoading ? '删除中...' : '确认删除'}
          </Button>
        </>
      }
    >
      <div className="p-3 text-sm bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)] mb-4">
        此操作不可恢复！你的所有仓库、讨论、评论和数据将被永久删除。
      </div>
      <p className="text-sm text-[var(--ds-text-secondary)] mb-4">请输入你的用户名 <strong>{username}</strong> 以确认删除：</p>
      <Field label="确认用户名">
        <Input id="delete-confirm" type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={username} />
      </Field>
      {error && <p className="text-[13px] text-[var(--ds-danger-default)]">{error}</p>}
    </Modal>
  );
}
