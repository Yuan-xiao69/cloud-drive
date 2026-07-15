'use client';
import React from 'react';
import { Button, Modal, Field, Input } from '@/components/design';

interface BlockUserModalProps { isOpen: boolean; userId: string; reason: string; isBlocking: boolean; onUserIdChange: (id: string) => void; onReasonChange: (reason: string) => void; onCancel: () => void; onConfirm: () => void }

export default function BlockUserModal({ isOpen, userId, reason, isBlocking, onUserIdChange, onReasonChange, onCancel, onConfirm }: BlockUserModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="屏蔽用户"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>取消</Button>
          <Button onClick={onConfirm} disabled={!userId.trim() || isBlocking} loading={isBlocking}>
            {isBlocking ? '屏蔽中...' : '确认屏蔽'}
          </Button>
        </>
      }
    >
      <Field label="用户ID">
        <Input id="block-user-id" type="text" value={userId} onChange={e => onUserIdChange(e.target.value)} placeholder="输入要屏蔽的用户ID" />
      </Field>
      <Field label="屏蔽原因（可选）">
        <Input id="block-reason" type="text" value={reason} onChange={e => onReasonChange(e.target.value)} placeholder="输入屏蔽原因" />
      </Field>
    </Modal>
  );
}
