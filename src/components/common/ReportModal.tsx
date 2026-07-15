'use client';

import React, { useState } from 'react';
import { Card, Button, Modal, Field, Input } from '@/components/design';

interface ReportModalProps {
  targetType: string;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  discussion: '讨论', issue: 'Issue', pullrequest: '合并请求',
  comment: '评论', repository: '仓库', user: '用户',
};

const REPORT_REASONS = [
  { value: 'spam', label: '垃圾信息' }, { value: 'abuse', label: '辱骂骚扰' },
  { value: 'inappropriate', label: '不当内容' }, { value: 'copyright', label: '侵权内容' },
  { value: 'fraud', label: '欺诈钓鱼' }, { value: 'other', label: '其他原因' },
];

export default function ReportModal({ targetType, targetId, targetTitle, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { setError('请选择举报原因'); return; }
    setSubmitting(true); setError('');
    try {
      const token = (() => {
        if (typeof document === 'undefined') return null;
        for (const c of document.cookie.split(';')) { const t = c.trim(); if (t.startsWith('access_token=')) return t.slice(t.indexOf('=') + 1); }
        return null;
      })();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/v1/reports', { method: 'POST', headers, body: JSON.stringify({ targetType, targetId, reason, description: description.trim() }) });
      const data = await res.json();
      if (data.code === 200 || data.code === 201 || res.ok) { setSuccess(true); setTimeout(() => onClose(), 1500); }
      else setError(data.message || '举报失败，请稍后重试');
    } catch { setError('网络错误，请重试'); }
    finally { setSubmitting(false); }
  };

  const typeLabel = TARGET_TYPE_LABELS[targetType] || targetType;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`举报${typeLabel}`}
      footer={success ? undefined : (
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="danger" size="md" onClick={handleSubmit} disabled={submitting || !reason} loading={submitting}>
            {submitting ? '提交中...' : '提交举报'}
          </Button>
        </>
      )}
    >
        {targetTitle && (
          <Card variant="subtle" padding="md" className="!p-2.5 text-[13px] text-[var(--ds-text-secondary)] mb-4">
            举报对象：<span className="text-[var(--ds-text-primary)] font-medium">{targetTitle}</span>
          </Card>
        )}

        {success ? (
          <div className="text-center py-8 text-[var(--ds-success-default)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-3">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="font-medium">举报已提交</p>
            <p className="text-[13px] text-[var(--ds-text-secondary)] mt-1">感谢你的反馈，我们会尽快处理</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <span className="block text-sm font-medium mb-2 text-[var(--ds-text-primary)]">举报原因 <span className="text-[var(--ds-danger-default)]">*</span></span>
              <div className="flex flex-col gap-1.5">
                {REPORT_REASONS.map(r => (
                  <label key={r.value} className={`flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] cursor-pointer transition-all ${reason === r.value ? 'bg-[var(--ds-accent-subtle)] border border-[var(--ds-accent-default)]' : 'bg-[var(--ds-surface-subtle)] border border-transparent'}`}>
                    <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={e => { setReason(e.target.value); setError(''); }} />
                    <span className="text-sm text-[var(--ds-text-primary)]">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="详细说明（可选）">
              <Input id="report-description" multiline value={description} onChange={e => setDescription(e.target.value)} placeholder="请提供更多细节，帮助我们更好地处理举报..." />
            </Field>

            {error && <div className="p-2.5 bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)] text-[13px] mb-3">{error}</div>}
          </>
        )}
    </Modal>
  );
}
