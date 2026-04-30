'use client';

import React, { useEffect } from 'react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['G', 'I'], description: '跳转到 Issues 页面' },
  { keys: ['G', 'P'], description: '跳转到 Pull Requests 页面' },
  { keys: ['G', 'D'], description: '跳转到讨论区' },
  { keys: ['G', 'S'], description: '跳转到搜索页 / 聚焦搜索框' },
  { keys: ['G', 'H'], description: '跳转到用户主页' },
  { keys: ['G', 'A'], description: '跳转到管理面板' },
  { keys: ['G', 'E'], description: '跳转到探索页' },
  { keys: ['?'], description: '显示快捷键帮助' },
  { keys: ['/'], description: '聚焦搜索框' },
  { keys: ['Esc'], description: '关闭弹窗 / 取消操作' },
  { keys: ['←'], description: '返回上一页' },
  { keys: ['→'], description: '前进下一页' },
];

interface KeyboardShortcutsHelpModalProps {
  onClose: () => void;
}

export default function KeyboardShortcutsHelpModal({ onClose }: KeyboardShortcutsHelpModalProps) {
  // 点击背景关闭
  useEffect(() => {
    const handleClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '520px', width: '90%' }}>
        <div className="modal-header">
          <h3>键盘快捷键</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <div className="shortcuts-list">
            {SHORTCUTS.map((item, idx) => (
              <div key={idx} className="shortcut-item">
                <div className="shortcut-keys">
                  {item.keys.map((key, ki) => (
                    <React.Fragment key={ki}>
                      <kbd>{key}</kbd>
                      {ki < item.keys.length - 1 && <span className="key-sep">+</span>}
                    </React.Fragment>
                  ))}
                </div>
                <span className="shortcut-desc">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
        }
        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        kbd {
          display: inline-block;
          padding: 2px 8px;
          font-size: 12px;
          font-family: var(--font-mono, monospace);
          background: var(--color-bg-tertiary, #f6f8fa);
          border: 1px solid var(--color-border-default, #d0d7de);
          border-radius: 6px;
          color: var(--color-fg-default, #24292f);
          min-width: 24px;
          text-align: center;
        }
        .key-sep {
          color: var(--color-fg-muted, #57606a);
          font-size: 12px;
        }
        .shortcut-desc {
          color: var(--color-fg-default, #24292f);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
