import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ===== 语义化颜色 Token（直连 --ds-* 设计系统） =====
        custom: {
          // 背景
          bg: 'var(--ds-page-bg)',
          'bg-subtle': 'var(--ds-surface-subtle)',
          'bg-inset': 'var(--ds-surface-inset)',
          'bg-overlay': 'var(--ds-surface-overlay)',

          // 文字
          fg: 'var(--ds-text-primary)',
          'fg-muted': 'var(--ds-text-secondary)',
          'fg-subtle': 'var(--ds-text-tertiary)',
          'fg-on-emphasis': 'var(--ds-text-inverse)',

          // 边框
          border: 'var(--ds-border-default)',
          'border-muted': 'var(--ds-border-muted)',
          'border-subtle': 'var(--ds-border-muted)',

          // 强调色
          accent: 'var(--ds-accent-default)',
          'accent-fg': 'var(--ds-accent-default)',
          'accent-fg-hover': 'var(--ds-accent-hover)',
          'accent-subtle': 'var(--ds-accent-subtle)',

          // 成功
          success: 'var(--ds-success-default)',
          'success-emphasis': 'var(--ds-success-default)',
          'success-subtle': 'var(--ds-success-subtle)',

          // 危险
          danger: 'var(--ds-danger-default)',
          'danger-emphasis': 'var(--ds-danger-default)',
          'danger-subtle': 'var(--ds-danger-subtle)',

          // 警告
          attention: 'var(--ds-warning-default)',
          'attention-emphasis': 'var(--ds-warning-default)',
          'attention-subtle': 'var(--ds-warning-subtle)',

          // 中性
          'neutral-emphasis': 'var(--ds-text-secondary)',
          'neutral-muted': 'var(--ds-border-default)',
          'neutral-subtle': 'var(--ds-border-muted)',

          // 品牌绿
          'brand-green': 'var(--ds-brand-default)',
          'brand-green-hover': 'var(--ds-brand-hover)',

          // 链接
          link: 'var(--ds-accent-default)',

          // 输入框
          'input-bg': 'var(--ds-surface-default)',
          'input-border': 'var(--ds-border-default)',
          'input-focus': 'var(--ds-accent-default)',
          'input-focus-shadow': 'var(--ds-accent-subtle)',

          // 按钮
          'btn-bg': 'var(--ds-surface-subtle)',
          'btn-primary-bg': 'var(--ds-accent-default)',
          'btn-primary-border': 'var(--ds-accent-default)',
          'btn-primary-hover-bg': 'var(--ds-accent-hover)',
          'btn-primary-hover-border': 'var(--ds-accent-hover)',

          // 悬停叠加
          'hover-overlay': 'var(--ds-surface-overlay)',
        },
      },
      fontFamily: {
        sans:    ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Georgia', 'Noto Serif SC', 'Source Han Serif SC', 'serif'],
        body:    ['Charter', 'Georgia', 'Noto Serif SC', 'serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'modal-in': 'modalSlideIn 0.2s ease-out',
        'dropdown-in': 'dropdownFadeIn 0.15s ease-out',
        'badge-pop': 'badgePop 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
