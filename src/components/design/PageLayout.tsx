import React, { Children } from 'react';

// ── 尺寸映射 ──
const CONTAINER = {
  narrow: '440px',
  medium: '800px',
  wide: '1200px',
  extraWide: 'var(--ds-container-max, 1440px)',
  full: 'none',
} as const;

const PANE_WIDTH = {
  sidebar: 'var(--ds-sidebar-width, 260px)',
  rightSidebar: 'var(--ds-sidebar-right-width, 280px)',
  settings: '220px',
} as const;

const SPACING = {
  none: '0',
  normal: 'var(--ds-space-6, 24px)',
} as const;

// ── 类型 ──
type ContainerWidth = 'narrow' | 'medium' | 'wide' | 'extraWide' | 'full';
type Spacing = 'none' | 'normal';
type PaneWidth = keyof typeof PANE_WIDTH;

interface PageLayoutProps {
  containerWidth?: ContainerWidth;
  padding?: Spacing;
  columnGap?: Spacing;
  children: React.ReactNode;
}

interface PageLayoutPaneProps {
  width?: PaneWidth;
  children: React.ReactNode;
}

interface PageLayoutContentProps {
  children: React.ReactNode;
}

// 判断是否为 Pane 元素
function isPane(el: React.ReactNode): el is React.ReactElement<PageLayoutPaneProps> {
  return React.isValidElement(el) && el.type === PageLayoutPane;
}

// ═══════════════════════════════════════════
// 页面容器
// ═══════════════════════════════════════════
export function PageLayout({
  containerWidth = 'wide',
  padding = 'normal',
  columnGap = 'normal',
  children,
}: PageLayoutProps) {
  const arr = Children.toArray(children);

  // 分离两个 Pane（如果有）和 Content
  const panes = arr.filter(isPane) as React.ReactElement<PageLayoutPaneProps>[];
  const content = arr.find(
    (c) => React.isValidElement(c) && c.type === PageLayoutContent
  );

  const hasPane = panes.length > 0;
  const isThreeCol = panes.length >= 2;

  const maxW = CONTAINER[containerWidth];
  const p = SPACING[padding];
  const g = SPACING[columnGap];

  return (
    <div
      className="flex-1 w-full mx-auto min-h-0"
      style={{ maxWidth: maxW === 'none' ? undefined : maxW, padding: hasPane ? undefined : p }}
    >
      {hasPane ? (
        <div className="flex min-h-0" style={{ padding: p, gap: g }}>
          {/* 左栏 */}
          {panes[0]}
          {/* 内容 */}
          {content}
          {/* 右栏（三栏模式） */}
          {isThreeCol && (
            <aside
              className="flex-shrink-0 border-l border-[var(--ds-border-muted)]"
              style={{ width: PANE_WIDTH[panes[1].props.width || 'rightSidebar'] }}
            >
              {panes[1].props.children}
            </aside>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 侧边栏插槽
// ═══════════════════════════════════════════
export function PageLayoutPane({ width = 'sidebar', children }: PageLayoutPaneProps) {
  return (
    <aside className="flex-shrink-0" style={{ width: PANE_WIDTH[width] }}>
      {children}
    </aside>
  );
}

// ═══════════════════════════════════════════
// 主内容插槽
// ═══════════════════════════════════════════
export function PageLayoutContent({ children }: PageLayoutContentProps) {
  return <main className="flex-1 min-w-0">{children}</main>;
}

export type { ContainerWidth, PaneWidth };
