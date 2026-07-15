'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api/client';
import { Button, Input, Modal, Field } from '@/components/design';
import toast from 'react-hot-toast';

interface RepoForkRequestModalProps {
  isOpen: boolean; onClose: () => void; username: string; repoName: string; onSubmit: () => Promise<void>;
}

export default function RepoForkRequestModal({ isOpen, onClose, username, repoName, onSubmit }: RepoForkRequestModalProps) {
  const [forkRequestMessage, setForkRequestMessage] = useState('');
  const [isSubmittingForkRequest, setIsSubmittingForkRequest] = useState(false);

  const handleSubmitForkRequest = async () => {
    setIsSubmittingForkRequest(true);
    try {
      const data = await api.post(`/api/v1/repos/${username}/${repoName}/fork-request`, { message: forkRequestMessage });
      if (data.code === 200) { toast.success('Fork 申请已提交！'); onClose(); setForkRequestMessage(''); onSubmit(); }
      else toast.error(data.message || '提交失败');
    } catch { toast.error('提交失败'); }
    finally { setIsSubmittingForkRequest(false); }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="申请 Fork 仓库"
      maxWidth="512px"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmittingForkRequest}>取消</Button>
          <Button variant="primary" size="md" onClick={handleSubmitForkRequest} disabled={isSubmittingForkRequest} loading={isSubmittingForkRequest}>
            提交申请
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--ds-text-secondary)] mb-4">你正在申请 Fork 仓库 <strong>{username}/{repoName}</strong>。请填写申请说明，让仓库所有者了解你的目的。</p>
      <Field label="申请说明（可选）">
      
              <Input id="fork-request-message" multiline placeholder="请说明你 Fork 此仓库的目的..." value={forkRequestMessage} onChange={e => setForkRequestMessage(e.target.value)} rows={4} />
      </Field>
    </Modal>
  );
}
