'use client';

import React, { useEffect } from 'react';
import { Modal } from '@/components/design';

interface ShortcutItem { keys: string[]; description: string }

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['G', 'I'], description: '跳转到 Issues 页面' },
  { keys: ['G', 'P'], description: '跳转到合并请求页面' },
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

export default function KeyboardShortcutsHelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Modal isOpen onClose={onClose} title="键盘快捷键" maxWidth="520px">
      <div className="flex flex-col gap-2">
        {SHORTCUTS.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1">
              {item.keys.map((key, ki) => (
                <React.Fragment key={ki}>
                  <kbd className="inline-block px-2 py-0.5 text-xs font-mono bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-default)] text-[var(--ds-text-primary)] min-w-[24px] text-center">{key}</kbd>
                  {ki < item.keys.length - 1 && <span className="text-xs text-[var(--ds-text-secondary)]">+</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="text-[13px] text-[var(--ds-text-primary)]">{item.description}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
