'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}

interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * 加载动画组件
 */
export function LoadingSpinner({ size = 'md', color, label = '加载中...' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };
  
  const spinnerSize = sizeMap[size];

  return (
    <div 
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}
    >
      <svg
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          animation: 'spin 1s linear infinite',
          color: color || 'var(--accent-primary, #0969da)',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          style={{
            transformOrigin: 'center',
          }}
        />
      </svg>
      {label && (
        <span style={{
          fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.875rem',
          color: 'var(--text-secondary, #57606a)',
        }}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * 骨架屏加载占位组件
 */
export function LoadingSkeleton({ 
  variant = 'text', 
  width, 
  height, 
  lines = 3 
}: LoadingSkeletonProps) {
  const baseStyles: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary, #f6f8fa)',
    borderRadius: variant === 'circular' ? '50%' : '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const getSizeStyles = (): React.CSSProperties => {
    if (width || height) {
      return {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      };
    }
    
    switch (variant) {
      case 'circular':
        return { width: 40, height: 40 };
      case 'rectangular':
        return { width: '100%', height: 120 };
      case 'text':
      default:
        return { width: '100%', height: 16 };
    }
  };

  const combinedStyles = { ...baseStyles, ...getSizeStyles() };

  if (variant === 'text' && lines > 1) {
    return (
      <div style={{ width: '100%' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...combinedStyles,
              width: i === lines - 1 ? '70%' : '100%',
              marginBottom: i < lines - 1 ? '0.5rem' : 0,
            }}
          />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={combinedStyles} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

/**
 * 页面级加载指示器
 */
export function PageLoading({ message = '页面加载中...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
      }}
    >
      <LoadingSpinner size="lg" />
      <p style={{
        color: 'var(--text-secondary, #57606a)',
        fontSize: '0.9rem',
      }}>
        {message}
      </p>
    </div>
  );
}

/**
 * 卡片加载骨架屏
 */
export function CardSkeleton() {
  return (
    <div style={{
      padding: '1rem',
      border: '1px solid var(--border-color, #d0d7de)',
      borderRadius: '6px',
      backgroundColor: 'var(--bg-primary, #ffffff)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <LoadingSkeleton variant="circular" width={40} height={40} />
        <div style={{ flex: 1 }}>
          <LoadingSkeleton variant="text" width="60%" height={14} />
          <LoadingSkeleton variant="text" width="40%" height={12} lines={1} />
        </div>
      </div>
      <LoadingSkeleton variant="text" lines={2} />
      <LoadingSkeleton variant="rectangular" height={80} />
    </div>
  );
}

/**
 * 列表加载骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 按钮加载状态包装器
 */
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  spinner?: boolean;
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  loadingText,
  spinner = true,
}: ButtonLoadingProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {spinner && <LoadingSpinner size="sm" label="" />}
      {loadingText || '处理中...'}
    </span>
  );
}
