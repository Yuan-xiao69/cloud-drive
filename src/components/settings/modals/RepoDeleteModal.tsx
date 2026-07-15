'use client';
import React from 'react';
import { Button, Modal, ModalFooter } from '@/components/design';

interface RepoDeleteModalProps {
  isOpen: boolean;
  repoName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function RepoDeleteModal({
  isOpen,
  repoName,
  onCancel,
  onConfirm,
  loading = false,
}: RepoDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="确认删除仓库"
      footer={
        <ModalFooter
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmLabel={loading ? '删除中...' : '确认删除'}
          confirmDanger
          confirmLoading={loading}
        />
      }
    >
      <p className="text-sm text-[var(--ds-text-primary)]">
        确定要删除仓库 <strong>{repoName}</strong> 吗？
      </p>
      <p className="text-sm text-[var(--ds-danger-default)] mt-2">
        此操作不可恢复，所有相关数据将被永久删除。
      </p>
    </Modal>
  );
}
