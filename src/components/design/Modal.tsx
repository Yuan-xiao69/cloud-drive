'use client';

import React, { useEffect, useCallback } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  /** 点击遮罩关闭（默认 true） */
  closeOnOverlay?: boolean;
}

// 关闭按钮图标
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * 标准弹窗组件 — 完全遵循 design-preview 样本规范
 *
 * 结构:
 *   Modal (overlay + centered)
 *     Card variant="elevated"
 *       Header  (title + close btn)
 *       Body    (content)
 *       Footer  (actions, right-aligned)
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '448px',
  closeOnOverlay = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // 焦点陷阱：Tab/Shift+Tab 在 Modal 内循环
      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first?.focus();

        const trapFocus = (e: KeyboardEvent) => {
          if (e.key !== 'Tab') return;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        };
        modal.addEventListener('keydown', trapFocus);
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          document.body.style.overflow = '';
          modal.removeEventListener('keydown', trapFocus);
        };
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      style={{ backdropFilter: 'blur(2px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={title || '对话框'}
      tabIndex={-1}
      onClick={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div role="presentation" style={{ width: '100%', maxWidth, maxHeight: '85vh' }}>
      <Card
        variant="elevated"
        padding="none"
        className="w-full overflow-y-auto rounded-[var(--ds-radius-lg)] animate-modal-in"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[var(--ds-border-muted)]">
            <h3 className="text-[15px] font-bold text-[var(--ds-text-primary)]" style={{ fontFamily: 'Georgia, var(--font-display), serif' }}>
              {title}
            </h3>
            <Button variant="ghost" onClick={onClose} aria-label="关闭">
              <CloseIcon />
            </Button>
          </div>
        )}

        {/* Body */}
        <div className="px-[18px] py-[14px]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-[6px] px-[18px] py-[10px] border-t border-[var(--ds-border-muted)]">
            {footer}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/**
 * 便捷方法：标准确认弹窗的组合 Footer
 * 用法: <Modal footer={<ModalFooter onCancel={...} onConfirm={...} confirmLabel="..." />}>
 */
export function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmVariant = 'primary' as const,
  confirmLoading = false,
  confirmDanger = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  confirmLoading?: boolean;
  confirmDanger?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" size="md" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmDanger ? 'danger' : confirmVariant}
        size="md"
        onClick={onConfirm}
        loading={confirmLoading}
      >
        {confirmLabel}
      </Button>
    </>
  );
}

export default Modal;
