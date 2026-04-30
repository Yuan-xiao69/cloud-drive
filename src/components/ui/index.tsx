'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

// ============================================
// Button Component - GitHub Style
// ============================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // GitHub button sizes - based on official GitHub styles
    const sizes = {
      sm: 'px-3 py-1 text-xs font-semibold rounded-md h-7', // 28px height
      md: 'px-4 py-1.5 text-sm font-semibold rounded-md h-8', // 32px height  
      lg: 'px-4 py-2 text-sm font-semibold rounded-md h-10', // 40px height
    };

    // GitHub button variants
    const variants = {
      primary: `
        bg-[#1b873f] text-white border border-[#1b873f]
        hover:bg-[#16692e] hover:border-[#16692e]
        focus:outline-none focus:ring-2 focus:ring-[#1b873f] focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1b873f] disabled:hover:border-[#1b873f]
      `,
      secondary: `
        bg-[#f6f8fa] text-[#1f2328] border border-[#d0d7de]
        hover:bg-[#f3f4f6] hover:border-[#d0d7de]
        focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2
        dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]
        dark:hover:bg-[#30363d] dark:hover:border-[#30363d]
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      danger: `
        bg-[#cf222e] text-white border border-[#cf222e]
        hover:bg-[#a40e26] hover:border-[#a40e26]
        focus:outline-none focus:ring-2 focus:ring-[#cf222e] focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#cf222e] disabled:hover:border-[#cf222e]
      `,
      outline: `
        bg-transparent text-[#0969da] border border-[#d0d7de]
        hover:bg-[#ddf4ff] hover:border-[#0969da]
        focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2
        dark:bg-transparent dark:text-[#4493f8] dark:border-[#30363d]
        dark:hover:bg-[#388bfd26] dark:hover:border-[#4493f8]
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      ghost: `
        bg-transparent text-[#0969da] border border-transparent
        hover:bg-[#f6f8fa] hover:text-[#0550ae]
        focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2
        dark:bg-transparent dark:text-[#4493f8] dark:border-transparent
        dark:hover:bg-[#21262d] dark:hover:text-[#4493f8]
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
    };

    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2',
          'font-semibold transition-colors duration-200',
          'cursor-pointer select-none',
          'border',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>加载中...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// Input Component
// ============================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={clsx(
            'w-full px-3 py-[6px] text-sm',
            'bg-[var(--color-bg-input,#f6f8fa)]',
            'border border-[#d0d7de] rounded-md',
            'text-[#1f2328] placeholder-[#8b949e]',
            'focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]',
            'dark:bg-[#0d1117] dark:text-[#e6edf3] dark:border-[#30363d]',
            'dark:focus:ring-[#4493f8] dark:focus:border-[#4493f8]',
            error && 'border-[#cf222e] focus:ring-[#cf222e] focus:border-[#cf222e]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[#cf222e]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Textarea Component
// ============================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 text-sm',
            'bg-[var(--color-bg-input,#f6f8fa)]',
            'border border-[#d0d7de] rounded-md',
            'text-[#1f2328] placeholder-[#8b949e]',
            'focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]',
            'dark:bg-[#0d1117] dark:text-[#e6edf3] dark:border-[#30363d]',
            'dark:focus:ring-[#4493f8] dark:focus:border-[#4493f8]',
            'resize-y min-h-[100px]',
            error && 'border-[#cf222e] focus:ring-[#cf222e] focus:border-[#cf222e]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[#cf222e]">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================
// Select Component
// ============================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={clsx(
            'w-full px-3 py-[6px] text-sm',
            'bg-white border border-[#d0d7de] rounded-md',
            'text-[#1f2328]',
            'focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]',
            'dark:bg-[#0d1117] dark:text-[#e6edf3] dark:border-[#30363d]',
            'dark:focus:ring-[#4493f8] dark:focus:border-[#4493f8]',
            error && 'border-[#cf222e] focus:ring-[#cf222e] focus:border-[#cf222e]',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-[#cf222e]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ============================================
// Checkbox Component
// ============================================
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className={clsx('inline-flex items-center gap-2 cursor-pointer', className)}>
        <input
          ref={ref}
          type="checkbox"
          className={clsx(
            'w-4 h-4 rounded border-[#d0d7de]',
            'text-[#0969da] focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2',
            'dark:border-[#30363d] dark:focus:ring-[#4493f8]',
            'cursor-pointer'
          )}
          {...props}
        />
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ============================================
// Avatar Component
// ============================================
export interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt = '', size = 'md', fallback, className }: AvatarProps) {
  const sizes = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const [imgError, setImgError] = React.useState(false);
  const initials = fallback ? getInitials(fallback) : '?';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className={clsx(
          'rounded-full object-cover border border-[rgba(0,0,0,0.1)]',
          'dark:border-[rgba(255,255,255,0.1)]',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold',
        'bg-[#eaeef2] text-[#57606a]',
        'dark:bg-[#30363d] dark:text-[#e6edf3]',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

// ============================================
// Badge Component
// ============================================
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#ddf4ff] text-[#0969da] dark:bg-[#388bfd26] dark:text-[#4493f8]',
    primary: 'bg-[#0969da] text-white',
    success: 'bg-[#1a7f37] text-white',
    danger: 'bg-[#cf222e] text-white',
    warning: 'bg-[#9a6700] text-white',
    secondary: 'bg-[#eaeef2] text-[#57606a] dark:bg-[#30363d] dark:text-[#8b949e]',
  };

  const sizes = {
    sm: 'px-[6px] py-[2px] text-xs',
    md: 'px-2 py-0.5 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================
// Card Component
// ============================================
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[#ffffff] border border-[#d0d7de] rounded-lg',
        'dark:bg-[#161b22] dark:border-[#30363d]',
        hover && 'hover:border-[#0969da] cursor-pointer transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Tabs Component
// ============================================
export interface Tab {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={clsx(
        'border-b border-[#d0d7de] dark:border-[#30363d]',
        className
      )}
    >
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'py-3 px-1 text-sm font-medium border-b-2 -mb-px',
              'transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-[#0969da] text-[#0969da]'
                : 'border-transparent text-[#57606a] hover:text-[#1f2328] hover:border-[#d0d7de]',
              'dark:text-[#8b949e] dark:hover:text-[#e6edf3] dark:hover:border-[#30363d]'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'ml-2 px-[6px] py-[2px] text-xs font-medium rounded-full',
                  activeTab === tab.id
                    ? 'bg-[#0969da26] text-[#0969da]'
                    : 'bg-[#eaeef2] text-[#57606a]',
                  'dark:bg-[#30363d] dark:text-[#8b949e]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============================================
// Modal Component
// ============================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={clsx(
            'relative w-full bg-white rounded-lg shadow-xl dark:bg-[#161b22]',
            'border border-[#d0d7de] dark:border-[#30363d]',
            sizes[size]
          )}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#d0d7de] dark:border-[#30363d]">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-[#57606a] hover:text-[#1f2328] dark:text-[#8b949e] dark:hover:text-[#e6edf3)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[#d0d7de] dark:border-[#30363d] flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Toast Component
// ============================================
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const types = {
    success: 'bg-[#dafbe1] text-[#1a7f37] border-[#1a7f37]',
    error: 'bg-[#ffebe9] text-[#cf222e] border-[#cf222e]',
    warning: 'bg-[#fff8c5] text-[#9a6700] border-[#9a6700]',
    info: 'bg-[#ddf4ff] text-[#0969da] border-[#0969da]',
  };

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 px-4 py-3 rounded-lg border shadow-lg',
        'flex items-center gap-3 animate-slide-up',
        types[type]
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-70">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================
// Dropdown Component
// ============================================
export interface DropdownItem {
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={clsx(
            'absolute top-full mt-1 min-w-[180px]',
            'bg-white rounded-lg shadow-lg border',
            'border-[#d0d7de] dark:bg-[#161b22] dark:border-[#30363d]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">
            {items.map((item, index) =>
              item.divider ? (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-[#d0d7de] dark:border-[#30363d]"
                />
              ) : (
                <a
                  key={item.label || index}
                  href={item.href || '#'}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                      setIsOpen(false);
                    }
                  }}
                  className={clsx(
                    'block px-4 py-2 text-sm',
                    'hover:bg-[#f6f8fa] dark:hover:bg-[#30363d]',
                    item.danger ? 'text-[#cf222e]' : 'text-[#1f2328] dark:text-[#e6edf3]'
                  )}
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Skeleton Component
// ============================================
export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-[#eaeef2] dark:bg-[#30363d] rounded',
        className
      )}
    />
  );
}

// ============================================
// Language Badge Component
// ============================================
export interface LanguageBadgeProps {
  language: string;
  className?: string;
}

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Markdown: '#083fa1',
};

export function LanguageBadge({ language, className }: LanguageBadgeProps) {
  const color = languageColors[language] || '#8b949e';

  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs', className)}>
      <span
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[#57606a] dark:text-[#8b949e]">{language}</span>
    </span>
  );
}

// ============================================
// StatCounter Component
// ============================================
export interface StatCounterProps {
  value: string | number;
  label: string;
  className?: string;
}

export function StatCounter({ value, label, className }: StatCounterProps) {
  return (
    <div className={clsx('text-center', className)}>
      <div className="text-2xl font-bold text-[#0969da] dark:text-[#4493f8]">{value}</div>
      <div className="text-xs text-[#57606a] dark:text-[#8b949e]">{label}</div>
    </div>
  );
}

// ============================================
// Note: All components are exported individually above
// ============================================

// PageContainer - 统一页面容器
export { default as PageContainer } from './PageContainer';
export type { PageContainerProps } from './PageContainer';

// ContentGrid - 响应式内容网格布局
export { default as ContentGrid } from './ContentGrid';
export type { ContentGridProps } from './ContentGrid';

// PageHeader - 页面标题头部
export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps, TabItem } from './PageHeader';
