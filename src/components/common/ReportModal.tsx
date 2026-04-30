'use client';

import React, { useState } from 'react';

/**
 * ReportModal - 统一举报弹窗组件
 * 支持 targetType: 'discussion' | 'issue' | 'pullrequest' | 'comment' | 'repository' | 'user'
 * 调用方只传 targetType / targetId / targetTitle / onClose
 */

interface ReportModalProps {
  targetType: string;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  discussion: '讨论',
  issue: 'Issue',
  pullrequest: 'Pull Request',
  comment: '评论',
  repository: '仓库',
  user: '用户',
};

const REPORT_REASONS = [
  { value: 'spam', label: '垃圾信息' },
  { value: 'abuse', label: '辱骂骚扰' },
  { value: 'inappropriate', label: '不当内容' },
  { value: 'copyright', label: '侵权内容' },
  { value: 'fraud', label: '欺诈钓鱼' },
  { value: 'other', label: '其他原因' },
];

export default function ReportModal({ targetType, targetId, targetTitle, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      setError('请选择举报原因');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = (() => {
        if (typeof document === 'undefined') return null;
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const trimmed = c.trim();
          if (trimmed.startsWith('access_token=')) {
            const idx = trimmed.indexOf('=');
            return trimmed.slice(idx + 1);
          }
        }
        return null;
      })();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (data.code === 200 || data.code === 201 || res.ok) {
        setSuccess(true);
        // 自动关闭
        setTimeout(() => onClose(), 1500);
      } else {
        setError(data.message || '举报失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = TARGET_TYPE_LABELS[targetType] || targetType;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>举报{typeLabel}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-fg-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 目标信息 */}
        {targetTitle && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--color-bg-subtle)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--color-fg-muted)',
            marginBottom: '16px',
          }}>
            举报对象：<span style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}>{targetTitle}</span>
          </div>
        )}

        {success ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: 'var(--color-success-fg)',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p style={{ fontWeight: 500 }}>举报已提交</p>
            <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
              感谢你的反馈，我们会尽快处理
            </p>
          </div>
        ) : (
          <>
            {/* 举报原因 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                举报原因 <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: reason === r.value ? 'var(--color-accent-subtle)' : 'var(--color-bg-subtle)',
                      border: reason === r.value ? '1px solid var(--color-accent-fg)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => { setReason(e.target.value); setError(''); }}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '14px' }}>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 详细说明 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                详细说明（可选）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请提供更多细节，帮助我们更好地处理举报..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-default)',
                  background: 'var(--color-canvas-default)',
                  color: 'var(--color-fg-default)',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger-fg)',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
              }}>
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={onClose}
                className="btn"
                disabled={submitting}
                style={{ opacity: submitting ? 0.5 : 1 }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-danger"
                disabled={submitting || !reason}
                style={{ opacity: submitting || !reason ? 0.5 : 1 }}
              >
                {submitting ? '提交中...' : '提交举报'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
