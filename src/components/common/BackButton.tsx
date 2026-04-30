'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface BackButtonProps {
  /** 返回目标路径，如果不指定则使用 history.back() */
  href?: string;
  /** 自定义点击处理函数（优先级高于 href） */
  onClick?: () => void;
  /** 图标，可以自定义（默认 ArrowLeft） */
  icon?: LucideIcon;
  /** 按钮文字 */
  label?: string;
  /** 是否显示文字（默认 true） */
  showLabel?: boolean;
  /** 按钮样式变体 */
  variant?: 'default' | 'ghost' | 'outline';
  /** 额外类名 */
  className?: string;
  /** 是否在返回前验证历史记录（防止直接访问时无法返回） */
  safeBack?: boolean;
}

/**
 * BackButton - 统一的返回按钮组件
 * 
 * 支持三种模式：
 * 1. href 模式：跳转到指定路径
 * 2. onClick 模式：执行自定义回调
 * 3. 默认模式：使用 history.back()
 */
export function BackButton({
  href,
  onClick,
  icon: Icon = ArrowLeft,
  label = '返回',
  showLabel = true,
  variant = 'default',
  className,
  safeBack = false,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (href) {
      router.push(href);
      return;
    }

    // 默认行为：安全返回
    if (safeBack && window.history.length <= 1) {
      // 没有历史记录，返回首页
      router.push('/');
      return;
    }

    router.back();
  };

  const variantClasses = {
    default: 'btn btn-secondary',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md p-1.5 transition-colors',
    outline: 'btn btn-secondary border border-gray-300',
  };

  const iconSize = variant === 'ghost' ? 18 : 16;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center gap-1.5',
        variantClasses[variant],
        className
      )}
      aria-label={showLabel ? label : '返回'}
    >
      <Icon size={iconSize} />
      {showLabel && <span className="text-sm">{label}</span>}
    </button>
  );
}

/**
 * 仓库路径返回按钮 - 用于文件浏览时返回上级目录
 */
interface RepoBackButtonProps {
  /** 仓库所有者用户名 */
  username: string;
  /** 仓库名 */
  repoName: string;
  /** 当前路径数组 */
  currentPath: string[];
  /** 设置路径回调 */
  onPathChange: (path: string[]) => void;
  /** 按钮文字 */
  label?: string;
  className?: string;
}

export function RepoBackButton({
  username,
  repoName,
  currentPath,
  onPathChange,
  label = '返回上级',
  className,
}: RepoBackButtonProps) {
  const handleClick = () => {
    if (currentPath.length > 0) {
      onPathChange(currentPath.slice(0, -1));
    }
  };

  // 没有上级目录时隐藏
  if (currentPath.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors',
        className
      )}
      aria-label={label}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
}
