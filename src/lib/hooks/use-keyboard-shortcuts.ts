'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** 快捷键映射表：第二个按键 → 跳转路径 */
const G_KEY_MAP: Record<string, string> = {
  i: '/issues',
  p: '/pulls',
  d: '/discussions',
  s: '/search',
  h: '/settings',
  a: '/admin',
  e: '/explore',
};

/** G 键等待超时（毫秒） */
const G_KEY_TIMEOUT = 1000;

interface UseKeyboardShortcutsOptions {
  /** 是否启用（未登录时部分快捷键跳过） */
  enabled?: boolean;
  /** 自定义搜索框选择器，默认聚焦页面内第一个搜索框 */
  searchInputSelector?: string;
  /** 额外弹窗关闭回调 */
  onEscape?: () => void;
}

/**
 * 全局键盘快捷键 Hook
 * 支持：
 * - G + [key] 组合键跳转
 * - ? 显示帮助
 * - / 聚焦搜索框
 * - Esc 关闭弹窗
 * - ← 后退
 * - → 前进
 */
export function useKeyboardShortcuts({
  enabled = true,
  searchInputSelector,
  onEscape,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  /** 待处理的 G 键超时 ref */
  const gKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 是否已显示过帮助模态框（防止循环触发） */
  const helpShownRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // 输入框/文本域内不触发全局快捷键（除了 / 聚焦搜索、← → 前进后退）
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // / 聚焦搜索（即使在输入框外）
      if (e.key === '/') {
        e.preventDefault();
        if (searchInputSelector) {
          const input = document.querySelector<HTMLInputElement>(searchInputSelector);
          input?.focus();
        } else {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="search"], input[placeholder*="搜索"]');
          const first = inputs[0];
          if (first) {
            first.focus();
          } else {
            router.push('/search');
          }
        }
        return;
      }

      // ← 后退（在输入框外时生效）
      if (e.key === 'ArrowLeft' && !isInput) {
        // 检查是否在模态框中
        const activeElement = document.activeElement;
        const isInModal = activeElement?.closest('.modal, .dropdown, .context-menu, [role="dialog"]');
        if (!isInModal && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
        return;
      }

      // → 前进（在输入框外时生效）
      if (e.key === 'ArrowRight' && !isInput) {
        // 检查是否在模态框中
        const activeElement = document.activeElement;
        const isInModal = activeElement?.closest('.modal, .dropdown, .context-menu, [role="dialog"]');
        if (!isInModal) {
          // 使用 browserHistory API 检查是否能前进
          if ((window as Window & { canGoForward?: () => boolean }).canGoForward?.() || window.history.state?.index !== undefined) {
            e.preventDefault();
            window.history.forward();
          }
        }
        return;
      }

      // 输入框内只响应 Escape
      if (isInput && e.key !== 'Escape') return;

      // Escape：关闭当前弹窗
      if (e.key === 'Escape') {
        // 优先关闭自定义注册的可关闭弹窗
        if (onEscape) {
          onEscape();
          return;
        }
        // 其次尝试关闭常见弹窗
        const overlay = document.querySelector<HTMLElement>('.modal-overlay, [data-modal-open]');
        if (overlay) {
          const closeBtn = overlay.querySelector<HTMLButtonElement>('[aria-label="关闭"], .btn-close, .btn-ghost');
          closeBtn?.click();
        }
        return;
      }

      // ? 显示帮助
      if (e.key === '?') {
        e.preventDefault();
        // 通过自定义事件通知 Header 显示帮助模态框
        window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
        return;
      }

      // G + X 组合键
      if (e.key === 'g' || e.key === 'G') {
        // 清除上一次超时
        if (gKeyTimeoutRef.current) {
          clearTimeout(gKeyTimeoutRef.current);
        }
        gKeyTimeoutRef.current = setTimeout(() => {
          gKeyTimeoutRef.current = null;
        }, G_KEY_TIMEOUT);
        return;
      }

      // 第二个按键：检查是否是 G + key 组合
      if (gKeyTimeoutRef.current) {
        const secondKey = e.key.toLowerCase();
        const path = G_KEY_MAP[secondKey];
        if (path) {
          e.preventDefault();
          // 清除超时
          clearTimeout(gKeyTimeoutRef.current);
          gKeyTimeoutRef.current = null;
          router.push(path);
        }
      }
    },
    [enabled, searchInputSelector, onEscape, router]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimeoutRef.current) {
        clearTimeout(gKeyTimeoutRef.current);
      }
    };
  }, [enabled, handleKeyDown]);
}
